#!/usr/bin/env python3
"""Validate BananaBread track JSON against the expected SAP/PDF/merged schema."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional

VALID_SOURCES = {"sap", "pdf", "merged"}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def assert_type(value: Any, expected: type, path: str) -> None:
    if not isinstance(value, expected):
        raise ValueError(f"Expected {path} to be {expected.__name__}, got {type(value).__name__}")


def validate_course(course: Mapping[str, Any], path: str) -> None:
    assert_type(course, dict, path)
    if "courseId" not in course:
        raise ValueError(f"Missing required field {path}.courseId")
    assert_type(course["courseId"], str, f"{path}.courseId")
    if "requirementGroupId" in course:
        assert_type(course["requirementGroupId"], str, f"{path}.requirementGroupId")


def validate_recommended_plan(plan: Any, path: str) -> None:
    assert_type(plan, list, path)
    for index, item in enumerate(plan):
        item_path = f"{path}[{index}]"
        assert_type(item, dict, item_path)
        if "semester" not in item:
            raise ValueError(f"Missing required field {item_path}.semester")
        assert_type(item["semester"], int, f"{item_path}.semester")
        if "isFixedPlacement" not in item:
            raise ValueError(f"Missing required field {item_path}.isFixedPlacement")
        assert_type(item["isFixedPlacement"], bool, f"{item_path}.isFixedPlacement")
        if "courses" not in item:
            raise ValueError(f"Missing required field {item_path}.courses")
        validate_list(item["courses"], validate_course, f"{item_path}.courses")


def validate_requirement_group(group: Mapping[str, Any], path: str) -> None:
    assert_type(group, dict, path)
    required = ["id", "label", "type", "minCredits", "minCourses", "allowsDoubleCounting", "courses", "partial"]
    for field in required:
        if field not in group:
            raise ValueError(f"Missing required field {path}.{field}")
    assert_type(group["id"], str, f"{path}.id")
    assert_type(group["label"], str, f"{path}.label")
    assert_type(group["type"], str, f"{path}.type")
    assert group["type"] in {"mandatory", "basket", "faculty_elective", "free_elective", "exemption"}, f"Invalid {path}.type: {group['type']}"
    assert_type(group["minCredits"], int, f"{path}.minCredits")
    if group["maxCredits"] is not None:
        assert_type(group["maxCredits"], int, f"{path}.maxCredits")
    assert_type(group["minCourses"], int, f"{path}.minCourses")
    assert_type(group["allowsDoubleCounting"], bool, f"{path}.allowsDoubleCounting")
    validate_list(group["canOverlapWith"], lambda v, p: assert_type(v, str, p), f"{path}.canOverlapWith")
    validate_list(group["cannotOverlapWith"], lambda v, p: assert_type(v, str, p), f"{path}.cannotOverlapWith")
    validate_list(group["courses"], lambda v, p: assert_type(v, str, p), f"{path}.courses")
    assert_type(group["partial"], bool, f"{path}.partial")


def validate_exemption(exemption: Mapping[str, Any], path: str) -> None:
    assert_type(exemption, dict, path)
    for field in ["exemptCourseId", "ifCompletedCourseId"]:
        if field not in exemption:
            raise ValueError(f"Missing required field {path}.{field}")
        assert_type(exemption[field], str, f"{path}.{field}")


def validate_specialization(spec: Mapping[str, Any], path: str) -> None:
    assert_type(spec, dict, path)
    for field in ["id", "name", "totalRequiredCredits", "requirementGroups", "exemptions", "recommendedPlan", "semesterSpecific"]:
        if field not in spec:
            raise ValueError(f"Missing required field {path}.{field}")
    assert_type(spec["id"], str, f"{path}.id")
    if spec["name"] is not None:
        assert_type(spec["name"], str, f"{path}.name")
    assert_type(spec["totalRequiredCredits"], int, f"{path}.totalRequiredCredits")
    validate_list(spec["requirementGroups"], validate_requirement_group, f"{path}.requirementGroups")
    validate_list(spec["exemptions"], validate_exemption, f"{path}.exemptions")
    validate_recommended_plan(spec["recommendedPlan"], f"{path}.recommendedPlan")
    assert_type(spec["semesterSpecific"], bool, f"{path}.semesterSpecific")


def validate_program(program: Mapping[str, Any], path: str) -> None:
    assert_type(program, dict, path)
    for field in ["id", "name", "specializations"]:
        if field not in program:
            raise ValueError(f"Missing required field {path}.{field}")
    assert_type(program["id"], str, f"{path}.id")
    assert_type(program["name"], str, f"{path}.name")
    validate_list(program["specializations"], validate_specialization, f"{path}.specializations")


def validate_faculty(faculty: Mapping[str, Any], path: str) -> None:
    assert_type(faculty, dict, path)
    for field in ["id", "name", "programs"]:
        if field not in faculty:
            raise ValueError(f"Missing required field {path}.{field}")
    assert_type(faculty["id"], str, f"{path}.id")
    assert_type(faculty["name"], str, f"{path}.name")
    validate_list(faculty["programs"], validate_program, f"{path}.programs")


def validate_list(value: Any, validator: Any, path: str) -> None:
    assert_type(value, list, path)
    for index, element in enumerate(value):
        validator(element, f"{path}[{index}]")


def validate_track_data(track_data: Mapping[str, Any], path: str) -> None:
    assert_type(track_data, dict, path)
    for field in ["generatedAt", "year", "semester", "source", "faculties"]:
        if field not in track_data:
            raise ValueError(f"Missing required field {path}.{field}")
    assert_type(track_data["generatedAt"], str, f"{path}.generatedAt")
    assert_type(track_data["year"], int, f"{path}.year")
    assert_type(track_data["semester"], int, f"{path}.semester")
    assert_type(track_data["source"], str, f"{path}.source")
    if track_data["source"] not in VALID_SOURCES:
        raise ValueError(f"Invalid {path}.source: {track_data['source']}")
    validate_list(track_data["faculties"], validate_faculty, f"{path}.faculties")


def normalize_root(data: Any) -> Mapping[str, Any]:
    if not isinstance(data, dict):
        raise ValueError("Root JSON object must be a dictionary")
    if "track_data" in data and isinstance(data["track_data"], dict):
        return data["track_data"]
    return data


def validate_file(path: Path) -> None:
    data = load_json(path)
    track_data = normalize_root(data)
    validate_track_data(track_data, "root")


def find_json_files(paths: Iterable[str]) -> List[Path]:
    files: List[Path] = []
    for path in paths:
        candidate = Path(path)
        if candidate.is_dir():
            files.extend(sorted(candidate.glob("*.json")))
        else:
            files.append(candidate)
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate BananaBread track JSON files against the expected schema.")
    parser.add_argument("files", nargs="*", default=["src/data/tracks-latest.json"], help="JSON files or directories to validate.")
    args = parser.parse_args()

    files = find_json_files(args.files)
    if not files:
        print("No files found to validate.")
        return 1

    errors: List[str] = []
    for file_path in files:
        try:
            validate_file(file_path)
            print(f"OK: {file_path}")
        except Exception as exc:
            errors.append(f"{file_path}: {exc}")

    if errors:
        print("\nValidation errors:")
        for error in errors:
            print(f"- {error}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
