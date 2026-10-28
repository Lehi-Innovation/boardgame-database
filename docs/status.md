# Project status

Checked on 2026-10-22 after reconciling the organization cleanup with remote commit `c557ab1`. The earlier local checkout had only 188 records; that baseline is superseded here. Product direction lives in [product-brief.md](product-brief.md).

Reliability milestone checked on 2026-10-28. The catalog/database/UI measurements below retain their earlier baseline date; the new audit measurements are recorded separately.

## Working today

- 4,013 detailed game YAML records; all parse. A rebuilt SQLite query database contains 4,013 games.
- The canonical CSV has 4,242 rows. Python deduplicates these to 4,239 names and reports 4,076 matched entries (96.2%), zero pending, and 163 excluded entries: 122 failed, 24 ambiguous, 11 skipped, and 6 duplicates.
- The web tracker reports 4,225 catalog entries and 3,610 researched. Its matching/deduplication differs from Python; neither count is a factual-quality certification.
- 21 source lists enrich discovery. The local web app includes filtered card/table browsing, evokes, image management, and catalog progress.
- There are 13 image files; the loader recognizes images for 12 games.
- Personal affinity/hotness ratings remain empty.

## Completed reliability milestone

- Repaired the mixed Calico/Campaign Manager research-log structure. All 2,510 source URLs remain in their original order with their original notes and dates. Date-only evidence retains an explicitly documented midnight placeholder; historical slugs were preserved.
- Added a shared writer with safe YAML serialization, duplicate-key detection, full-document validation, a stable file lock, and atomic replacement. It supports both pipeline logging and JSON evidence batches. Failed validation/replacement leaves the original log intact.
- Pipeline entries now record the actual UTC logging time and identify potentially cached text. Logging failures return an unsuccessful exit status while preserving source JSON output.
- Added a read-only audit driven by `schema.yaml` for game IDs, rating ranges, list shapes, category/evokes vocabulary, player counts, explicit CSV mappings, and provenance structure. It supports full, selected-record, log-only, and JSON reports.
- All 26 focused regression tests pass locally, including concurrent process writes, failed replacements, quoted/multiline text, CRLF preservation, pipeline failure reporting, and fixture audits. Provenance and selected-record checks, CLI smoke checks, Node syntax checks, and `git diff --check` pass. Appending to a temporary copy of the actual log preserves all existing bytes and entries.
- GitHub Actions is configured to run the regression suite and provenance audit. A hosted run has not yet been observed. Game records, owner ratings, the CSV, art, and local databases/caches were not changed.

The full audit checked 4,013 game files, the CSV, and 2,510 provenance entries on 2026-10-28. It correctly exits unsuccessfully with **349 existing errors across 255 game files**, plus **20 historical provenance-ID warnings**. These are schema/structure findings, not a factual review of the games:

| Finding | Reported occurrences |
| --- | ---: |
| Numeric IDs rather than matching string filename slugs | 6 |
| Category values outside the schema | 149 |
| Player-count values outside the schema | 107 |
| Evokes values outside the schema | 34 |
| Fields requiring lists that contain another type | 32 |
| Non-string/empty values in string lists, including unquoted titles parsed as mappings | 19 |
| Evokes lists without five distinct values | 2 |

All explicit CSV `yaml_id` targets exist. This does not resolve implicit name matching, duplicate editions, or Python/web coverage totals. Many player-count findings are numeric counts above twelve; review the schema's `12+` convention before changing supported counts or narrowing large-group coverage. Missing optional legacy fields are accepted by the audit.

## Known issues

| Area | Evidence and consequence | Next action |
| --- | --- | --- |
| Research evidence identity | The repaired log contains 20 historical slugs without matching current game filenames. | Review aliases/editions and record deliberate mappings without discarding historical evidence. |
| Record consistency | The audit reports 349 existing schema/structure errors across 255 records, detailed above. | Resolve IDs, list shapes, player-count representation, and vocabulary deliberately, preserving user data and checking all consumers. |
| Catalog identity | CSV row totals, Python name matching, and web slug matching disagree. An empty queue still contains excluded entries. | Establish shared identity rules, check mappings and duplicate editions, then reconcile counts. |
| Importer compatibility | The retained Wikidata prototype emits four columns while the active CSV has seven, including status/mappings. | Make schema-preserving import and pagination reliable before fetching into the active catalog. |
| Images | The checker reports one unmatched Clank! Legacy filename. Web uploads still sanitize names differently from lookups. | Unify upload/lookup naming; retain the dedicated fetch tool's canonical naming. |
| Image provenance | Only one image has a provenance entry, with unknown origin. | Inventory existing assets and record actual evidence using the existing image-use policy. |
| API consistency | The legacy YAML endpoints omit fields available in the SQLite query store. | Align detail payloads and refresh behavior across both paths. |
| Taxonomy copies | Query/UI code still embeds vocabulary separately from the schema. | Derive or validate presentation vocabulary against the schema. |
| Verification/deployment | Focused tests and provenance CI are configured; full catalog validation still fails on known data debt. Uploads have no authentication. | Observe hosted CI results, resolve catalog debt, and establish the public contribution/deployment model. |

## Proposed priorities

1. Reconcile CSV matches/exclusions, historical provenance IDs, and the audited record/schema inconsistencies; an empty queue is not comprehensive coverage.
2. Address image provenance/naming and detail payload consistency.
3. Expand and verify coverage across the intended audiences, then test the experience vocabulary and mobile discovery.
4. Add a small suggestion/correction workflow with review history.

The [earlier backlog](../archive/2026-10-22/development-notes/TODO.md) also contains source-list, expansion/edition, upgrade, designer, and play-tracking ideas. Review these against current records before treating them as missing. The [image acquisition plan](../images/ACQUISITION_PLAN.md) retains its existing decisions and dated outreach context. Outreach still requires an explicit user instruction.

The [marketplace document suite](README.md#marketplace-document-suite-earlier-drafts) is preserved as earlier drafts; its transaction/listing assumptions are not adopted in the current onboarding direction.

## Organization cleanup

Added root entry points, shared assistant guidance, and maintained guides. Consolidated research prompts around the schema while preserving batch-result/status workflows. Archived historical notes, research memories, and the unused BGG sweep/state. Retained the active CSV, Wikidata importer/state, current UI, SQLite builder, image tools, and marketplace drafts.

Added the missing PyYAML dependency, included a lockfile matching the current Node manifest (including sql.js), ignored local caches/bytecode, and completed the schema template's existing min-age/description fields. Active game records, CSV contents, source evidence, and art were preserved from upstream.

Validation covers documentation links, archive preservation, YAML parsing, database rebuild, Node syntax/dependency consistency, and local pages/read-only API routes. The existing data issues above are recorded separately; the entire catalog is not claimed to pass schema validation.
