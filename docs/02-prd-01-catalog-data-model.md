# PRD-01 — Catalog & Data Model

> **Status:** First draft. This is the best-supported document in the suite —
> the catalog is fully implemented in this repository. Field names, file paths,
> and table names below are taken verbatim from the code.

## 1. The Game Hierarchy

The codebase implements a **two-and-a-half layer** hierarchy. Using the
Works / Editions / Items framing:

| Layer | Marketplace concept | In this codebase | Status |
|---|---|---|---|
| **Work** | The abstract game design ("Brass") | `game_family` — a free-text string shared by related entries (e.g., `brass` on both *Brass: Lancashire* and *Brass: Birmingham*) | Half-modeled: it is an attribute, **not an entity** — no family-level record, name, or metadata exists |
| **Edition** | A specific published version ("Brass: Birmingham, 2018") | One YAML file in `games/{slug}.yaml`; `id`, `name`, `year` (edition year, per CLAUDE.md "Date Fields"), `edition` field for variant labels | **Fully modeled** — this is the catalog's atomic unit |
| **Item** | A physical copy someone owns/sells | **Does not exist** | [OPEN QUESTION: the marketplace requires an Item/Copy entity; see PRD-02] |

Related structures at the Edition layer:

- **Expansions** — `base_game` (child → parent id) and `expansions[]`
  (parent → child ids). `schema.yaml#expansion_template` adds `standalone:
  bool`. TODO.md confirms most expansions are not yet split into their own
  files. [NEEDS REVIEW: the two-way link (`base_game` vs `expansions[]`) is
  redundantly stored and can drift; pick one as canonical.]
- **Compatibility** — `compatible_with[]` for combinable standalone games
  (e.g., deck-builder cross-compatibility).
- **Upgrades** — nested `upgrades[]` (`name`, `year`, `type`, `publisher`,
  `notes`) for aftermarket accessories (metal coins, inserts, playmats).
  Currently `[]` in essentially all files (TODO: "populate upgrade sections").
- **Promos** — [OPEN QUESTION: promos are not modeled anywhere. They are
  marketplace-significant (often the most-traded items). Candidate: an
  expansion-type entry with a `promo` flag, or a new layer.]

## 2. Identification & Sourcing

**Identity:**
- Primary key: lowercase hyphenated **slug** (`azul`,
  `pandemic-legacy-season-1`); filename must equal `id`.
- `alternate_names[]` captures translations/regional titles ("Adel
  Verpflichtet" / "Hoity Toity") and drives duplicate detection.
- `bgg_id` exists **only** in `master_list.csv` (sourced from Wikidata's
  SPARQL endpoint via `scripts/scrape_wikidata.py`), not in game YAML.
  [NEEDS REVIEW: conflicting signal — BGG is a blocked *source* (CLAUDE.md),
  yet BGG ids are retained as *identifiers* and `scripts/scrape_bgg.py` still
  exists (noting the API now requires a bearer token). Decide whether bgg_id
  is a supported cross-reference key for the marketplace.]

**Sourcing — two-track pipeline (fully implemented):**
1. **Discovery:** `master_list.csv` is the universe ("want list"), populated by
   the Wikidata scraper plus manual additions; `status` column
   (`skip`/`failed`/`ambiguous`/`duplicate`) and `yaml_id` manage the queue.
2. **Research:** the `/add-game` skill and `game-researcher` agent perform web
   research (publisher sites, Wikipedia, retailers, review sites — **never
   BGG**) via `scripts/game_pipeline.py`, write the YAML, and log every URL to
   `sources/research-log.yaml` (2,510 entries to date).

There is **no public/community contribution path** — all entry is
owner/agent-driven. [OPEN QUESTION: will marketplace sellers be able to
request or submit missing editions, and who moderates that?]

## 3. Canonical Data Fields (Edition layer)

From `schema.yaml#template` and `scripts/build_db.py`:

| Group | Fields |
|---|---|
| Identity | `id`, `name`, `alternate_names[]`, `year` |
| Hierarchy | `game_family`, `edition`, `base_game`, `expansions[]`, `compatible_with[]` |
| Objective ratings (0–4) | `length`, `rules_complexity`, `strategic_depth`, `feel`, `value` (production value, **not condition**) |
| Personal ratings (0–4, null) | `affinity`, `hotness` — single-owner fields; [NEEDS REVIEW: these do not belong in a shared marketplace catalog and should move to a per-user layer] |
| Taxonomy | `categories[]` (52 mechanics, 13 styles, 35 themes, 28 designer tags, 22 publisher tags — exact values in `schema.yaml`), `evokes[]` (top 5 of 18) |
| Players | `possible_counts[]` (box), `true_counts[]` (community-best) |
| Credits | `designer[]`, `publisher[]`, `artist[]` (free-text names) |
| Logistics | `playtime_minutes`, `min_playtime`, `max_playtime`, `min_age` ([NEEDS REVIEW: `min_age` is used in all game files, the DB, and the API, but is missing from the `schema.yaml` template]) |
| Content | `description` (3–5 sentence block literal) |
| Nested | `upgrades[]`, `plays_tracked` (`total_plays`, `configs[]` — structure undefined, TODO) |

Supporting entities: **Publisher directory** (`publishers.yaml`: `press_url`,
`parent`, `contact`, `status`) and **Image provenance** (`images/sources.yaml`:
`file`, `source_url`, `publisher`, `license`, `date`, `resolution`, `notes`).
Box art is associated by filename convention `{Name} ({Year}).{ext}` — no
foreign key. [NEEDS REVIEW: filename-convention linkage is fragile for a
marketplace; renames silently orphan images.]

## 4. Expansions, Promos, and Game Families — Handling Rules

- A different **edition** of a game gets its own entry with its own `year`,
  sharing `game_family` (e.g., `brass-lancashire` 2007 / `brass-birmingham`
  2018).
- An **expansion** gets its own entry with `base_game` set; standalone
  expansions set `standalone: true` (`expansion_template`).
- **Family is a grouping string, not a page.** [INFERRED] The marketplace will
  want a Work-level landing page ("all Brass editions and expansions for
  sale"); promoting `game_family` to a first-class entity is the cleanest path.
- **Promos:** unmodeled. [OPEN QUESTION above.]
- **Conflict to resolve:** designers and publishers are recorded twice — as
  structured arrays (`designer[]`, `publisher[]`) and as category tags
  ("Reiner Knizia" the tag vs. the name). `web/lib/db.js` works around this by
  classifying any category not in its hardcoded mechanics/styles/themes sets
  as "other". [NEEDS REVIEW: drop designer/publisher tags in favor of the
  arrays before marketplace launch.]

## 5. Search & Indexing Considerations (visible in code)

`scripts/build_db.py` produces a normalized SQLite store:

- `games` (scalars) + child tables `game_alternate_names`, `game_designers`,
  `game_publishers`, `game_artists`, `game_categories`, `game_evokes`,
  `game_possible_counts`, `game_true_counts`, `game_expansions`,
  `game_compatible_with`, `game_upgrades`.
- Indexes on: `category`, `evoke`, designer `name`, `year`, all five rating
  columns, and game `name`.
- Player counts are stored as TEXT (to allow `"12+"`); the web layer sorts via
  `CAST(count AS INTEGER)`.

Constraints this imposes (see PRD-03 for detail):
- Text search is `LIKE '%q%'` over `name`/`description` only — **no FTS, no
  ranking, and alternate names are not searched** despite being in the DB.
- The DB is a full-rebuild snapshot loaded into memory by `sql.js`;
  writes-during-serve and incremental updates are unsupported. [INFERRED: fine
  for a single-user tool; a marketplace needs a served database with
  migrations.]
