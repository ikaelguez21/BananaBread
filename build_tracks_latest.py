#!/usr/bin/env python3
"""Build src/data/tracks-latest.json (app schema) from fetch_tracks_sap.py output.

Two phases:
1. Enrich: for every course in the fetched track trees, fetch its SmPartOf rows
   (mandatory flag + recommended semester per program/catalog-version). Cached on
   disk per course, so re-runs are free and the run is resumable.
2. Transform: tree structure + Partof data -> the schema consumed by
   trackService.ts buildMergedTrackEntries (faculties/programs/specializations/
   recommendedPlan).

Usage:
  python build_tracks_latest.py --sap src/data/tracks-sap-2024-200.json \
      --output src/data/tracks-latest.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

from fetch_tracks_sap import build_tree, latest_version, odata_results, send_request

PARTOF_CACHE = Path("data/sap-track-cache/partof")


def walk_courses(nodes, acc):
    for node in nodes:
        if node.get("type") == "SM" and node.get("courseId"):
            acc.add(node["courseId"])
        walk_courses(node.get("children", []), acc)
    return acc


def fetch_partof(course_id: str, year: str, semester: str) -> list[dict]:
    # cache is period-specific: Partof rows fetched at an older period lack
    # rows for catalog versions introduced later
    cache_file = PARTOF_CACHE / f"SM{course_id}-{year}-{semester}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    query = (
        f"SmObjectSet(Otjid='SM{course_id}',Peryr='{year}',Perid='{semester}'"
        ",ZzCgOtjid='',ZzPoVersion='',ZzScOtjid='')/Partof?sap-client=700"
    )
    rows = odata_results(send_request(query))
    slim = [
        {
            "scOtjid": r.get("ScOtjid"),
            "versionCg": r.get("CgHighOtjid"),
            "versionText": (r.get("CgHighText") or "").strip(),
            "basketCg": r.get("CgLowOtjid"),
            "basketText": (r.get("CgLowText") or "").strip(),
            "oblig": bool(r.get("Oblig")),
            "minSemester": int(r.get("ZzMinRecommendedPerid") or 0),
            "maxSemester": int(r.get("ZzMaxRecommendedPerid") or 0),
        }
        for r in rows
    ]
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(slim, ensure_ascii=False), encoding="utf-8")
    return slim


def specializations_of(version: dict) -> list[dict]:
    """Top-level groups under a version node; נתיב nodes are specializations.

    If the version has no נתיב children, the version itself is the single
    (unnamed) specialization."""
    structure = version.get("structure", [])
    paths = [n for n in structure if (n.get("name") or "").startswith("נתיב")]
    if not paths:
        return [{"otjid": version["otjid"], "name": None, "children": structure}]
    # groups that sit beside the נתיבים (core mandatory, English, free electives)
    # apply to every specialization
    shared = [n for n in structure if n not in paths]
    return [{**p, "children": [*p.get("children", []), *shared]} for p in paths]


def classify_group(label: str) -> str:
    """mandatory | mandatory_elective | elective, from the group's Hebrew label."""
    has_mandatory = bool(re.search(r"חובה|mandatory", label, re.IGNORECASE))
    has_choice = bool(re.search(r"בחירה|elective", label, re.IGNORECASE))
    pick_from_list = bool(re.search(r"רשימ|אשכול|אפשרות", label))
    if has_mandatory and not has_choice:
        return "mandatory"
    if pick_from_list or (has_mandatory and has_choice):
        return "mandatory_elective"
    return "elective"


def build_requirement_groups(nodes, path=()) -> list[dict]:
    """Flatten CG nodes into groups with their direct course lists.

    Nested group names are joined with ' / ' so the hierarchy stays readable."""
    groups = []
    for node in nodes:
        if node.get("type") != "CG":
            continue
        name_path = (*path, node.get("name") or "")
        direct = [c["courseId"] for c in node.get("children", [])
                  if c.get("type") == "SM" and c.get("courseId")]
        if direct:
            label = " / ".join(p for p in name_path if p)
            groups.append({
                "id": node["otjid"],
                "label": label,
                "kind": classify_group(label),
                "courses": sorted(direct),
            })
        groups.extend(build_requirement_groups(node.get("children", []), name_path))
    return groups


CATALOG_PREREQS: dict[str, list[str]] = {}


def load_catalog_prereqs() -> None:
    catalog = json.loads(Path("src/data/courseCatalog.json").read_text(encoding="utf-8"))
    CATALOG_PREREQS.update({c["id"]: c.get("prereqs", []) for c in catalog})


def prereq_depth(course_id: str, memo: dict, stack: frozenset = frozenset()) -> int:
    """Longest prerequisite chain length; a reasonable default semester when SAP
    has no recommended placement (e.g. the math faculty leaves it empty)."""
    if course_id in memo:
        return memo[course_id]
    if course_id in stack:
        return 1
    prereqs = [p for p in CATALOG_PREREQS.get(course_id, []) if p in CATALOG_PREREQS]
    depth = 1 + max((prereq_depth(p, memo, stack | {course_id}) for p in prereqs), default=0)
    memo[course_id] = depth
    return depth


MANDATORY_LABEL = re.compile(r"חובה|mandatory", re.IGNORECASE)

PDF_PLANS_PATH = Path("data/pdf-plans.json")


def load_pdf_plans() -> list[dict[str, int]]:
    """Catalog-PDF plans as course->semester maps (from parse_catalog_plans.py)."""
    if not PDF_PLANS_PATH.exists():
        return []
    raw = json.loads(PDF_PLANS_PATH.read_text(encoding="utf-8"))
    return [
        {cid: int(sem) for sem, ids in sems.items() for cid in ids}
        for sems in raw.values()
    ]


PDF_PLANS: list[dict[str, int]] = []


def match_pdf_plan(spec_courses: set[str]) -> dict[str, int] | None:
    """Best catalog-PDF plan for this track, by course-set overlap."""
    best, best_score = None, 0
    for plan in PDF_PLANS:
        overlap = len(spec_courses & plan.keys())
        if overlap > best_score:
            best, best_score = plan, overlap
    return best if best_score >= 10 else None


def build_recommended_plan(
    spec_courses: set[str], partof_by_course: dict, version_cg: str, mandatory_ids: set[str]
) -> list[dict]:
    by_semester: dict[int, list[str]] = {}
    depth_memo: dict[str, int] = {}
    pdf_plan = match_pdf_plan(spec_courses)
    for course_id in spec_courses:
        rows = [r for r in partof_by_course.get(course_id, []) if r["versionCg"] == version_cg]
        # a course belongs in the plan if SAP flags it mandatory OR the tree
        # places it in a mandatory-labeled group (SAP flags are inconsistent)
        # OR the official catalog PDF places it in a semester
        in_pdf = bool(pdf_plan and course_id in pdf_plan)
        if not any(r["oblig"] for r in rows) and course_id not in mandatory_ids and not in_pdf:
            continue
        # placement priority: catalog PDF > SAP recommended > prerequisite depth
        semester = pdf_plan.get(course_id, 0) if pdf_plan else 0
        if semester <= 0:
            semester = max((r["minSemester"] for r in rows), default=0)
        if semester <= 0:
            semester = min(8, prereq_depth(course_id, depth_memo))
        by_semester.setdefault(semester, []).append(course_id)
    return [
        {"semester": semester, "courses": [{"courseId": cid} for cid in sorted(ids)]}
        for semester, ids in sorted(by_semester.items())
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sap", default="src/data/tracks-sap-2024-200.json")
    parser.add_argument("--output", default="src/data/tracks-latest.json")
    parser.add_argument("--skip-enrich", action="store_true", help="Use only cached Partof data")
    args = parser.parse_args()

    sap = json.loads(Path(args.sap).read_text(encoding="utf-8"))
    year, semester = str(sap["year"]), str(sap["semester"])

    # keep only the latest catalog version per program
    for track in sap["tracks"]:
        if len(track["versions"]) > 1:
            track["versions"] = [latest_version(
                [{"Stext": v["name"], "Otjid": v["otjid"], **v} for v in track["versions"]]
            )]

    all_courses: set[str] = set()
    for track in sap["tracks"]:
        for version in track["versions"]:
            walk_courses(version["structure"], all_courses)
    print(f"{len(sap['tracks'])} tracks, {len(all_courses)} unique courses", flush=True)

    partof_by_course: dict[str, list[dict]] = {}
    for index, course_id in enumerate(sorted(all_courses), 1):
        if args.skip_enrich and not (PARTOF_CACHE / f"SM{course_id}.json").exists():
            continue
        try:
            partof_by_course[course_id] = fetch_partof(course_id, year, semester)
        except RuntimeError as exc:
            print(f"Warning: Partof failed for {course_id}: {exc}", file=sys.stderr, flush=True)
        if index % 25 == 0:
            print(f"  enriched {index}/{len(all_courses)}", flush=True)

    # ---- upgrade tracks to their true newest catalog version ----
    # SAP's SC tree sometimes serves an outdated version while Partof rows
    # reveal a newer one (e.g. math תלת שנתי: tree says 2022, גרסה 2023 exists).
    # The newer version's tree IS fetchable when rooted at its CG directly.
    def version_year(text: str) -> int:
        years = re.findall(r"(?:19|20)\d{2}", text or "")
        return max(int(y) for y in years) if years else 0

    sc_versions: dict[str, dict[str, str]] = {}
    for rows in partof_by_course.values():
        for r in rows:
            if r.get("scOtjid") and r.get("versionCg"):
                sc_versions.setdefault(r["scOtjid"], {})[r["versionCg"]] = r.get("versionText", "")

    upgraded = 0
    for track in sap["tracks"]:
        current = track["versions"][0]
        candidates = sc_versions.get(track["id"], {})
        if not candidates:
            continue
        best_cg, best_text = max(candidates.items(), key=lambda kv: version_year(kv[1]))
        if version_year(best_text) <= version_year(current["name"]):
            continue
        try:
            structure = build_tree(best_cg, year, semester)
        except RuntimeError:
            continue
        if not structure:
            continue
        track["versions"] = [{"otjid": best_cg, "name": best_text, "structure": structure}]
        upgraded += 1
        print(f"  upgraded {track['name'][:40]}: {current['name'][:30]} -> {best_text[:30]}", flush=True)
    print(f"Upgraded {upgraded} tracks to newer catalog versions", flush=True)

    # enrich courses that appeared in upgraded trees
    new_courses: set[str] = set()
    for track in sap["tracks"]:
        for version in track["versions"]:
            walk_courses(version["structure"], new_courses)
    for course_id in sorted(new_courses - set(partof_by_course)):
        try:
            partof_by_course[course_id] = fetch_partof(course_id, year, semester)
        except RuntimeError as exc:
            print(f"Warning: Partof failed for {course_id}: {exc}", file=sys.stderr, flush=True)

    load_catalog_prereqs()
    PDF_PLANS.extend(load_pdf_plans())

    faculties: dict[str, dict] = {}
    for track in sap["tracks"]:
        faculty = faculties.setdefault(track["facultyId"], {
            "id": track["facultyId"],
            "name": track["facultyName"],
            "programs": [],
        })
        for version in track["versions"]:
            program = {
                "id": track["id"],
                "name": f"{track['name']} — {version['name']}",
                "specializations": [],
            }
            for spec in specializations_of(version):
                spec_courses: set[str] = set()
                walk_courses(spec.get("children", []), spec_courses)
                spec_name = re.sub(r"^נתיב:\s*", "", spec.get("name") or "") or None
                groups = build_requirement_groups(spec.get("children", []))
                mandatory_ids = {
                    cid for g in groups if MANDATORY_LABEL.search(g["label"]) for cid in g["courses"]
                }
                plan = build_recommended_plan(spec_courses, partof_by_course, version["otjid"], mandatory_ids)
                if not plan:
                    continue
                program["specializations"].append({
                    "id": spec["otjid"],
                    "name": spec_name,
                    "recommendedPlan": plan,
                    "requirementGroups": groups,
                })
            if program["specializations"]:
                faculty["programs"].append(program)

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "year": sap["year"],
        "semester": sap["semester"],
        "source": "merged",
        "faculties": [f for f in faculties.values() if f["programs"]],
    }
    Path(args.output).write_text(json.dumps(output, ensure_ascii=False, indent=1), encoding="utf-8")
    total_specs = sum(len(p["specializations"]) for f in output["faculties"] for p in f["programs"])
    print(f"Wrote {len(output['faculties'])} faculties, {total_specs} loadable tracks to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
