#!/usr/bin/env python3
"""Discover SAP OData metadata and extract SAP-backed track data into BananaBread schema."""

from __future__ import annotations

import argparse
import dataclasses
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Mapping, Optional, Sequence

DEFAULT_BASE_URL = "https://portalex.technion.ac.il/sap/opu/odata/sap/Z_CM_EV_CDIR_DATA_SRV"
DEFAULT_CLIENT = "700"

ENTITY_SET_HINTS = {
    "courses": ["course", "courseMaster", "courseList", "courseCatalog"],
    "programs": ["program", "track", "degree", "major", "curriculum"],
    "requirement_groups": ["requirementgroup", "requirement", "rule", "structure"],
    "baskets": ["basket", "cluster", "block", "unit", "sal"],
    "recommended_schedule": ["recommended", "schedule", "plan", "path", "programplan"],
}

COURSE_ID_PATTERN = re.compile(r"\d{8}")


@dataclasses.dataclass
class EntitySetInfo:
    name: str
    entity_type: str


def fetch_url(url: str, username: Optional[str], password: Optional[str]) -> bytes:
    headers = {
        "Accept": "application/json,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "banana-bread-sap-fetcher/1.0",
    }
    request = urllib.request.Request(url, headers=headers)
    opener = urllib.request.build_opener()
    if username and password:
        password_mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
        password_mgr.add_password(None, url, username, password)
        opener = urllib.request.build_opener(urllib.request.HTTPBasicAuthHandler(password_mgr))
    try:
        with opener.open(request, timeout=30) as response:
            return response.read()
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP error fetching {url}: {exc.code} {exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"URL error fetching {url}: {exc.reason}") from exc


def parse_metadata(raw: bytes) -> List[EntitySetInfo]:
    import xml.etree.ElementTree as ET

    root = ET.fromstring(raw)
    entity_sets: List[EntitySetInfo] = []
    for container in root.findall(".//{http://docs.oasis-open.org/odata/ns/edm}EntityContainer"):
        for entity_set in container.findall("{http://docs.oasis-open.org/odata/ns/edm}EntitySet"):
            name = entity_set.attrib.get("Name")
            entity_type = entity_set.attrib.get("EntityType", "")
            if name and entity_type:
                entity_sets.append(EntitySetInfo(name=name, entity_type=entity_type.split(".")[-1]))
    return entity_sets


def choose_entity_sets(entity_sets: Sequence[EntitySetInfo]) -> Dict[str, str]:
    names = [entry.name for entry in entity_sets]
    result: Dict[str, str] = {}

    def find_candidate(hints: Sequence[str]) -> Optional[str]:
        lower_names = [name.lower() for name in names]
        for hint in hints:
            for name in names:
                if hint.lower() in name.lower():
                    return name
        return None

    for slot, hints in ENTITY_SET_HINTS.items():
        chosen = find_candidate(hints)
        if chosen:
            result[slot] = chosen

    return result


def json_from_bytes(raw: bytes) -> Any:
    text = raw.decode("utf-8", errors="replace")
    return json.loads(text)


def extract_value(data: Any) -> List[Mapping[str, Any]]:
    if isinstance(data, dict):
        if "value" in data and isinstance(data["value"], list):
            return data["value"]
        if "d" in data:
            return extract_value(data["d"])
    if isinstance(data, list):
        return data
    return []


def get_first_string(record: Mapping[str, Any], keys: Sequence[str]) -> Optional[str]:
    for key in keys:
        if key in record:
            value = record[key]
            if isinstance(value, str) and value.strip():
                return value.strip()
            if isinstance(value, (int, float)):
                return str(value)
    return None


def parse_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        text = str(value).strip()
        if text.isdigit():
            return int(text)
    return None


def extract_course_ids(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        raw = " ".join(str(item) for item in value)
    else:
        raw = str(value)
    ids = COURSE_ID_PATTERN.findall(raw)
    return [id_.zfill(8) for id_ in ids]


def slugify(value: Optional[str]) -> str:
    if not value:
        return "unknown"
    normalized = re.sub(r"[^א-תa-zA-Z0-9]+", "-", value.strip())
    return normalized.strip("-").lower() or "unknown"


def fetch_entity_records(base_url: str, entity_set: str, client: str, username: Optional[str], password: Optional[str]) -> List[Mapping[str, Any]]:
    params = {
        "$format": "json",
        "$top": "10000",
        "sap-client": client,
    }
    query = urllib.parse.urlencode(params, safe="$,")
    url = f"{base_url}/{urllib.parse.quote(entity_set)}?{query}"
    raw = fetch_url(url, username, password)
    data = json_from_bytes(raw)
    return extract_value(data)


def discover_entity_sets(base_url: str, client: str, username: Optional[str], password: Optional[str]) -> List[EntitySetInfo]:
    url = f"{base_url}/$metadata?sap-client={urllib.parse.quote(client)}"
    raw = fetch_url(url, username, password)
    return parse_metadata(raw)


def gather_faculty_program_specialization(record: Mapping[str, Any]) -> Dict[str, Optional[str]]:
    return {
        "faculty": get_first_string(record, [
            "FacultyNameHE",
            "FacultyName",
            "FacultyHE",
            "Faculty",
            "SchoolName",
            "School",
        ]),
        "program": get_first_string(record, [
            "TrackNameHE",
            "ProgramNameHE",
            "DegreeNameHE",
            "CurriculumNameHE",
            "TrackName",
            "ProgramName",
            "DegreeName",
            "CurriculumName",
            "PlanName",
            "Name",
        ]),
        "specialization": get_first_string(record, [
            "SpecializationNameHE",
            "MajorNameHE",
            "SpecializationHE",
            "Specialization",
            "Major",
            "Field",
            "Stream",
            "TrackType",
        ]),
    }


def build_sap_track_schema(
    fetched_records: Mapping[str, List[Mapping[str, Any]]],
    warnings: List[str],
    year: int,
    semester: int,
) -> Dict[str, Any]:
    faculties: Dict[str, Dict[str, Any]] = {}
    schedule_records = fetched_records.get("recommended_schedule", [])

    for record in schedule_records:
        context = gather_faculty_program_specialization(record)
        faculty_name = context["faculty"] or "לא ידוע"
        program_name = context["program"] or "לא ידוע"
        specialization_name = context["specialization"] or None

        faculty_id = slugify(faculty_name)
        program_id = slugify(program_name)
        specialization_id = slugify(f"{program_name}-{specialization_name}")

        faculty = faculties.setdefault(
            faculty_id,
            {
                "id": faculty_id,
                "name": faculty_name,
                "programs": {},
            },
        )
        program = faculty["programs"].setdefault(
            program_id,
            {
                "id": program_id,
                "name": program_name,
                "specializations": {},
            },
        )
        specialization = program["specializations"].setdefault(
            specialization_id,
            {
                "id": specialization_id,
                "name": specialization_name,
                "totalRequiredCredits": 0,
                "requirementGroups": [],
                "exemptions": [],
                "recommendedPlan": [],
                "semesterSpecific": bool(record.get("Semester") is not None or record.get("Term") is not None),
                "partial": True,
            },
        )

        semester_value = parse_int(get_first_string(record, ["Semester", "Term", "Period", "PlanSemester", "Year"])) or 0
        course_ids = extract_course_ids(
            record.get("CourseID")
            or record.get("CourseCode")
            or record.get("Course")
            or record.get("CourseIDs")
            or record.get("CourseCodes")
            or record.get("Courses")
        )

        if course_ids:
            course_entries = [
                {"courseId": course_id}
                for course_id in course_ids
            ]
            if semester_value or course_entries:
                specialization["recommendedPlan"].append(
                    {
                        "semester": semester_value,
                        "isFixedPlacement": True,
                        "courses": course_entries,
                    }
                )

    faculties_out: List[Dict[str, Any]] = []
    for faculty in faculties.values():
        programs_out: List[Dict[str, Any]] = []
        for program in faculty["programs"].values():
            specializations_out: List[Dict[str, Any]] = []
            for specialization in program["specializations"].values():
                if not specialization["recommendedPlan"]:
                    specialization["partial"] = True
                specializations_out.append(specialization)
            programs_out.append({"id": program["id"], "name": program["name"], "specializations": specializations_out})
        faculties_out.append({"id": faculty["id"], "name": faculty["name"], "programs": programs_out})

    return {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "year": year,
        "semester": semester,
        "source": "sap",
        "faculties": faculties_out,
    }


def build_output(
    base_url: str,
    client: str,
    entity_sets: Sequence[EntitySetInfo],
    chosen_sets: Mapping[str, str],
    fetched_records: Mapping[str, List[Mapping[str, Any]]],
    warnings: List[str],
    year: int,
    semester: int,
) -> Dict[str, Any]:
    output = {
        "metadata": {
            "service_url": base_url,
            "sap_client": client,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "entity_sets": [dataclasses.asdict(entry) for entry in entity_sets],
            "selected_entity_sets": chosen_sets,
            "source": "sap-odata",
            "warnings": warnings,
        },
        "track_data": build_sap_track_schema(fetched_records, warnings, year, semester),
    }
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate SAP-backed BananaBread track JSON from Technion SAP OData.")
    parser.add_argument("--output", default="src/data/tracks-sap-latest.json", help="Output JSON path for the SAP track schema.")
    parser.add_argument("--metadata-output", help="Optional path to write metadata and raw samples.")
    parser.add_argument("--metadata-only", action="store_true", help="Only discover entity sets and print metadata candidates.")
    parser.add_argument("--base-url", help="Override the SAP OData base URL.")
    parser.add_argument("--client", help="Override the SAP client value.")
    parser.add_argument("--year", type=int, default=datetime.utcnow().year, help="Year to record in the output schema.")
    parser.add_argument("--semester", type=int, default=0, help="Semester code to record in the output schema.")
    args = parser.parse_args()

    base_url = (args.base_url or os.environ.get("TECHNION_SAP_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
    client = args.client or os.environ.get("TECHNION_SAP_CLIENT") or DEFAULT_CLIENT
    username = os.environ.get("TECHNION_SAP_USERNAME")
    password = os.environ.get("TECHNION_SAP_PASSWORD")

    warnings: List[str] = []
    try:
        entity_sets = discover_entity_sets(base_url, client, username, password)
    except Exception as exc:
        print(f"ERROR: Failed to discover SAP metadata: {exc}", file=sys.stderr)
        return 1

    chosen_sets = choose_entity_sets(entity_sets)
    print("Discovered entity sets:")
    for entity in entity_sets:
        marker = "*" if entity.name in chosen_sets.values() else " "
        print(f"{marker} {entity.name} ({entity.entity_type})")

    if args.metadata_only:
        print("\nUse --metadata-only to inspect candidates and re-run with actual extraction.")
        return 0

    fetched_records: Dict[str, List[Mapping[str, Any]]] = {}
    for slot, entity_name in chosen_sets.items():
        try:
            print(f"Fetching {slot} from {entity_name}...")
            fetched_records[slot] = fetch_entity_records(base_url, entity_name, client, username, password)
            print(f"  Retrieved {len(fetched_records[slot])} records.")
        except Exception as exc:
            warnings.append(f"Failed to fetch entity set {entity_name}: {exc}")
            fetched_records[slot] = []

    output = build_output(base_url, client, entity_sets, chosen_sets, fetched_records, warnings, args.year, args.semester)

    output_path = args.output
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    if args.metadata_output:
        metadata_path = args.metadata_output
        os.makedirs(os.path.dirname(metadata_path) or ".", exist_ok=True)
        with open(metadata_path, "w", encoding="utf-8") as handle:
            json.dump(output, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        print(f"Wrote metadata wrapper to {metadata_path}.")

    print(f"Wrote SAP track data to {output_path}.")
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(" -", warning)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
