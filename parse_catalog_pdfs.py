#!/usr/bin/env python3
"""Download Technion catalog PDFs and parse degree track structure via Claude."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence

import pdfplumber
import requests
from bs4 import BeautifulSoup

PDF_LISTING_URLS = [
    "https://ugportal.technion.ac.il/מידע-לסטודנטים/קטלוג-לימודים/",
    "https://undergraduate.cs.technion.ac.il/undergraduate-studies/programs/catalogs/",
]

ANTHROPIC_API_URL = os.environ.get("ANTHROPIC_API_URL", "https://api.anthropic.com/v1/complete")
ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY"

SCHEMA_PROMPT = json.dumps(
    {
        "generatedAt": "ISO timestamp",
        "year": 2024,
        "semester": 200,
        "source": "sap | pdf | merged",
        "faculties": [
            {
                "id": "string",
                "name": "string (Hebrew)",
                "programs": [
                    {
                        "id": "string",
                        "name": "string (Hebrew)",
                        "specializations": [
                            {
                                "id": "string",
                                "name": "string or null (Hebrew)",
                                "totalRequiredCredits": 0,
                                "requirementGroups": [
                                    {
                                        "id": "string",
                                        "label": "string (Hebrew)",
                                        "type": "mandatory | basket | faculty_elective | free_elective | exemption",
                                        "minCredits": 0,
                                        "maxCredits": None,
                                        "minCourses": 0,
                                        "allowsDoubleCounting": False,
                                        "canOverlapWith": ["groupId"],
                                        "cannotOverlapWith": ["groupId"],
                                        "courses": ["courseId1", "courseId2"],
                                        "partial": False,
                                    }
                                ],
                                "exemptions": [
                                    {
                                        "exemptCourseId": "string",
                                        "ifCompletedCourseId": "string",
                                    }
                                ],
                                "recommendedPlan": [
                                    {
                                        "semester": 1,
                                        "isFixedPlacement": True,
                                        "courses": [
                                            {
                                                "courseId": "string",
                                                "requirementGroupId": "string",
                                            }
                                        ],
                                    }
                                ],
                                "semesterSpecific": True,
                            }
                        ],
                    }
                ],
            }
        ],
    },
    ensure_ascii=False,
    indent=2,
)

SYSTEM_INSTRUCTIONS = (
    "You are a specialized extractor for Hebrew academic degree catalogs. "
    "Return only valid JSON following the schema provided. Do not invent or guess fields; omit keys when data is absent. "
    "If a field is uncertain, set `partial` to true at the requirement group or specialization level."
)


def build_prompt(pdf_name: str, page_range: str, page_text: str) -> str:
    prompt_lines = [
        SYSTEM_INSTRUCTIONS,
        "",
        f"PDF source: {pdf_name}",
        f"Page range: {page_range}",
        "",
        "Extract ALL degree track requirements into structured JSON. For each track found, extract:",
        "- Track name and specialization (exact Hebrew)",
        "- All mandatory courses (course numbers + names)",
        "- All course baskets (סלים) with label, list of courses, and minimum credits/count required",
        "- Faculty elective pools with label and course list",
        "- Free elective credit requirements",
        "- Recommended semester plan (which courses in which semester)",
        "- Any overlap/double-counting rules between baskets",
        "- Any exemption rules",
        "",
        "Use the schema exactly as shown below. Return ONLY valid JSON with no explanatory text.",
        SCHEMA_PROMPT,
        "",
        "Here is the extracted page text:",
        page_text,
    ]
    return "\n".join(prompt_lines)


def fetch_url_text(url: str, timeout: int = 30) -> str:
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    return response.text


def extract_pdf_links(html: str, base_url: str) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: List[str] = []
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"].strip()
        if href.lower().endswith(".pdf"):
            if href.startswith("http"):
                links.append(href)
            else:
                links.append(requests.compat.urljoin(base_url, href))
    return sorted(set(links))


def download_pdf(url: str, dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_name = Path(url.split("?")[0]).name
    if not file_name.lower().endswith(".pdf"):
        file_name = f"{slugify(file_name)}.pdf"
    dest_path = dest_dir / file_name
    if dest_path.exists() and dest_path.stat().st_size > 0:
        return dest_path
    response = requests.get(url, stream=True, timeout=60)
    response.raise_for_status()
    with open(dest_path, "wb") as handle:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                handle.write(chunk)
    return dest_path


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "file"


def extract_pdf_pages(pdf_path: Path) -> List[Dict[str, Any]]:
    pages: List[Dict[str, Any]] = []
    with pdfplumber.open(pdf_path) as document:
        for index, page in enumerate(document.pages, start=1):
            text = page.extract_text() or ""
            tables = []
            try:
                for table in page.extract_tables():
                    rows = [" | ".join(cell or "" for cell in row) for row in table]
                    tables.append("\n".join(rows))
            except Exception:
                tables = []
            pages.append({
                "page_number": index,
                "text": text,
                "tables": tables,
            })
    return pages


def build_page_chunks(pages: List[Dict[str, Any]], max_chars: int = 12000) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    current_text = []
    current_pages = []
    current_size = 0

    for page in pages:
        page_text = page["text"] or ""
        table_text = "\n\n".join(page["tables"] or [])
        block = f"\n\n=== Page {page['page_number']} ===\n\n{page_text}\n{table_text}"
        if current_size + len(block) > max_chars and current_pages:
            chunks.append({
                "pages": current_pages,
                "content": "\n".join(current_text),
            })
            current_text = []
            current_pages = []
            current_size = 0
        current_text.append(block)
        current_pages.append(page["page_number"])
        current_size += len(block)

    if current_pages:
        chunks.append({"pages": current_pages, "content": "\n".join(current_text)})
    return chunks


def call_claude(prompt: str, max_tokens: int = 4000) -> str:
    api_key = os.environ.get(ANTHROPIC_API_KEY_ENV)
    if not api_key:
        raise RuntimeError(f"Missing required environment variable {ANTHROPIC_API_KEY_ENV}")
    payload = {
        "model": "claude-sonnet-4-20250514",
        "prompt": f"\n\nHuman: {prompt}\n\nAssistant:",
        "max_tokens_to_sample": max_tokens,
        "temperature": 0.0,
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
    }
    response = requests.post(ANTHROPIC_API_URL, json=payload, headers=headers, timeout=120)
    response.raise_for_status()
    data = response.json()
    return data.get("completion") or data.get("output") or ""


def normalize_json_text(text: str) -> str:
    text = re.sub(r"```json|```", "", text)
    return text.strip()


def parse_json_from_response(text: str) -> Any:
    cleaned = normalize_json_text(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        for regex in [r"\{.*\}", r"\[.*\]"]:
            match = re.search(regex, cleaned, re.S)
            if match:
                return json.loads(match.group(0))
        raise


def validate_schema(data: Mapping[str, Any]) -> None:
    if not isinstance(data, dict):
        raise ValueError("Parsed output is not a JSON object")
    if data.get("source") != "pdf":
        raise ValueError("Parsed output must have source \"pdf\"")
    if "faculties" not in data or not isinstance(data["faculties"], list):
        raise ValueError("Parsed output must contain faculties array")


def merge_parsed_outputs(outputs: List[Mapping[str, Any]]) -> Dict[str, Any]:
    merged: Dict[str, Any] = {
        "generatedAt": outputs[0]["generatedAt"],
        "year": outputs[0].get("year"),
        "semester": outputs[0].get("semester"),
        "source": "pdf",
        "faculties": [],
    }
    faculties_by_id: Dict[str, Dict[str, Any]] = {}

    for output in outputs:
        for faculty in output.get("faculties", []):
            fid = faculty.get("id") or slugify(faculty.get("name", "unknown"))
            existing = faculties_by_id.get(fid)
            if existing is None:
                faculties_by_id[fid] = {**faculty, "programs": list(faculty.get("programs", []))}
                continue
            existing_programs = {prog.get("id") or slugify(prog.get("name", "unknown")): prog for prog in existing.get("programs", [])}
            for program in faculty.get("programs", []):
                pid = program.get("id") or slugify(program.get("name", "unknown"))
                if pid in existing_programs:
                    existing_prog = existing_programs[pid]
                    existing_prog["specializations"] = (existing_prog.get("specializations", []) + program.get("specializations", []))
                else:
                    existing["programs"].append(program)

    merged["faculties"] = list(faculties_by_id.values())
    return merged


def main() -> int:
    parser = argparse.ArgumentParser(description="Download Technion catalog PDFs and parse track structure into JSON via Claude.")
    parser.add_argument("--output", default="src/data/tracks-pdf-latest.json", help="Output JSON file for the parsed PDF data.")
    parser.add_argument("--cache-dir", default="data/catalog-cache", help="Local cache directory for downloaded PDFs.")
    parser.add_argument("--listing-urls", nargs="*", default=PDF_LISTING_URLS, help="Catalog listing pages to scan for PDF links.")
    parser.add_argument("--max-pdfs", type=int, default=20, help="Maximum number of PDFs to download and parse.")
    parser.add_argument("--dry-run", action="store_true", help="Only discover PDF links and do not call Claude.")
    args = parser.parse_args()

    listing_urls = args.listing_urls
    cache_dir = Path(args.cache_dir)
    results: List[Mapping[str, Any]] = []

    pdf_urls: List[str] = []
    for url in listing_urls:
        try:
            html = fetch_url_text(url)
            pdf_urls.extend(extract_pdf_links(html, url))
        except Exception as exc:
            print(f"Warning: failed to fetch listing page {url}: {exc}", file=sys.stderr)

    pdf_urls = sorted(set(pdf_urls))[: args.max_pdfs]
    if not pdf_urls:
        print("No PDF URLs found. Ensure the listing page is reachable and contains .pdf links.")
        return 1

    for pdf_url in pdf_urls:
        try:
            pdf_path = download_pdf(pdf_url, cache_dir)
            print(f"Downloaded {pdf_url} -> {pdf_path}")
            pages = extract_pdf_pages(pdf_path)
            chunks = build_page_chunks(pages)

            if args.dry_run:
                print(f"Discovered {len(pages)} pages in {pdf_path.name} and built {len(chunks)} chunks.")
                continue

            for chunk in chunks:
                page_range = f"{chunk['pages'][0]}-{chunk['pages'][-1]}"
                prompt = build_prompt(pdf_path.name, page_range, chunk["content"])
                completion = call_claude(prompt)
                parsed = parse_json_from_response(completion)
                if not isinstance(parsed, dict):
                    raise ValueError("Parsed Claude response is not a JSON object")
                parsed["source"] = "pdf"
                try:
                    validate_schema(parsed)
                except ValueError as exc:
                    raise ValueError(f"Validation failed for {pdf_path.name} pages {page_range}: {exc}") from exc
                results.append(parsed)
                time.sleep(1)
        except Exception as exc:
            print(f"Warning: failed to parse {pdf_url}: {exc}", file=sys.stderr)

    if not results:
        print("No valid PDF extraction results were produced.")
        return 1

    merged = merge_parsed_outputs(results)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(merged, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"Wrote merged PDF track data to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
