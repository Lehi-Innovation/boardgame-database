# PRD-03 — Search & Discovery

> **Status:** First draft. Catalog search is **implemented and running**
> (`web/server.js`, `web/lib/db.js`, `web/public/js/filter-bar.js`); listing
> search is greenfield. Endpoint and parameter names below are verbatim.

## 1. Current Capabilities (implemented)

### `GET /api/games/query` — filtered, sorted, paginated search
- **Text**: `q` → `LIKE '%q%'` against `games.name` OR `games.description`
- **Facets (AND-combined)**: `categories` (repeatable), `evokes` (repeatable)
- **Player count**: `true_counts` (repeatable, OR within the facet) — searches
  *community-best* counts, not box counts
- **Ranges**: `year_min/max`, `playtime_min/max`, and min/max for each of
  `length`, `rules_complexity`, `strategic_depth`, `feel`, `value`
- **Exact**: `designer`, `publisher`
- **Sort**: whitelist of `name`, `year`, `playtime_minutes`, the five rating
  columns; `dir=asc|desc`; NULLs sort last; name as tiebreaker
- **Pagination**: `page`, `per_page` (max 200, default 50); returns `total`,
  `total_pages`

### Supporting endpoints
- `GET /api/filter-options` — distinct values for every facet, bucketed into
  mechanics/styles/themes/other via hardcoded sets in `db.js`, plus year and
  playtime ranges and player counts
- `GET /api/evokes/counts` — game counts per evoke (powers the browse surface)
- `GET /api/games`, `GET /api/games/:id` — YAML-backed full dumps (legacy path)

### Frontend (`/` games browser)
- Filter bar with all facets above; card and table views; detail modal with
  ratings, categories, evokes, and related games (`game_family`, `base_game`,
  `expansions`, `compatible_with`); **evokes section** — browse-by-feeling
  entry point with live counts.

## 2. Known Limitations (visible in code)

1. **No full-text search engine** — substring `LIKE` only; no stemming,
   typo-tolerance, or relevance ranking. Results are sorted by metadata, never
   by match quality.
2. **Alternate names are not searched.** `game_alternate_names` is in the DB,
   but the `q` filter only touches `name`/`description` — a buyer searching
   "Hoity Toity" will not find "Adel Verpflichtet". [NEEDS REVIEW: cheap,
   high-value fix.]
3. **Designer/publisher are exact-match single values** — no partial or
   multi-select, even though the tooling does fuzzy matching elsewhere
   (`update_master_status.py --backfill`, `compare_sources.py` normalization).
4. **Facets are AND-only** for categories/evokes — no "Euro OR Wargame".
5. **In-memory snapshot** — sql.js loads `games.db` once at startup;
   `reopenDb()` exists but nothing calls it. Fresh data requires a manual
   rebuild + restart.

## 3. Intended Filter Taxonomy

**For the catalog (exists):** mechanics (52), styles (13), themes (35),
evokes (18), true/possible player counts, year, playtime, the five 0–4
ratings, designer, publisher — all enumerated in `schema.yaml`.

**For listings (greenfield)** [INFERRED — combine catalog facets with
commerce facets]:

| Facet | Source |
|---|---|
| Everything above (mechanics, evokes, player count, …) | catalog join — the structural advantage |
| Price range | Listing [OPEN QUESTION] |
| Condition grade | Listing [OPEN QUESTION — PRD-02 §3] |
| Completeness / includes expansions or upgrades | Listing ← catalog `expansions[]`/`upgrades[]` |
| Seller rating | Trust system [OPEN QUESTION — PRD-04] |
| Location / ships-from, local pickup | [OPEN QUESTION: no geo concept exists anywhere] |
| Edition / printing within a family | `game_family` + `edition` (exists) |

## 4. Browse & Recommendation Surfaces

**Exists:**
- Evokes browse section (feeling → filtered game list) — the seed of a
  differentiated discovery surface ("I want something *tense*").
- Master-list tracker page (`/master-list`) — internal/curatorial, ranks by
  source-list count (`source_count` = how many award/review lists cite a
  game). [INFERRED: `source_count` is a ready-made *editorial popularity
  signal* — usable as a default sort for browse pages and as a cold-start
  proxy before sales data exists.]

**Does not exist:** personalized recommendations, similar-games ("more like
this"), trending, collections/wishlists. [INFERRED: `evokes` overlap +
shared `categories` + `game_family` provide a workable content-based
similarity function with zero new data collection. `affinity`/`hotness`
fields anticipate per-user taste data but are single-owner today.]
[OPEN QUESTION: are wishlists/saved-search alerts ("notify me when a copy of
X is listed under $Y") in MVP scope? They are the highest-leverage liquidity
feature for a thin marketplace.]

## 5. How the Catalog Hierarchy Enables & Constrains Search

**Enables:**
- Family-level results: one "Brass" result expandable to editions, each with
  its own listings — impossible on title-string marketplaces.
- Expansion-aware queries: "base game + all expansions in one lot" is
  expressible because `base_game`/`expansions[]` are FKs, not text.
- Edition disambiguation at search time prevents the classic
  wrong-printing dispute.

**Constrains:**
- `game_family` is a string attribute with no family entity (PRD-01 §1) — no
  family name/description to render a landing page from; family pages need
  the Work entity promoted first.
- Edition coverage is research-gated: a listing for an edition not yet in the
  catalog has nothing to attach to (PRD-02 §2 options).
- Known master-list near-duplicates (TODO.md: "Clank!" punctuation variants)
  would surface as duplicate search results if inherited uncleaned.
