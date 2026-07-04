#!/usr/bin/env python3
"""Refresh src/data/courseCatalog.json from technion-sap-info-fetcher published data.

Downloads the course JSON that michael-maltsev's fetcher publishes to GitHub Pages
(one file per semester, only courses offered that semester), merges several recent
semesters (newest wins), converts to the app's Course shape, and unions with the
existing catalog so courses not offered recently still resolve by name.

Usage:
  python update_course_catalog.py                 # auto: current + 3 previous semesters
  python update_course_catalog.py --semesters 2025_201 2025_200 2024_201
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import requests

BASE_URL = "https://michael-maltsev.github.io/technion-sap-info-fetcher"
CATALOG_PATH = Path("src/data/courseCatalog.json")
COURSE_ID_RE = re.compile(r"\d{8}")


def previous_semesters(year: int, session: int, count: int) -> list[str]:
    """Walk back through regular sessions: 201 -> 200 -> prev year 202 -> 201 ..."""
    order = [200, 201, 202]
    result = []
    y, i = year, order.index(session)
    for _ in range(count):
        result.append(f"{y}_{order[i]}")
        i -= 1
        if i < 0:
            i, y = len(order) - 1, y - 1
    return result


def hebrew_prereqs_to_expr(raw: str) -> str:
    return (raw or "").replace("ו-", " && ").replace(" או ", " || ").strip()


def to_course(general: dict) -> dict | None:
    course_id = (general.get("מספר מקצוע") or "").strip()
    name = (general.get("שם מקצוע") or "").strip()
    if not course_id or not name:
        return None
    prereq_string = hebrew_prereqs_to_expr(general.get("מקצועות קדם") or "")
    try:
        credits = float(general.get("נקודות") or 0)
    except ValueError:
        credits = 0.0
    return {
        "id": course_id,
        "name": name,
        "faculty": (general.get("פקולטה") or "").strip() or "לא ידוע",
        "credits": credits,
        "prereqString": prereq_string,
        "prereqs": sorted(set(COURSE_ID_RE.findall(prereq_string))),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--semesters", nargs="*", default=None,
                        help="Semester file keys like 2025_201 (newest first)")
    parser.add_argument("--count", type=int, default=4, help="How many semesters back to merge")
    args = parser.parse_args()

    if args.semesters:
        semesters = args.semesters
    else:
        from fetch_tracks_sap import detect_current_period
        year, session = detect_current_period()
        semesters = previous_semesters(int(year), int(session), args.count)
        print(f"Auto-detected current period {year}/{session}; merging {semesters}")

    merged: dict[str, dict] = {}
    for semester in reversed(semesters):  # oldest first, newest overwrites
        url = f"{BASE_URL}/courses_{semester}.json"
        response = requests.get(url, timeout=120)
        if response.status_code != 200:
            print(f"Warning: {url} -> {response.status_code}, skipping", file=sys.stderr)
            continue
        count = 0
        for entry in response.json():
            course = to_course(entry.get("general", {}))
            if course:
                merged[course["id"]] = course
                count += 1
        print(f"{semester}: {count} courses")

    if not merged:
        print("No data downloaded; catalog left untouched", file=sys.stderr)
        return 1

    existing = json.loads(CATALOG_PATH.read_text(encoding="utf-8")) if CATALOG_PATH.exists() else []
    kept = [c for c in existing if c["id"] not in merged]
    catalog = sorted([*merged.values(), *kept], key=lambda c: c["id"])
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {len(catalog)} courses ({len(merged)} refreshed, {len(kept)} kept from old catalog)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
