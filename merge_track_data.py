#!/usr/bin/env python3
"""Merge SAP track data and PDF catalog track data into a single canonical output."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def slugify(text: Optional[str]) -> str:
    if not text:
        return "unknown"
    return "".join(ch if ch.isalnum() else "-" for ch in text.strip().lower()).strip("-") or "unknown"


def merge_field(name: str, sap_value: Any, pdf_value: Any, prefer: str) -> Any:
    if sap_value is None:
        return pdf_value
    if pdf_value is None:
        return sap_value
    if sap_value == pdf_value:
        return sap_value
    return sap_value if prefer == "sap" else pdf_value


def merge_groups(sap_groups: List[Mapping[str, Any]], pdf_groups: List[Mapping[str, Any]]) -> List[Dict[str, Any]]:
    merged: List[Dict[str, Any]] = []
    pdf_index = {group.get("id") or slugify(group.get("label")): group for group in pdf_groups}

    for pdf_group_id, pdf_group in pdf_index.items():
        sap_group = next(
            (
                group
                for group in sap_groups
                if (group.get("id") and group.get("id") == pdf_group.get("id"))
                or slugify(group.get("label")) == pdf_group_id
            ),
            None,
        )

        merged_group: Dict[str, Any] = {
            "id": pdf_group.get("id") or sap_group.get("id") if sap_group else pdf_group_id,
            "label": pdf_group.get("label") or sap_group.get("label"),
            "type": merge_field("type", sap_group.get("type") if sap_group else None, pdf_group.get("type"), "pdf"),
            "minCredits": merge_field("minCredits", sap_group.get("minCredits") if sap_group else None, pdf_group.get("minCredits"), "sap"),
            "maxCredits": merge_field("maxCredits", sap_group.get("maxCredits") if sap_group else None, pdf_group.get("maxCredits"), "sap"),
            "minCourses": merge_field("minCourses", sap_group.get("minCourses") if sap_group else None, pdf_group.get("minCourses"), "sap"),
            "allowsDoubleCounting": merge_field(
                "allowsDoubleCounting",
                sap_group.get("allowsDoubleCounting") if sap_group else None,
                pdf_group.get("allowsDoubleCounting"),
                "pdf",
            ),
            "canOverlapWith": pdf_group.get("canOverlapWith") or (sap_group.get("canOverlapWith") if sap_group else []),
            "cannotOverlapWith": pdf_group.get("cannotOverlapWith") or (sap_group.get("cannotOverlapWith") if sap_group else []),
            "courses": sap_group.get("courses") if sap_group and sap_group.get("courses") else pdf_group.get("courses", []),
            "partial": bool(pdf_group.get("partial") or (sap_group.get("partial") if sap_group else False)),
        }

        if sap_group and pdf_group and sap_group != pdf_group:
            merged_group["conflict"] = True
        merged.append(merged_group)

    sap_only = [group for group in sap_groups if slugify(group.get("id") or group.get("label")) not in pdf_index]
    for group in sap_only:
        merged.append({**group, "partial": True})

    return merged


def merge_plans(sap_plan: List[Mapping[str, Any]], pdf_plan: List[Mapping[str, Any]]) -> List[Dict[str, Any]]:
    if pdf_plan:
        merged = [dict(item, **{"conflict": bool(sap_plan and item not in sap_plan)}) for item in pdf_plan]
    else:
        merged = [dict(item, **{"partial": True}) for item in sap_plan]
    return merged


def merge_specializations(sap_spec: Mapping[str, Any], pdf_spec: Mapping[str, Any]) -> Dict[str, Any]:
    merged: Dict[str, Any] = {
        "id": merge_field("id", sap_spec.get("id"), pdf_spec.get("id"), "pdf"),
        "name": merge_field("name", sap_spec.get("name"), pdf_spec.get("name"), "pdf"),
        "totalRequiredCredits": merge_field(
            "totalRequiredCredits",
            sap_spec.get("totalRequiredCredits"),
            pdf_spec.get("totalRequiredCredits"),
            "sap",
        ),
        "requirementGroups": merge_groups(
            sap_spec.get("requirementGroups", []), pdf_spec.get("requirementGroups", [])
        ),
        "exemptions": pdf_spec.get("exemptions") or sap_spec.get("exemptions") or [],
        "recommendedPlan": merge_plans(
            sap_spec.get("recommendedPlan", []), pdf_spec.get("recommendedPlan", [])
        ),
        "semesterSpecific": bool(sap_spec.get("semesterSpecific") or pdf_spec.get("semesterSpecific")),
        "partial": bool(sap_spec.get("partial") or pdf_spec.get("partial")) or not bool(pdf_spec.get("recommendedPlan") or sap_spec.get("recommendedPlan")),
    }
    if any(sap_spec.get(key) != pdf_spec.get(key) for key in ["id", "name", "totalRequiredCredits"]):
        merged["conflict"] = True
    return merged


def merge_programs(sap_program: Mapping[str, Any], pdf_program: Mapping[str, Any]) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "id": merge_field("id", sap_program.get("id"), pdf_program.get("id"), "pdf"),
        "name": merge_field("name", sap_program.get("name"), pdf_program.get("name"), "pdf"),
        "specializations": [],
    }
    sap_specs = {spec.get("id") or slugify(spec.get("name")): spec for spec in sap_program.get("specializations", [])}
    pdf_specs = {spec.get("id") or slugify(spec.get("name")): spec for spec in pdf_program.get("specializations", [])}

    for spec_id, pdf_spec in pdf_specs.items():
        sap_spec = sap_specs.get(spec_id)
        if sap_spec:
            result["specializations"].append(merge_specializations(sap_spec, pdf_spec))
        else:
            result["specializations"].append({**pdf_spec, "partial": True})

    for spec_id, sap_spec in sap_specs.items():
        if spec_id not in pdf_specs:
            result["specializations"].append({**sap_spec, "partial": True})

    return result


def merge_faculties(sap_faculty: Mapping[str, Any], pdf_faculty: Mapping[str, Any]) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "id": merge_field("id", sap_faculty.get("id"), pdf_faculty.get("id"), "pdf"),
        "name": merge_field("name", sap_faculty.get("name"), pdf_faculty.get("name"), "pdf"),
        "programs": [],
    }
    sap_programs = {prog.get("id") or slugify(prog.get("name")): prog for prog in sap_faculty.get("programs", [])}
    pdf_programs = {prog.get("id") or slugify(prog.get("name")): prog for prog in pdf_faculty.get("programs", [])}

    for program_id, pdf_program in pdf_programs.items():
        sap_program = sap_programs.get(program_id)
        if sap_program:
            result["programs"].append(merge_programs(sap_program, pdf_program))
        else:
            result["programs"].append({**pdf_program, "partial": True})

    for program_id, sap_program in sap_programs.items():
        if program_id not in pdf_programs:
            result["programs"].append({**sap_program, "partial": True})

    return result


def merge_top_level(sap_data: Mapping[str, Any], pdf_data: Mapping[str, Any]) -> Dict[str, Any]:
    sap_faculties = {fac.get("id") or slugify(fac.get("name")): fac for fac in sap_data.get("faculties", [])}
    pdf_faculties = {fac.get("id") or slugify(fac.get("name")): fac for fac in pdf_data.get("faculties", [])}
    merged_faculties: List[Dict[str, Any]] = []

    for faculty_id, pdf_faculty in pdf_faculties.items():
        sap_faculty = sap_faculties.get(faculty_id)
        if sap_faculty:
            merged_faculties.append(merge_faculties(sap_faculty, pdf_faculty))
        else:
            merged_faculties.append({**pdf_faculty, "partial": True})

    for faculty_id, sap_faculty in sap_faculties.items():
        if faculty_id not in pdf_faculties:
            merged_faculties.append({**sap_faculty, "partial": True})

    return {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "year": sap_data.get("year") or pdf_data.get("year"),
        "semester": sap_data.get("semester") or pdf_data.get("semester"),
        "source": "merged",
        "faculties": merged_faculties,
    }


def validate_output(data: Mapping[str, Any]) -> None:
    if data.get("source") not in {"sap", "pdf", "merged"}:
        raise ValueError("Output source must be sap, pdf, or merged")
    if "faculties" not in data or not isinstance(data["faculties"], list):
        raise ValueError("Output must include a faculties array")


def write_json(path: Path, data: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge SAP and PDF track JSON into a single tracks output.")
    parser.add_argument("--sap", required=True, help="SAP JSON input file.")
    parser.add_argument("--pdf", required=True, help="PDF JSON input file.")
    parser.add_argument("--output-dir", default="src/data", help="Directory to write merged output files.")
    parser.add_argument("--year", type=int, help="Optional year for the merged output.")
    parser.add_argument("--semester", type=int, help="Optional semester code for the merged output.")
    parser.add_argument("--validate-only", action="store_true", help="Validate the provided JSON files and exit.")
    args = parser.parse_args()

    sap_path = Path(args.sap)
    pdf_path = Path(args.pdf)
    sap_data = load_json(sap_path)
    pdf_data = load_json(pdf_path)
    validate_output(sap_data)
    validate_output(pdf_data)

    if args.validate_only:
        print("SAP and PDF JSON files are valid.")
        return 0

    merged = merge_top_level(sap_data, pdf_data)

    if args.year is not None:
        merged["year"] = args.year
    if args.semester is not None:
        merged["semester"] = args.semester

    output_dir = Path(args.output_dir)
    output_file = output_dir / f"tracks-{merged['year']}-{merged['semester']}.json"
    latest_file = output_dir / "tracks-latest.json"
    write_json(output_file, merged)
    write_json(latest_file, merged)

    print(f"Wrote merged track data to {output_file} and {latest_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
