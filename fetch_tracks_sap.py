#!/usr/bin/env python3
"""Fetch Technion degree track structure from SAP OData (Z_CM_EV_CDIR_DATA_SRV).

All requests go through $batch POST — Technion's F5 WAF blocks parenthesized
key-access URLs in plain GETs, and TreeOnDemandSet silently returns empty
outside a batch. Request format follows michael-maltsev/technion-sap-info-fetcher.

Usage:
  python fetch_tracks_sap.py --year 2024 --semester 200 --output src/data/tracks-sap-latest.json
  python fetch_tracks_sap.py --year 2024 --semester 200 --program SC00001385  # single program (testing)
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import requests

BATCH_URL = "https://portalex.technion.ac.il/sap/opu/odata/sap/Z_CM_EV_CDIR_DATA_SRV/$batch?sap-client=700"
BOUNDARY = "batch_1d12-afbf-e3c7"
REQUEST_DELAY_SECONDS = 0.6
REQUEST_TIMEOUT = 60
MAX_RETRIES = 4

HEADERS = {
    "MaxDataServiceVersion": "2.0",
    "Accept-Language": "he",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like"
        " Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Content-Type": f"multipart/mixed;boundary={BOUNDARY}",
    "Accept": "multipart/mixed",
    "sap-contextid-accept": "header",
    "sap-cancel-on-close": "true",
    "X-Requested-With": "X",
    "DataServiceVersion": "2.0",
    "Origin": "https://portalex.technion.ac.il",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Referer": "https://portalex.technion.ac.il/ovv/",
}

session = requests.Session()


def send_request(query: str) -> dict:
    body = f"""
--{BOUNDARY}
Content-Type: application/http
Content-Transfer-Encoding: binary

GET {query} HTTP/1.1
sap-cancel-on-close: true
X-Requested-With: X
sap-contextid-accept: header
Accept: application/json
Accept-Language: he
DataServiceVersion: 2.0
MaxDataServiceVersion: 2.0


--{BOUNDARY}--
""".replace("\n", "\r\n")

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.post(BATCH_URL, headers=HEADERS, data=body, timeout=REQUEST_TIMEOUT)
            if response.status_code != 202:
                raise RuntimeError(f"Bad status {response.status_code} for {query}: {response.text[:200]}")
            chunks = response.text.replace("\r\n", "\n").strip().split("\n\n")
            payload = json.loads(chunks[2].split("\n", 1)[0])
            if "error" in payload:
                raise RuntimeError(f"OData error for {query}: {json.dumps(payload['error'])[:300]}")
            time.sleep(REQUEST_DELAY_SECONDS)
            return payload
        except (requests.RequestException, RuntimeError, json.JSONDecodeError, IndexError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(5 * attempt)
    raise RuntimeError(f"Failed after {MAX_RETRIES} attempts: {query}") from last_error


def odata_results(payload: dict) -> list:
    return payload.get("d", {}).get("results", [])


def fetch_programs(year: str, semester: str) -> list[dict]:
    """All study programs (SC objects) for the catalog year, paged."""
    programs: list[dict] = []
    skip = 0
    page = 500
    while True:
        params = {
            "$filter": f"Peryr eq '{year}' and Perid eq '{semester}'",
            "$select": "Otjid,Name,OrgId,OrgText,ZzAcademicLevel,ZzAcademicLevelText",
            "$top": str(page),
            "$skip": str(skip),
            "sap-client": "700",
        }
        batch = odata_results(send_request(f"ScObjectSet?{urllib.parse.urlencode(params)}"))
        programs.extend(batch)
        if len(batch) < page:
            return programs
        skip += page


def fetch_tree_children(parent_otjid: str, year: str, semester: str) -> list[dict]:
    params = {
        "$filter": f"ParentOtjid eq '{parent_otjid}' and Peryr eq '{year}' and Perid eq '{semester}'",
        "sap-client": "700",
    }
    return odata_results(send_request(f"TreeOnDemandSet?{urllib.parse.urlencode(params)}"))


def build_tree(parent_otjid: str, year: str, semester: str, depth: int = 0, max_depth: int = 8) -> list[dict]:
    """Recursively expand the track structure tree below a node."""
    if depth >= max_depth:
        return []
    nodes = []
    for raw in fetch_tree_children(parent_otjid, year, semester):
        node = {
            "otjid": raw.get("Otjid"),
            "type": raw.get("Otype"),
            "name": (raw.get("Stext") or "").strip(),
            "category": (raw.get("Cgcat") or "").strip() or None,
            "credits": (raw.get("Ects") or "").strip() or None,
        }
        if raw.get("Otype") == "SM":
            node["courseId"] = raw["Otjid"].removeprefix("SM")
        elif raw.get("HasChildren"):
            node["children"] = build_tree(raw["Otjid"], year, semester, depth + 1, max_depth)
        nodes.append(node)
    return nodes


def fetch_program_track(program: dict, year: str, semester: str) -> dict | None:
    """Version node + full structure tree for one SC program; None if no version this year."""
    versions = fetch_tree_children(program["Otjid"], year, semester)
    if not versions:
        return None
    return {
        "id": program["Otjid"],
        "name": (program.get("Name") or "").strip(),
        "facultyId": program.get("OrgId"),
        "facultyName": (program.get("OrgText") or "").strip(),
        "academicLevel": (program.get("ZzAcademicLevelText") or "").strip(),
        "versions": [
            {
                "otjid": v["Otjid"],
                "name": (v.get("Stext") or "").strip(),
                "structure": build_tree(v["Otjid"], year, semester),
            }
            for v in versions
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", required=True)
    parser.add_argument("--semester", default="200")
    parser.add_argument("--output", default=None)
    parser.add_argument("--program", default=None, help="Fetch a single SC otjid (testing)")
    parser.add_argument("--undergrad-only", action="store_true")
    parser.add_argument("--cache-dir", default="data/sap-track-cache")
    args = parser.parse_args()

    cache_dir = Path(args.cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)

    print(f"Fetching study programs for {args.year}/{args.semester}...", flush=True)
    programs = fetch_programs(args.year, args.semester)
    print(f"Found {len(programs)} programs", flush=True)

    if args.program:
        programs = [p for p in programs if p["Otjid"] == args.program]
    if args.undergrad_only:
        programs = [p for p in programs if p.get("ZzAcademicLevel") == "0001"]

    tracks = []
    for index, program in enumerate(programs, 1):
        cache_file = cache_dir / f"{program['Otjid']}-{args.year}-{args.semester}.json"
        if cache_file.exists():
            cached = json.loads(cache_file.read_text(encoding="utf-8"))
            if cached:
                tracks.append(cached)
            continue
        try:
            track = fetch_program_track(program, args.year, args.semester)
        except RuntimeError as exc:
            print(f"Warning: {program['Otjid']} failed: {exc}", file=sys.stderr, flush=True)
            continue
        cache_file.write_text(json.dumps(track or {}, ensure_ascii=False, indent=1), encoding="utf-8")
        if track:
            tracks.append(track)
        print(f"[{index}/{len(programs)}] {program['Otjid']} {program.get('Name', '')[:50]}"
              f" -> {'ok' if track else 'no version this year'}", flush=True)

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "year": int(args.year),
        "semester": int(args.semester),
        "source": "sap",
        "tracks": tracks,
    }
    out_path = Path(args.output or f"src/data/tracks-sap-{args.year}-{args.semester}.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {len(tracks)} tracks to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
