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

from fetch_tracks_sap import latest_version, odata_results, send_request

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
    if paths:
        return paths
    return [{"otjid": version["otjid"], "name": None, "children": structure}]


def build_recommended_plan(spec_courses: set[str], partof_by_course: dict, version_cg: str) -> list[dict]:
    by_semester: dict[int, list[str]] = {}
    for course_id in spec_courses:
        rows = [
            r for r in partof_by_course.get(course_id, [])
            if r["versionCg"] == version_cg and r["oblig"] and r["minSemester"] > 0
        ]
        if not rows:
            continue
        semester = rows[0]["minSemester"]
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
                plan = build_recommended_plan(spec_courses, partof_by_course, version["otjid"])
                if not plan:
                    continue
                program["specializations"].append({
                    "id": spec["otjid"],
                    "name": spec_name,
                    "recommendedPlan": plan,
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
