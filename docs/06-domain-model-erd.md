# Domain Model & ERD Description

> **Status:** First draft. Part A describes entities **as implemented** (YAML
> files + the SQLite schema in `scripts/build_db.py`). Part B lists entities
> that are implied but not modeled. Part C is the textual ERD.

## Part A — Implemented Entities

### Game (Edition-level catalog entry)
**Purpose:** the atomic catalog unit — one published edition of one game.
**Storage:** `games/{slug}.yaml` (source of truth) → SQLite `games` row +
child tables (derived).
**Key fields:** `id` (slug PK), `name`, `year` (edition year), `edition`,
`game_family`, `base_game`, `playtime_minutes`, `min_playtime`,
`max_playtime`, `min_age`, ratings `length` / `rules_complexity` /
`strategic_depth` / `feel` / `value` (0–4), personal `affinity` / `hotness`
(0–4, null), `description`, `total_plays`.
**Child collections (one row per value, FK `game_id`):**
`game_alternate_names`, `game_designers`, `game_publishers`, `game_artists`,
`game_categories`, `game_evokes`, `game_possible_counts`, `game_true_counts`
(counts stored as TEXT to allow `"12+"`), `game_expansions` (`expansion_id`),
`game_compatible_with` (`compatible_id`), `game_upgrades` (`name`, `year`,
`type`, `publisher`, `notes`).

### MasterListEntry
**Purpose:** the catalog *universe* — every known game, researched or not;
drives the research queue. **Storage:** `master_list.csv`.
**Fields:** `bgg_id`, `name`, `year`, `type`, `status`
(`''|skip|failed|ambiguous|duplicate`), `notes`, `yaml_id` (explicit link to
`games/{yaml_id}.yaml` when name-matching fails).
**Linkage to Game is soft:** slugified-name match, falling back to `yaml_id` —
there is no enforced FK.

### SourceList & SourceListGame
**Purpose:** provenance + prioritization (award lists, reviewer lists).
**Storage:** `sources/lists/*.yaml`. **Fields:** list: `source`, `url`,
`fetched`; per game: `id`, `name`, `year`. Games referenced by slug —
**soft many-to-many** with Game, resolved at runtime by
`scripts/progress.py` / `web/lib/yaml-handler.js` (union by `id`).

### Publisher (directory record)
**Purpose:** press-asset outreach CRM. **Storage:** `publishers.yaml`, keyed
by publisher name. **Fields:** `press_url`, `parent` (self-reference by name
— an informal publisher hierarchy), `contact`, `notes`, `status`
(`not_contacted|contacted|approved|declined`).
**Note:** *not* linked to `game_publishers.name` by key — names must match by
convention. Distinct from the publisher *category tags* in `schema.yaml`.

### ImageProvenance
**Purpose:** license audit for box art. **Storage:** `images/sources.yaml`,
keyed by game slug. **Fields:** `file`, `source_url`, `publisher`, `license`,
`date`, `resolution`, `notes`. The image↔game association is by **filename
convention** `{Name} ({Year}).{ext}`, computed at request time — no FK.

### ResearchLogEntry
**Purpose:** audit trail of research URLs. **Storage:**
`sources/research-log.yaml`. **Fields:** `timestamp`, `game_id` (slug, soft
FK), `url`, `description`.

### Embedded value objects
- **Upgrade** (`upgrades[]` in YAML / `game_upgrades` table): aftermarket
  accessory — `name`, `year`, `type`, `publisher`, `notes`.
- **PlaysTracked** (`plays_tracked` in YAML): `total_plays` int +
  `configs[]` whose structure is **undefined** (TODO.md confirms unbuilt).

## Part B — Implied but Not Yet Modeled

| Entity | Evidence it's implied | Status |
|---|---|---|
| **GameFamily (Work)** | `game_family` string shared across entries; CLAUDE.md "Expansion & Variant Tracking" | Attribute only — no entity, no family metadata [NEEDS REVIEW: promote to entity for family landing pages] |
| **User / Owner** | `affinity`, `hotness`, `plays_tracked` are one implicit person's data; `web/README.md` lists "User authentication" as future | Absent |
| **PlayConfig / Session** | `plays_tracked.configs[]` placeholder; TODO "Add plays tracking" | Placeholder only |
| **Designer / Artist (entities)** | Free-text name arrays + designer category tags | Names only — no entity, no disambiguation of same-name people |
| **Listing, Item/Copy, Order, Payment, Shipment, Review, Dispute** | Required by the marketplace brief | **No basis in code** — see PRDs 02/04; everything below the Edition layer is greenfield |

## Part C — Textual ERD

### As implemented

```
MasterListEntry ──(soft: slug match or yaml_id)──> Game (0..1)
SourceList 1──* SourceListGame ──(soft: slug)──> Game        ← soft M:N
Game *──(game_family string)──* Game                          ← informal Work grouping
Game 1──* GameExpansion(expansion_id) ──> Game                ← parent→child, M:N-capable
Game *──(base_game)──> Game (0..1)                            ← child→parent (redundant w/ above)
Game *──* Game  via game_compatible_with                      ← M:N, directional rows
Game 1──* {AlternateName, Designer, Publisher, Artist,
           Category, Evoke, PossibleCount, TrueCount, Upgrade}
Publisher(directory) ──(soft: name match)──> game_publishers.name
Publisher(directory) *──(parent name)──> Publisher(directory)
ImageProvenance ──(filename convention)──> Game (0..1)
ResearchLogEntry *──(soft: game_id slug)──> Game
```

### Many-to-many resolutions (as built)
- **Game ↔ Category / Evoke / Designer / Publisher / Artist / PlayerCount:**
  resolved via the eleven `game_*` join-style child tables; in YAML they are
  simple string arrays (denormalized; no reverse index outside SQLite).
- **Game ↔ Game (expansions):** `game_expansions` rows; **stored bidirectionally**
  (`expansions[]` on parent AND `base_game` on child) — drift-prone, no
  integrity check exists. [NEEDS REVIEW]
- **Game ↔ Game (compatibility):** `game_compatible_with` rows; symmetric
  relation stored as directed rows with no symmetry enforcement.
- **Game ↔ SourceList:** soft M:N by slug, computed at read time.

### Target marketplace extension [INFERRED — for review, no code basis]

```
Work (promoted from game_family) 1──* Edition (today's Game)
Edition 1──* Listing                      ← Item/Copy layer optional at MVP
User 1──* Listing (as seller)
Listing 1──0..1 Order ──> User (as buyer)
Order 1──1 Payment, 1──0..1 Shipment, 1──0..2 Review, 1──0..1 Dispute
Listing *──* {Expansion, Upgrade} as "includes" lines (from catalog vocab)
```

### Integrity gaps to close before marketplace use
1. All cross-file references (master list, source lists, research log, images,
   publisher directory) are **convention-based soft links** — fine for a
   single-owner dataset, unacceptable once listings and money attach to them.
2. `expansions[]`/`base_game` redundancy needs a single source + validator.
3. `game_family` values are unregistered strings — typos silently fork
   families.
4. Known near-duplicate catalog entries (TODO.md, e.g., "Clank!" punctuation
   variants) must be merged before listings can attach to them.
