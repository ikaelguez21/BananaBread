# BananaBread — Project Status & Handoff

> Last updated: 2026-07-02 (Claude session). Read this first in a new session — it contains
> everything needed to continue without re-deriving anything.

## What BananaBread is

A visual drag-and-drop degree planner for Technion students (Hebrew, RTL). The differentiator vs
CheeseFork (schedules) and Sogrim (requirement checking) is the planning UX: drag courses between
semesters, live prerequisite validation, track loading.

**User's stated priority (2026-07-02):** get the custom SAP info fetcher to a good state FIRST;
build the website on accurate data after. The PDF-catalog parsing approach is **abandoned**.

## Repo state

- Branch: `vite-redesign` (the real app; `main` is an old pre-Vite version that is what's
  currently deployed on GitHub Pages — deployment is stale and should eventually be switched).
- App: Vite + React 19 + TS. `npm run build` passes. ~1,700 lines total, componentized:
  `src/App.tsx`, `src/components/*`, `src/services/trackService.ts`, `src/utils/prerequisite.ts`.
- App currently runs on static snapshot data: `src/data/courseCatalog.json` (578KB) +
  `src/data/trackCatalog.json` (330KB). The merged-pipeline file `src/data/tracks-latest.json`
  is **empty** (`faculties: []`) — the app's merged-track loader path exists and works but has
  never been fed real data.
- Uncommitted in working tree: `fetch_tracks_sap.py` (NEW — the working fetcher, see below),
  `package.json` (parse-catalogs script arg removed), `parse_catalog_pdfs.py` (gutted to
  text-extraction only; whole PDF approach is dead, candidates for deletion:
  `parse_catalog_pdfs.py`, most of `tracks_to_json.py`).

## THE BREAKTHROUGH: full track data from SAP OData, no auth, no PDFs

Everything the SAP catalog UI ("קטלוג מקצועות מקוון", portalex) shows is fetchable
unauthenticated from `https://portalex.technion.ac.il/sap/opu/odata/sap/Z_CM_EV_CDIR_DATA_SRV`.
Verified live on 2026-07-02 with real data pulled.

### Critical gotchas (each cost real time — do not rediscover)

1. **Everything must go through `$batch` POST.** Technion's F5 WAF blocks parenthesized
   key-access URLs in plain GETs ("Request Rejected" HTML page), and `TreeOnDemandSet`
   **silently returns 0 results** on plain GET while working perfectly inside `$batch`.
   Request format copied from michael-maltsev/technion-sap-info-fetcher (`send_request`):
   multipart body, CRLF line endings, his exact headers, expect HTTP 202, no CSRF token needed.
2. **`SmPartOfSet` cannot be `$filter`ed** (RFC error "line not contained in the table").
   The working call is navigation with the FULL extended SmObject key:
   `SmObjectSet(Otjid='SM01040022',Peryr='2024',Perid='200',ZzCgOtjid='',ZzPoVersion='',ZzScOtjid='')/Partof`
3. Rapid consecutive requests get connections dropped (curl HTTP 000) — throttle + retry.
4. `Accept-Language: he` gives Hebrew names; without it some names come back in English.

### The data model (SAP SLCM object types)

- `SC` = study program (תוכנית לימודים), e.g. SC00001385 = הנדסת אוירונוטיקה וחלל,
  SC00001443 = מתמטיקה-מדעי המחשב. Enumerate: `ScObjectSet?$filter=Peryr eq '2024' and
  Perid eq '200'` (~664 programs; plain GET OK for this one; page with $top/$skip).
- `CG` = course group: version nodes ("B.Sc. גרסת AE 2024 חורף", Category "PO") and
  requirement groups (נתיב, אשכול, מקצועות חובה, בחירה...).
- `SM` = course (Otjid = 'SM' + 8-digit course id).
- **Tree recursion** (via $batch): `TreeOnDemandSet?$filter=ParentOtjid eq '<node>' and
  Peryr eq '<yr>' and Perid eq '<sem>'`
  - ParentOtjid=SC → that year's version CG (0 results = program has no version that year;
    query other years for historical catalog versions, e.g. גרסה 2021).
  - ParentOtjid=CG → child groups AND/OR SM course leaves directly.
  - Node fields: Otjid, ParentOtjid, Otype, Stext, HasChildren, HasModules, Cgcat, Ects, Vpriox.
- **Per-course membership** ("חלק מ" tab): the `/Partof` navigation (gotcha #2) returns one row
  per (program × catalog version) with: ScOtjid/ScText, CgHighOtjid/Text (version),
  CgLowOtjid/Text (basket), **`Oblig`** (mandatory bool), **`ZzMin/MaxRecommendedPerid`**
  (recommended semester, "0002" = semester 2). Infi 2M returned 81 rows.

## The fetcher: `fetch_tracks_sap.py` (repo root, uncommitted)

Written and tested this session. Contains the `$batch` transport (retries, 0.6s throttle),
program enumeration, recursive tree fetch, per-program disk cache (`data/sap-track-cache/`)
so full runs are resumable and re-runs free.

```bash
# single program (tested, works — 44 groups, 307 courses, 82KB JSON):
python3 fetch_tracks_sap.py --year 2024 --semester 200 --program SC00001385 --output /tmp/test.json

# full undergrad run (~1-2h wall time, resumable, no LLM credits needed — user can run it):
python3 fetch_tracks_sap.py --year 2024 --semester 200 --undergrad-only
```

Output shape: `{generatedAt, year, semester, source:"sap", tracks:[{id, name, facultyId,
facultyName, academicLevel, versions:[{otjid, name, structure:[nested nodes: {otjid, type,
name, category, credits, courseId?, children?}]}]}]}`

## Next steps (in order)

1. **Full fetch run** for 2024/200 undergrad (user can run it themselves — no session credits).
   Sanity-check a few known tracks against the catalog UI.
2. **Enrichment pass**: for each course in the fetched trees, call `/Partof` (gotcha #2) to get
   `Oblig` + recommended semester per catalog version; merge into the tree nodes. (Alternative:
   tree node `Vpriox` may already carry ordering — check before adding 5k requests.)
3. **Transform to app schema**: rewrite `merge_track_data.py` (or a new script) to convert the
   fetcher output into `src/data/tracks-latest.json` in the shape `trackService.ts`'s
   `buildMergedTrackEntries` expects (faculties → programs → specializations → requirementGroups
   + recommendedPlan). Validate with `schema_validator.py`.
4. **Course catalog**: replace the static `courseCatalog.json` with data from
   michael-maltsev/technion-sap-info-fetcher's gh-pages JSON (id, name, credits, prereqs) or
   fetch `SmObjectSet` with `$expand=SmPrereq` ourselves.
5. **Cleanup**: delete `parse_catalog_pdfs.py`, `tracks_to_json.py`, `data/catalog-cache/`
   (dead PDF pipeline); update `TRACKS_API.md` + README; commit.
6. **Later (app phase)**: wire real data into the UI, per-basket credit progress, merge
   `vite-redesign` → `main`, fix GitHub Pages to deploy the Vite build (needs `base` in
   `vite.config.ts`), code-split the 969KB bundle.

## Reference repos & tools

- `michael-maltsev/technion-sap-info-fetcher` — course data fetcher; the `$batch` technique
  source (`courses_to_json.py`, `send_request`). Its gh-pages branch publishes course JSON.
- `michael-maltsev/cheese-fork` — schedules; `selfint/degree-planner` — Svelte planner, catalog
  data model in `static/_catalogs` (plaintext custom format, study for modeling ideas only).
- "graphify" = github.com/safishamsi/graphify, pip package `graphifyy` — local codebase→knowledge
  graph CLI the user likes for token-light repo analysis. Not yet installed/run here.

## Constraints

- User budgets session credits (typically "use up to 50%") — keep analysis token-light, prefer
  targeted probes over broad reads, and put long fetch runs in user-runnable scripts.
- Persistent memory also holds this context: `sap-track-data-recipe` and
  `bananabread-project-status` memory files.
