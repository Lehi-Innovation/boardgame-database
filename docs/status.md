# Project status

Checked on 2026-10-22 after reconciling the organization cleanup with remote commit `c557ab1`. The earlier local checkout had only 188 records; that baseline is superseded here. Product direction lives in [product-brief.md](product-brief.md).

## Working today

- 4,013 detailed game YAML records; all parse. A rebuilt SQLite query database contains 4,013 games.
- The canonical CSV has 4,242 rows. Python deduplicates these to 4,239 names and reports 4,076 matched entries (96.2%), zero pending, and 163 excluded entries: 122 failed, 24 ambiguous, 11 skipped, and 6 duplicates.
- The web tracker reports 4,225 catalog entries and 3,610 researched. Its matching/deduplication differs from Python; neither count is a factual-quality certification.
- 21 source lists enrich discovery. The local web app includes filtered card/table browsing, evokes, image management, and catalog progress.
- There are 13 image files; the loader recognizes images for 12 games.
- Personal affinity/hotness ratings remain empty.

## Known issues

| Area | Evidence and consequence | Next action |
| --- | --- | --- |
| Research log | Full YAML parsing fails near line 5031 in a malformed historical section. | Normalize structure without losing evidence before the next shared-log append. |
| Research logging | Appends are not validated/coordinated, and URL strings are interpolated without YAML escaping. | Add safe serialization, validation, and coordinated writes. |
| Record consistency | Six numeric IDs parse as numbers rather than matching string filename slugs; some categories are outside the schema, including Humor, Simulation, and Adventure. | Resolve IDs and vocabulary deliberately, preserving user data and checking all consumers. |
| Catalog identity | CSV row totals, Python name matching, and web slug matching disagree. An empty queue still contains excluded entries. | Establish shared identity rules, check mappings and duplicate editions, then reconcile counts. |
| Importer compatibility | The retained Wikidata prototype emits four columns while the active CSV has seven, including status/mappings. | Make schema-preserving import and pagination reliable before fetching into the active catalog. |
| Images | The checker reports one unmatched Clank! Legacy filename. Web uploads still sanitize names differently from lookups. | Unify upload/lookup naming; retain the dedicated fetch tool's canonical naming. |
| Image provenance | Only one image has a provenance entry, with unknown origin. | Inventory existing assets and record actual evidence using the existing image-use policy. |
| API consistency | The legacy YAML endpoints omit fields available in the SQLite query store. | Align detail payloads and refresh behavior across both paths. |
| Taxonomy copies | Query/UI code still embeds vocabulary separately from the schema. | Derive or validate presentation vocabulary against the schema. |
| Verification/deployment | No automated test suite or CI; uploads have no authentication. | Add focused checks and establish the public contribution/deployment model. |

## Proposed priorities

1. Repair provenance structure/logging and establish reliable record/identity checks.
2. Reconcile CSV matches/exclusions and data vocabulary; an empty queue is not comprehensive coverage.
3. Address image provenance/naming and detail payload consistency.
4. Expand and verify coverage across the intended audiences, then test the experience vocabulary and mobile discovery.
5. Add a small suggestion/correction workflow with review history.

The [earlier backlog](../archive/2026-10-22/development-notes/TODO.md) also contains source-list, expansion/edition, upgrade, designer, and play-tracking ideas. Review these against current records before treating them as missing. The [image acquisition plan](../images/ACQUISITION_PLAN.md) retains its existing decisions and dated outreach context. Outreach still requires an explicit user instruction.

The [marketplace document suite](README.md#marketplace-document-suite-earlier-drafts) is preserved as earlier drafts; its transaction/listing assumptions are not adopted in the current onboarding direction.

## Organization cleanup

Added root entry points, shared assistant guidance, and maintained guides. Consolidated research prompts around the schema while preserving batch-result/status workflows. Archived historical notes, research memories, and the unused BGG sweep/state. Retained the active CSV, Wikidata importer/state, current UI, SQLite builder, image tools, and marketplace drafts.

Added the missing PyYAML dependency, included a lockfile matching the current Node manifest (including sql.js), ignored local caches/bytecode, and completed the schema template's existing min-age/description fields. Active game records, CSV contents, source evidence, and art were preserved from upstream.

Validation covers documentation links, archive preservation, YAML parsing, database rebuild, Node syntax/dependency consistency, and local pages/read-only API routes. The existing data issues above are recorded separately; the entire catalog is not claimed to pass schema validation.
