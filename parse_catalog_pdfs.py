#!/usr/bin/env python3
"""Download Technion catalog PDFs and extract raw text locally."""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

import pdfplumber
import requests
from bs4 import BeautifulSoup

PDF_LISTING_URLS = [
    "https://ugportal.technion.ac.il/מידע-לסטודנטים/קטלוג-לימודים/",
    "https://undergraduate.cs.technion.ac.il/undergraduate-studies/programs/catalogs/",
]

DEFAULT_REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )
}

CACHE_TEXT_EXTENSION = '.txt'


def text_file_for_pdf(pdf_path: Path) -> Path:
    return pdf_path.with_suffix(CACHE_TEXT_EXTENSION)


def normalize_text(text: str) -> str:
    return text.replace('\r\n', '\n').strip() + '\n'


def build_text_record(pdf_path: Path, pages: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    for page in pages:
        lines.append(f"=== Page {page['page_number']} ===")
        page_text = page.get('text') or ''
        lines.append(page_text)
        if page.get('tables'):
            lines.append('--- TABLES ---')
            lines.extend(page['tables'])
        lines.append('')
    return normalize_text('\n'.join(lines))


def fetch_url_text(url: str, timeout: int = 30) -> str:
    response = requests.get(url, headers=DEFAULT_REQUEST_HEADERS, timeout=timeout)
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
    return list(dict.fromkeys(links))


def download_pdf(url: str, dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    file_name = Path(url.split("?")[0]).name
    if not file_name.lower().endswith(".pdf"):
        file_name = f"{slugify(file_name)}.pdf"
    dest_path = dest_dir / file_name
    if dest_path.exists() and dest_path.stat().st_size > 0:
        return dest_path
    response = requests.get(url, headers=DEFAULT_REQUEST_HEADERS, stream=True, timeout=60)
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


def save_text_cache(pdf_path: Path, pages: List[Dict[str, Any]]) -> Path:
    text_path = text_file_for_pdf(pdf_path)
    text_content = build_text_record(pdf_path, pages)
    text_path.parent.mkdir(parents=True, exist_ok=True)
    with text_path.open("w", encoding="utf-8") as handle:
        handle.write(text_content)
    return text_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Download Technion catalog PDFs and extract raw text locally.")
    parser.add_argument("--cache-dir", default="data/catalog-cache", help="Local cache directory for downloaded PDFs and extracted text.")
    parser.add_argument("--listing-urls", nargs="*", default=PDF_LISTING_URLS, help="Catalog listing pages to scan for PDF links.")
    parser.add_argument("--max-pdfs", type=int, default=20, help="Maximum number of PDFs to download and extract.")
    parser.add_argument("--dry-run", action="store_true", help="Only discover PDF links and print summary without writing extracted text files.")
    args = parser.parse_args()

    listing_urls = args.listing_urls
    cache_dir = Path(args.cache_dir)

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
            if args.dry_run:
                print(f"Discovered {len(pages)} pages in {pdf_path.name}.")
                continue

            text_path = save_text_cache(pdf_path, pages)
            print(f"Extracted text to {text_path}")
        except Exception as exc:
            print(f"Warning: failed to process {pdf_url}: {exc}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
