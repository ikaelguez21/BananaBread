# TRACKS_API.md

## BananaBread Degree Track Data Backbone

This repository now uses a hybrid two-source pipeline to keep degree planning data current with zero manual maintenance.

### Sources

- **SAP OData API** — live course and program metadata from Technion's SAP service.
- **Technion PDF catalogs** — official faculty track structure, baskets, electives, exemptions, and recommended plans.

### Source responsibilities

- **SAP** provides course names, credits, prerequisite hints, and candidate program schedules.
- **PDF catalogs** provide the authoritative degree track structure, basket definitions, elective pools, recommended semester plans, and exemption rules.
- **Merged output** combines both sources into a single canonical JSON schema, with source-specific priorities and conflict flags.

## Current implementations

### `tracks_to_json.py`

This script explores the SAP OData metadata and attempts to produce schema-compliant SAP source output.

- Fetches `$metadata` from `Z_CM_EV_CDIR_DATA_SRV`.
- Chooses candidate entity sets using heuristic hints for courses, programs, baskets, and recommended schedules.
- Fetches selected SAP entity sets, extracts course IDs and schedule entries, and builds a minimal `source: sap` JSON schema.
- Writes SAP output to `src/data/tracks-sap-{YEAR}-{SEMESTER}.json` by default.
- Can also write metadata and raw fetch results via `--metadata-output`.

### `parse_catalog_pdfs.py`

This script discovers and parses Technion PDF catalogs using Claude.

- Discovers PDF links from canonical listing pages:
  - `https://ugportal.technion.ac.il/מידע-לסטודנטים/קטלוג-לימודים/`
  - `https://undergraduate.cs.technion.ac.il/undergraduate-studies/programs/catalogs/`
- Downloads each PDF into `data/catalog-cache`.
- Extracts Hebrew text and tables using `pdfplumber`.
- Sends page chunks to Claude (`claude-sonnet-4-20250514`) with a strict schema prompt.
- Outputs structured catalog data as `source: pdf` JSON.

### `merge_track_data.py`

This script merges SAP and PDF outputs into one canonical merged result.

- SAP wins on course IDs and credit precision.
- PDF wins on basket labels, requirement-group structure, and recommended semester plans.
- Any field that differs between sources is marked with `conflict: true` for manual review.
- Writes both semester-specific output and a `tracks-latest.json` pointer.

## JSON schema

The shared schema used by the SAP source, PDF source, and merged outputs is:

```json
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
                  "maxCredits": null,
                  "minCourses": 0,
                  "allowsDoubleCounting": false,
                  "canOverlapWith": ["groupId"],
                  "cannotOverlapWith": ["groupId"],
                  "courses": ["courseId1", "courseId2"],
                  "partial": false
                }
              ],
              "exemptions": [
                {
                  "exemptCourseId": "string",
                  "ifCompletedCourseId": "string"
                }
              ],
              "recommendedPlan": [
                {
                  "semester": 1,
                  "isFixedPlacement": true,
                  "courses": [
                    {
                      "courseId": "string",
                      "requirementGroupId": "string"
                    }
                  ]
                }
              ],
              "semesterSpecific": true
            }
          ]
        }
      ]
    }
  ]
}
```

## SAP metadata exploration

The SAP service endpoint is:

- `https://portalex.technion.ac.il/sap/opu/odata/sap/Z_CM_EV_CDIR_DATA_SRV` with `sap-client=700`

The repository includes a discovery mode:

```bash
python tracks_to_json.py --metadata-only
```

That mode prints discovered entity sets and selected candidates.

### Notes on current access

From this environment, the SAP metadata endpoint currently resets the TCP connection. That means the service may require:

- valid SAP credentials via `TECHNION_SAP_USERNAME` / `TECHNION_SAP_PASSWORD`
- access from inside the Technion network
- a different SAP client or authorized VPN route

If metadata discovery works, the script will log available entity sets and `recommended_schedule` candidates.

## PDF catalog discovery

The parser currently scans the Technion catalog listing pages for `.pdf` links and downloads each PDF into `data/catalog-cache`.

### Known catalog URL patterns

- `https://ugportal.technion.ac.il/wp-content/uploads/{YEAR}/{MONTH}/{NUM}-{FACULTY}-{YEAR}.pdf`
- `https://ugportal.technion.ac.il/wp-content/uploads/2024/02/23-מדעי-המחשב-תשפִד.pdf`
- `https://ugportal.technion.ac.il/wp-content/uploads/2024/02/03-הנדסת-מכונות-תשפִד.pdf`
- `https://ugportal.technion.ac.il/wp-content/uploads/2024/12/קטלוג-לימודים-תשפה-2024.2025.pdf`

## Automation and publishing

The workflow in `.github/workflows/tracks-to-json.yml` now:

1. sets semester variables automatically from the current date
2. discovers SAP entity metadata
3. generates SAP source JSON
4. parses PDF catalogs via Claude
5. merges SAP and PDF outputs
6. validates the merged JSON
7. publishes `tracks-{YEAR}-{SEMESTER}.json` and `tracks-latest.json` to `gh-pages`

### GitHub secrets

- `TECHNION_SAP_BASE_URL`
- `TECHNION_SAP_CLIENT`
- `TECHNION_SAP_USERNAME`
- `TECHNION_SAP_PASSWORD`
- `ANTHROPIC_API_KEY`

## How to add a new faculty or year

1. Update the listing page URLs in `parse_catalog_pdfs.py` if a new faculty publishes via a new portal.
2. Re-run `npm run parse-catalogs` to download and extract new PDF catalogs.
3. Re-run `npm run merge-tracks` to generate the merged schema.
4. Confirm the output JSON and push; the workflow will publish the new data.

## Known gaps and limitations

- PDF extraction is powered by Claude and may require manual review for complex Hebrew catalog layouts.
- SAP mapping is heuristic-based until the OData metadata is fully inspected and confirmed.
- Any group or plan data that cannot be confidently extracted is marked with `partial: true`.
- If the SAP endpoint is unreachable, the workflow still preserves any successful PDF output and publishes partial results.
