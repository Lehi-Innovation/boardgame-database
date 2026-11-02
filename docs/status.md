# Project status

Checked on 2026-11-02 after the roadmap implementation and representative source review begun on 2026-11-01. Product direction remains in [product-brief.md](product-brief.md). This checkpoint supersedes the October catalog/UI counts; historical audit measurements are retained below.

## Working today

- **4,017 detailed game records**, all structurally valid, and 4,017 games in the rebuilt SQLite cache.
- **4,245 CSV rows → 4,244 catalog entries** under one edition-aware resolver used by Python and the web tracker: **3,954 matched (93.2%), 125 pending, and 165 excluded** (120 failed, 24 ambiguous, 11 skipped, 10 duplicates).
- **43 explicit mappings still have conflicting publication years** and need edition/source review. **117 detailed records lack catalog matches** under the conservative rules. A mapping is not factual verification.
- **21 source lists** enrich discovery; nominations are not a universal quality score.
- **12 active covers** after pixel inspection of all 13 original assets found two wrong games. Those two are quarantined unchanged. Codenames and Lost Ruins of Arnak now use source-documented CGE press assets; their predecessors are archived. Pandemic Legacy now has a correct Z-Man blue-box replacement, and Rebellion a larger Fantasy Flight image; those two use the documented fair-use category under project policy, without a permission grant. Eight active covers still lack source/use-basis evidence. All original bytes and hashes were preserved; exact printings remain unresolved.
- **2,563 research entries**. All original 2,510 entries remain byte-for-byte intact, followed by 53 newly consulted-source entries. Nineteen historical IDs have deliberate, explained aliases; the missing original 878 Vikings record was researched and added using its historical slug.
- Personal affinity/hotness remain empty. Owner ratings and play history were preserved across all 123 changed existing records. The structural migration preserved exact player counts; subsequent source reviews corrected specific counts for Codenames, the original Adel Verpflichtet edition, and the previously misidentified Das Bohnenspiel.

The more conservative matched total is lower than October's optimistic name-only count. Different editions, conflicting years and exclusions are now visible instead of silently counted as covered.

## Roadmap progress

| Original priority | Implemented and verified | Remaining work |
| --- | --- | --- |
| 1. Reconcile CSV identity, provenance IDs and schema inconsistencies | Shared CLI/web identity rules; reviewed correction of ten demonstrably wrong mappings; zero structural errors; nineteen historical aliases and the missing original 878 Vikings record | Review the 125 pending entries, 43 conflicting explicit years, 165 exclusions, and 117 unmatched detailed records; distinguish duplicate records from distinct editions |
| 2. Images and detail consistency | Unified naming/upload/lookup, complete payloads and cache refresh; full pixel review; two wrong-game assets quarantined; four documented publisher replacements; decoded-file validation and provenance history | Source the remaining eight active covers and correct the missing original Clank! cover; exact printing and reuse scope require evidence |
| 3. Audience coverage, experience vocabulary and mobile discovery | Added original 878 Vikings, Clank! Legacy, Mū Tōrere and Nine Men’s Morris; checked selected facts for seven games spanning intended audiences; sourced age corrections for Outfoxed!/Root and traditional-chess metadata clarification; schema-driven experience shortcuts and separate supported/preferred counts; phone/tablet/desktop checks | Real-user vocabulary/fit testing and broader factual review; the representative sample is not a catalog-wide certification |
| 4. Small suggestion/correction workflow with review history | Local form, pending inbox, versioned accept/reject/publish/reopen decisions, explanations, immutable earlier review events and stale-review protection | Public accounts, authenticated reviewer roles, hosting, retention and backup operations remain open product/deployment decisions |

The roadmap remains active. [Catalog maintenance](catalog-maintenance.md), [discovery review](discovery-review.md), and [contribution operations](contributions.md) explain the completed behavior and its limits.

## Completed implementation checkpoint

- The reviewed migration repaired six numeric IDs, 32 null publisher lists, nineteen unquoted alternate-title lists, fifteen category lists and 36 evokes lists. It preserves unrelated text and protected user fields. Clear synonyms were normalized; useful missing categories were added deliberately to the schema. Exact positive player counts above twelve are accepted without replacing them with `12+`. See [repair decisions](catalog-maintenance.md).
- Shared identity preserves source IDs, publication years, editions, exclusions, notes and CSV row references. Only identical identity/status/mapping rows collapse. Uncertain matches stay pending. Mapping updates refuse ambiguous same-name rows. [Reviewed identity corrections](../sources/catalog-identity-decisions.yaml) retain previous targets and explanations; nine returned to pending instead of pointing to a different game/edition.
- The Wikidata importer preserves all seven CSV columns, writes atomically, deduplicates replayed pages, preserves different-year editions, and determines completion from raw binding counts. The existing import state was preserved; no live import was run. `--restart` safely replays old pagination if chosen later.
- SQLite builds fail rather than publishing partial results, then replace the cache atomically on success. Full record JSON preserves relationships, art credits, upgrades and play history. Shared payload adaptation keeps YAML/query detail equal after rebuilding. The running server detects database replacement; image lookups reflect uploads immediately.
- All query/UI category and rating vocabularies derive from `schema.yaml`. Three current-vocabulary browsing shortcuts use ordinary intentions; they are testable filters, not validated recommendation scores. Exact supported player counts are separate from provisional suggested counts.
- Uploads and the dedicated fetch tool use decoded image formats and common canonical naming, preserve punctuation/Unicode, recognize old underscore names, retain provenance history and restore prior bytes if recording fails. The fetcher fully loads JPEG/PNG/WebP with Pillow and records exact image URLs/hashes; the extension comes from decoded bytes, and undecodable or unsupported files are rejected. Quarantine blocks recorded and inferred filename lookup in both consumers. The local server binds to loopback and rejects cross-origin writes.
- Suggestions never directly modify the catalog or owner ratings. Accepted means ready for sourced curation; published records the operator's separately applied change. The original-work inbox lives in ignored `.local/contributions.sqlite` and needs backups; it is not a rebuildable cache.

## Subsequent identity review on 2026-11-02

- Publisher histories distinguish publication dates from award dates: Cascadia (2021), original Codenames (2015), Bomb Busters (2024), and Challengers! (2022). Corrected the affected records/rows and explained duplicate catalog entries. A legacy Codenames rules URL now redirects to the 2025 relaunch; the log explicitly distinguishes indexed old text from that current page.
- Original Adel Verpflichtet (1990 F.X. Schmid, 2–5) and Hoity Toity (2004 Uberplay, up to six) are now explicit separate editions. Original-game and later-edition specifications are not silently combined; an extra 2004 CSV row and the duplicate original-title alias are documented.
- Corrected Das Bohnenspiel from a false Bohnanza description to the traditional two-player mancala documented by the Digital Ludeme Project and independent teaching rules. Bohnanza remains the separate Rosenberg/AMIGO 1997 card game. Kept traditional publication/age metadata unknown and experience estimates provisional.
- Corrected Moon Colony Bloodbath's CSV date to 2025 using the independent play review and publisher identity/specifications. No date was inferred from dynamic sidebars on older publisher news pages.
- Publisher factsheets also resolve Dominion’s first-edition year (2008), DroPolter’s release (2023), original Tzolk’in (Q4 2012), and Isle of Skye (2015). The short Isle of Skye award-year alias is an explained duplicate of the full-title row. Corrected supported age/duration/art-credit fields where those sources establish them.
- Reopened two inappropriate traditional-game failures: added Mū Tōrere and Nine Men’s Morris from research/museum/rules evidence. Manufactured packaging is not required by the product brief. Publication dates and minimum ages remain unknown; rule variants and provisional durations/experience ratings are explicit.
- Further source review resolves Alchemists (2014), Qwirkle (2006), Tajuto (2019), Lacuna (2023), Monopoly (1935), Wilmot’s Warehouse (2024), Horseless Carriage (2023) and Long Shot: The Dice Game (2022). Corrected Alchemists’ false designer credit to Matúš Kotry, age to 12+, and its unsupported code-wheel claim. Long Shot evidence distinguishes 2021 crowdfunding from 2022 finished-copy availability.
- Pixel inspection found that the purported 2019 Clank! cover shows its sequel, while the purported Pandemic Legacy cover shows original Clank! and miniatures. Both are quarantined unchanged in [the image archive](../archive/2026-11-02/README.md). The earlier filename-only coverage assumption was wrong. [Visual findings](../images/identity-review.yaml) document every original asset.
- Codenames and Arnak replacements were downloaded from exact box-image links on CGE press factsheets, inspected, hashed and recorded with the publisher’s stated web-promotion terms. No replacement provenance was assigned to different original bytes. Browser checks also verify that shared search text renders literally rather than as injected markup.

## Verification

- **52 regression tests passed**, including isolated real HTTP/SQLite/upload and contribution workflows, import replay/pagination, failed cache/provenance replacement, image-fetch rollback/format validation, quarantine enforcement, concurrent evidence writes, title quoting, edition identity, exact large-group counts, and automatic cache refresh.
- Full read-only audit: **4,017 game files, one CSV, 2,563 provenance entries; 0 errors, 0 warnings**. This checks structure and references, not every fact, opinion or permission claim.
- Atomic rebuild: **4,017 games**, no skipped records. Complete payload equality was also checked for all 4,017 real records. Shared CLI/web catalog results, schema presentation, and refreshed uploads were exercised in temporary fixtures.
- Real Chromium checked all four pages at **390, 768 and 1280 pixels**, plus experience filtering and correction submission: no page errors or horizontal overflow after fixing the phone navigation layout. These are technical checks, not human usability findings.
- Node syntax, maintained-document links, protected-data/original-evidence/art preservation and `git diff --check` were checked locally.
- Existing hosted [Data tooling checks run 40710183576](https://github.com/Lehi-Innovation/boardgame-database/actions/runs/40710183576) passed for baseline commit `73559e5`. CI now also installs web dependencies, runs isolated HTTP tests, audits the full catalog and rebuilds SQLite. The expanded workflow has not yet had its own hosted run. Automatic approval review rejected the push of local draft branch `codex/roadmap-catalog-reliability`; explicit destination approval is pending. Local implementation checkpoint commit: `d8f217b`; source/image corrections are saved in `a12e8f4`, with traditional-game additions in a subsequent local checkpoint.

## Remaining issues and next work

1. **Edition/source review.** Work through pending identities, year conflicts, exclusions and unmatched records with independent evidence. Do not increase coverage by restoring invalid mappings. Some aliases refer to duplicate records; others distinguish genuinely different editions. Source and edition facts must decide.
2. **Image evidence.** Eight active assets remain unverified for source/use basis; one has a dimension below 500 pixels. Two original wrong-game assets remain archived, with a correct Pandemic replacement now acquired. Acquire documented matching replacements under the existing [image workflow](../images/README.md), preserving original evidence. The four replacements have source/use evidence, without implying unrestricted reuse. Outreach requires explicit owner instruction.
3. **Experience testing.** Try the [representative scenarios](discovery-review.md) with people and compare expectations after play. The current `feel` scale still mixes modes and intensity; its redesign remains a proposal, not a silently adopted scoring system.
4. **Public service.** The implemented contribution inbox is a local pilot. Choose hosting, authenticated roles, abuse controls, retention and backups before public operation. No public deployment was performed.
5. **Expanded hosted checks.** Push the local draft branch and open a draft PR after the requested explicit GitHub destination approval. Automatic review rejected the initial push. The prior hosted pass does not validate these unpushed changes.

## Historical reliability milestone: 2026-10-28

The earlier milestone repaired mixed Calico/Campaign Manager log structure without losing source URLs/order/notes/dates, added coordinated atomic evidence writes, and introduced schema-driven read-only audits with 26 focused tests. Date-only evidence retains an explicitly documented midnight placeholder. The old audit found **349 errors across 255 of 4,013 records**, plus twenty historical-ID warnings:

| Earlier finding | Occurrences |
| --- | ---: |
| Numeric record IDs | 6 |
| Categories outside the schema | 149 |
| Player counts outside the old enumeration | 107 |
| Evokes outside the schema | 34 |
| Non-list fields requiring lists | 32 |
| Non-string list items, including colon titles parsed as mappings | 19 |
| Evokes without five distinct values | 2 |

Those structural findings are resolved by the current checkpoint. This does not retroactively verify the games or their sources.

## Organization and scope

The root entry points and maintained guides supersede archived notes. The [earlier backlog](../archive/2026-10-22/development-notes/TODO.md) contains additional source-list, expansion/edition, upgrade, designer and play-tracking ideas; compare them with current records before treating them as missing. The [image acquisition plan](../images/ACQUISITION_PLAN.md) retains dated outreach context, not permission to contact publishers.

The [marketplace document suite](README.md#marketplace-document-suite-earlier-drafts) remains earlier drafts; its transaction/listing assumptions are not adopted. Public accounts, personalized recommendations, branding and hosting remain open in the product brief.
