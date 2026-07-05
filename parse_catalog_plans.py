#!/usr/bin/env python3
"""Extract recommended semester plans from official Technion catalog PDFs.

Some faculties (math, for one) don't fill recommended semesters in SAP, but the
official catalog PDF (ugportal.technion.ac.il) contains the tables. Hebrew text
extracts reversed, but the anchors we need are LTR and reliable:
- track headers carry the catalog program number, e.g. 010089-1-000
- semester headers contain "רטסמס" (reversed סמסטר) + a digit
- course rows start with an 8-digit course id

Drop catalog PDFs into data/catalog-pdfs/ and run:
  python parse_catalog_plans.py
Output: data/pdf-plans.json  {catalogProgram: {semester: [courseIds]}}
build_tracks_latest.py picks it up automatically (matched to SAP tracks by
course-set overlap, and only courses present in the SAP structure are used —
which filters elective-list noise).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber

PDF_DIR = Path("data/catalog-pdfs")
OUTPUT = Path("data/pdf-plans.json")

TRACK_RE = re.compile(r"(\d{6})-1-0{2,3}")
SEM_RE = re.compile(r"רטסמס\s*(\d)|(\d)\s*רטסמס")
COURSE_RE = re.compile(r"\d{8}")


def parse_pdf(path: Path) -> dict[str, dict[int, list[str]]]:
    plans: dict[str, dict[int, list[str]]] = {}
    track, semester = None, None
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            # two-column layout: read right column first (RTL), then left —
            # extracting the whole page merges unrelated lines across columns
            mid = page.width / 2
            halves = [page.crop((mid, 0, page.width, page.height)),
                      page.crop((0, 0, mid, page.height))]
            lines = [line for half in halves for line in (half.extract_text() or "").split("\n")]
            for line in lines:
                track_match = TRACK_RE.search(line)
                if track_match:
                    track, semester = track_match.group(1), None
                    plans.setdefault(track, {})
                    continue
                sem_match = SEM_RE.search(line)
                if sem_match:
                    semester = int(sem_match.group(1) or sem_match.group(2))
                    continue
                # elective-section headers end the semester tables (Hebrew is
                # reversed in extraction: בחירה=הריחב, מקצועות=תועוצקמ, סל=לס)
                if ("הריחב" in line and "תועוצקמ" in line) or line.strip().startswith("לס") or ":'א לס" in line:
                    semester = None
                    continue
                if track and semester:
                    for course_id in COURSE_RE.findall(line):
                        plans[track].setdefault(semester, []).append(course_id)
    return plans


def main() -> int:
    merged: dict[str, dict[int, list[str]]] = {}
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs in {PDF_DIR}", file=sys.stderr)
        return 1
    for path in pdfs:
        plans = parse_pdf(path)
        for track, sems in plans.items():
            # real semester tables hold <=8 courses; larger groups are elective
            # lists that leaked past a semester header — noise, drop them
            clean = {s: sorted(set(ids)) for s, ids in sems.items() if len(set(ids)) <= 9}
            if sum(len(v) for v in clean.values()) >= 5:
                merged[track] = {str(s): v for s, v in clean.items()}
        print(f"{path.name}: {len(plans)} tracks")
    OUTPUT.write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {len(merged)} track plans to {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
