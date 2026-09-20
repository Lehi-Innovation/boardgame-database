# Discovery Summary

> Produced from a full read of this repository (June 2026) prior to drafting the
> marketplace document suite in `docs/`. Every claim below is grounded in a file
> in this repo; inferences are marked [INFERRED].

## Tech Stack

| Layer | Technology | Location |
|-------|-----------|----------|
| Canonical data | YAML, one file per game (~4,016 files) | `games/*.yaml` |
| Catalog universe | CSV (4,245 rows) | `master_list.csv` |
| Schema / vocabulary | YAML | `schema.yaml` |
| Derived query store | SQLite (gitignored, rebuilt on demand) | `games.db` via `scripts/build_db.py` |
| Web backend | Node.js, Express 4, sql.js (read-only), js-yaml, multer, sharp, cors | `web/server.js`, `web/lib/` |
| Web frontend | Static HTML/CSS/JS, no build step | `web/public/` |
| Tooling | Python 3 (requests, PyYAML, Trafilatura/BS4) | `scripts/*.py` |
| Automation | Claude Code skills & agents for game research | `.claude/skills/`, `.claude/agents/` |

There is **no** authentication, no user model, no payment integration, no
hosted deployment configuration, and no test suite.

## Implemented Entities (with fields)

### Game (`games/{slug}.yaml` → SQLite `games` + 11 child tables)
- Identity: `id` (slug, = filename), `name`, `alternate_names[]`, `year` (edition-specific)
- Hierarchy: `game_family`, `edition`, `base_game`, `expansions[]`, `compatible_with[]`
- Objective ratings (0–4): `length`, `rules_complexity`, `strategic_depth`, `feel`, `value`
- Personal ratings (0–4, null until rated): `affinity`, `hotness`
- Taxonomy: `categories[]` (mechanics / styles / themes / designer-tags / publisher-tags), `evokes[]` (top 5 of 18 feelings)
- Players: `possible_counts[]` (box), `true_counts[]` (community-best)
- Credits: `designer[]`, `publisher[]`, `artist[]`
- Logistics: `playtime_minutes`, `min_playtime`, `max_playtime`, `min_age`
- Content: `description` (block literal)
- Nested: `upgrades[]` (`name`, `year`, `type`, `publisher`, `notes`), `plays_tracked` (`total_plays`, `configs[]`)

### MasterListEntry (`master_list.csv`)
`bgg_id`, `name`, `year`, `type` (almost all `boardgame`), `status`
(empty | `skip` | `failed` | `ambiguous` | `duplicate`), `notes`, `yaml_id`
(explicit link to a game file when name/slug matching fails).

### SourceList (`sources/lists/*.yaml`)
`source`, `url`, `fetched`, `games[]` (`id`, `name`, `year`). 21 files (awards,
reviewer lists, articles). Enrichment/prioritization only — not the universe.

### Publisher (`publishers.yaml`)
`press_url`, `parent`, `contact`, `notes`, `status`
(`not_contacted` | `contacted` | `approved` | `declined`). A lightweight outreach CRM.

### ImageProvenance (`images/sources.yaml`)
`file`, `source_url`, `publisher`, `license`, `date`, `resolution`, `notes`.
images/README.md requires images licensed **"for commercial use"**.

### ResearchLogEntry (`sources/research-log.yaml`)
`timestamp`, `game_id`, `url`, `description`. 2,510 entries — an audit trail of
every URL consulted during research.

## Implemented Workflows

1. **Game research pipeline** — `/add-game` skill & `game-researcher` agent:
   web search → `scripts/game_pipeline.py` (fetch, strip HTML, cache in
   `pipeline_cache.db`) → write YAML → append provenance log. BGG is hard-blocked.
2. **Master-list lifecycle** — Wikidata SPARQL scraper populates the CSV;
   `scripts/update_master_status.py` handles status updates, batch results, and
   `--backfill` fuzzy name→yaml matching; `scripts/progress.py` reports the queue.
3. **Catalog query API** — Express + SQLite: filtered/sorted/paginated game
   queries, filter-option discovery, evoke counts (see PRD-03 doc).
4. **Image acquisition** — publisher press-kit workflow with licensing
   provenance; drag-and-drop upload with sharp validation; naming convention
   `{Name} ({Year}).{ext}` associates images without touching YAML.
5. **Coverage comparison** — `compare_bga.py`, `compare_sources.py` (BGA,
   Tabletopia, Yucata, Steam, SdJ, 18xx.games, Brettspielwelt),
   `retailer_check.py` (Barnes & Noble, Target, GameNerdz, Amazon snapshots).

## Frontend Screens

- `/` **Games browser** — card/table view toggle, filter bar (text, mechanics,
  styles, themes, evokes, player counts, year/playtime ranges, five rating
  ranges, designer, publisher), "evokes" browse section with counts, game
  detail modal (ratings, categories, evokes, related games, description).
- `/images` **Image manager** — grid of games with drag-and-drop box-art upload.
- `/master-list` **Master list tracker** — research progress against the
  catalog universe, enriched with source-list counts.

## Key Design Decisions Already Made (inferred from code)

1. **YAML is the source of truth; SQLite is a disposable read cache** (stated in
   `build_db.py`, `db.js`, CLAUDE.md).
2. **Clean-room catalog: BoardGameGeek is a blocked source.** Session 5 notes
   record deliberately stripping third-party ranking dependencies; the research
   log + image provenance exist to prove data lineage. Images must be licensed
   for commercial use. [INFERRED: this positions the dataset for commercial
   exploitation free of BGG terms-of-service entanglement.]
3. **Edition-level catalog entries** — `year` is the edition's year;
   `game_family` groups editions; expansions are (intended to be) separate
   entries linked by `base_game`.
4. **Controlled vocabularies** — categories and evokes must match `schema.yaml`
   exactly; agents are instructed not to invent tags.
5. **Slug identity + alternate names** — duplicate prevention checks `name` and
   `alternate_names` across the corpus.
6. **One implicit owner** — `affinity`, `hotness`, `plays_tracked` are personal
   fields of a single unnamed collector; there is no user entity.

## Apparent Intended Features (from stubs, TODOs, naming)

- `web/README.md` "Potential Enhancements": bulk upload, metadata editing via
  web, master-list integration, **play tracking**, **user authentication**,
  **admin panel**, cloud image storage.
- `TODO.md`: expansion files, edition variants, upgrade entries, play-tracking
  structure, frontend revamp, duplicate cleanup, data-quality queries.
- `plays_tracked.configs[]` exists in every file but its structure is undefined
  (TODO confirms it is unbuilt).
- `expansion_template` and `upgrade_template` exist in `schema.yaml` ahead of
  real usage (`upgrades: []` everywhere; expansion files mostly not yet split).
- `retailer_check.py` embeds scraped retail catalogs — market/retail awareness.

## Open Questions / Conflicting Signals

1. **No physical-copy layer.** The hierarchy stops at Edition; nothing models an
   owned/sellable copy (a marketplace prerequisite).
2. **Designers/publishers dual-modeled** — as `designer[]`/`publisher[]`
   metadata *and* as category tags (a denormalization that can drift).
3. **`min_age`** is used in every game file, the DB, and the web layer, but is
   absent from the `schema.yaml` template.
4. **BGG ambivalence** — BGG is a blocked source, yet `bgg_id` remains the CSV's
   first column and `scrape_bgg.py` is retained (notes say the API now requires
   a bearer token).
5. **`master_list.csv` data quality** — ~30 rows have blank/shifted `type`
   values (unquoted commas in names), plus known near-duplicate entries
   (TODO.md).
6. **Two master-list readers disagree** — `scripts/progress.py` honors
   `status`/`yaml_id`; `web/lib/yaml-handler.js#loadMasterList` ignores both and
   dedups by slug only.
7. **`web/README.md` is stale** — describes a single `index.html` frontend that
   has since become three pages.
8. **No marketplace code exists** — no listings, sellers, pricing, condition,
   transactions, payments, or users anywhere in the repo (verified by sweep).
