# Board Game Database - Session Notes

**Date:** January 24, 2026
**Session:** Initial Setup & First 25 Games

---

## What Was Accomplished

### 1. Project Structure Created
- `/games/` - Individual YAML files for each game
- `/images/` - Folder for box art (with README guide)
- `schema.yaml` - Complete schema documentation
- `master_list.yaml` - 1,000 games from online rankings

### 2. Schema Defined
Full rating system implemented:
- **Length** (0-4): Snack → Marathon
- **Rules Complexity** (0-4): Preschool → PhD
- **Strategic Depth** (0-4): Reflex → Master Plan
- **Feel** (0-4): Solitary → Fierce
- **Affinity** (0-4): Personal rating (left blank)
- **Hotness** (0-4): Personal rating (left blank)
- **Value** (0-4): Impulse → Heirloom

### 3. Categories Organized
70+ tags across:
- Mechanics (Worker Placement, Deck Building, etc.)
- Styles (Euro, Ameritrash, Party, etc.)
- Themes (Sci-Fi, Fantasy, Historical, etc.)
- Designers (Knizia, Rosenberg, Stegmaier, etc.)
- Publishers (Stonemaier, FFG, Leder Games, etc.)

### 4. Master List Compiled
- 1,000 games from online rankings
- Includes name, year, and rank
- Covers base games, expansions, and editions

### 5. Detailed Game Files Created (25 games)
| Game | Year | Designer(s) |
|------|------|-------------|
| Brass: Birmingham | 2018 | Wallace, Brown, Tolman |
| Ark Nova | 2021 | Wigge |
| Pandemic Legacy: Season 1 | 2015 | Leacock, Daviau |
| Gloomhaven | 2017 | Childres |
| Dune: Imperium | 2020 | Dennen |
| Twilight Imperium 4 | 2017 | Petersen, Konieczka, Beltrami |
| Terraforming Mars | 2016 | Fryxelius |
| Spirit Island | 2017 | Reuss |
| Scythe | 2016 | Stegmaier |
| Root | 2018 | Wehrle |
| Wingspan | 2019 | Hargrave |
| Concordia | 2013 | Gerdts |
| Dominion | 2008 | Vaccarino |
| Everdell | 2018 | Wilson |
| 7 Wonders Duel | 2015 | Bauza, Cathala |
| War of the Ring 2E | 2011 | Di Meglio, Maggi, Nepitello |
| Star Wars: Rebellion | 2016 | Konieczka |
| Gaia Project | 2017 | Drogemuller, Ostertag |
| Twilight Struggle | 2005 | Gupta, Matthews |
| The Castles of Burgundy | 2011 | Feld |
| Great Western Trail | 2016 | Pfister |
| Nemesis | 2018 | Kwapinski |
| A Feast for Odin | 2016 | Rosenberg |
| Agricola | 2007 | Rosenberg |
| Azul | 2017 | Kiesling |

---

## Session 2 - Bulk Game Entry

**Date:** January/February 2026

### What Was Accomplished

- Added 202 new detailed game entries (25 → 227 total)
- Games now cover a wide range of top-ranked titles including editions, expansions, and variants
- Added `/add-game` skill for automated game entry via Claude Code subagent
- Refined skill to use Sonnet model for cost-efficient research

### Add-Game Skill (`/.claude/skills/add-game/`)
- Forked subagent that researches and creates game YAML files
- Uses WebSearch + WebFetch for publisher data
- Pinned to Sonnet model (structured data collection doesn't need Opus)

---

## Session 3 - Progress Tracking System

**Date:** February 2026

### What Was Accomplished

- Added `id` slugs to all 1,000 entries in `master_list.yaml` (links entries to `games/` files)
- Created `scripts/progress.py` — shows completion stats and next games to work on
- Created `/progress` Claude Code skill as a quick shorthand
- Migration script: `scripts/generate_master_ids.py` (kept for reference)

---

## Session 4 - Bulk Game Entry (Ranks 188-327)

**Date:** February 14, 2026

### What Was Accomplished

- Added 100 new detailed game entries (227 → 327 total)
- Covers ranks 188-327 from the original master list
- Used parallel subagents for efficient batch creation
- Updated CLAUDE.md game count

### Notable Games Added
- Heavy Euros: Tiletum, Hallertau, Kanban: Driver's Edition, Bora Bora, Bitoku
- Classics: Glory to Rome, The Princes of Florence, 1830, Battle Line, Goa
- Party/Family: Monikers, Skull King, Kingdomino, Love Letter (2019)
- Civilization: Tapestry, Endless Winter: Paleoamericans
- Wargames: Dune: War for Arrakis, 1960: The Making of the President, Kemet: Blood and Sand
- Deck Builders: Hero Realms, Star Realms: Frontiers, Aeon's End: The New Age
- Worker Placement: Viticulture, Apiary, Unconscious Mind
- Other: Galaxy Trucker, Santorini, Turing Machine, Mind MGMT, Marvel United

---

## Session 5 - Source Restructuring & Master List Rebuild

**Date:** February 15, 2026

### What Was Accomplished

- **Restructured data sources** — removed all third-party ranking site dependencies
  - Stripped weight reference comments from 128 game YAML files
  - Rewrote `/add-game` skill to use publisher sites, Wikipedia, retailers, and review sites
  - Added subjective rules_complexity guidelines
- **Built new master list** from award winners and notable game lists
  - Compiled from: Spiel des Jahres, Kennerspiel des Jahres, As d'Or, International Gamers Award, Origins Awards, Dice Tower People's Choice, Wikipedia game lists, publisher catalogs
  - New format uses `source` field (provenance) instead of ranking
  - Alphabetical by ID instead of ranked
  - All 389 existing game files included
- **Created source provenance system**
  - `sources/research-log.yaml` — chronological log of all URLs consulted
  - `/add-game` skill now appends to this log automatically
- **Archived original data**
  - `archive/games-v1/` — snapshot of all game files pre-change
  - `archive/master-list-v1.yaml` — original master list
- **Updated tooling**
  - `scripts/progress.py` — shows source instead of ranking
  - `/progress` skill — updated output description
- **Updated documentation**
  - CLAUDE.md — added Blocked Sources and Source Provenance sections
  - SESSION_NOTES.md — this entry

---

## Session 6 - Fresh Start: Source Lists & Initial Game Entries

**Date:** February 16, 2026

### What Was Accomplished

- **Created 4 award source lists** in `sources/lists/`:
  - Spiel des Jahres Winners (47 games, 1979-2025)
  - Kennerspiel des Jahres Winners (15 games, 2011-2025)
  - Golden Geek Awards Winners (15 games, 2010-2024, incomplete)
  - Deutscher Spiele Preis Winners (11 games, 1990-2025, incomplete)
  - **Total: 75 unique games across all lists**

- **Added 20 detailed game entries** (0 → 20 total):
  - Used parallel `/add-game` skill subagents for efficient batch creation
  - Prioritized games appearing in multiple awards
  - All entries fully researched from publisher sites, Wikipedia, retailers, and review sites
  - All research URLs logged to `sources/research-log.yaml`

- **Implemented `alternate_names` field** — Architectural change to handle multilingual games:
  - Added `alternate_names: []` to schema template for tracking translations and regional names
  - Updated `scripts/progress.py` to check both primary and alternate names when detecting duplicates
  - Updated `/add-game` skill to research and record alternate names
  - Updated documentation in CLAUDE.md and schema.yaml
  - Example: "Adel Verpflichtet" also known as "Hoity Toity", "Fair Means or Foul", "By Hook or By Crook"
  - Prevents duplicate entries when source lists use different names for the same game
  - Fixed 5 game file IDs to match source list conventions (removed unnecessary year suffixes)

### Games Added (20)
| Game | Year | Designers | Awards |
|------|------|-----------|--------|
| Wingspan | 2019 | Elizabeth Hargrave | 3 awards 🏆🏆🏆 |
| Adel Verpflichtet | 1990 | Klaus Teuber | 2 awards |
| Ark Nova | 2021 | Mathias Wigge | 2 awards |
| El Grande | 1995 | Wolfgang Kramer, Richard Ulrich | 2 awards |
| SETI | 2024 | Tomáš Holek | 2 awards |
| 7 Wonders | 2010 | Antoine Bauza | 1 award |
| Alhambra | 2003 | Dirk Henn | 1 award |
| Auf Achse | 1987 | Wolfgang Kramer | 1 award |
| Azul | 2017 | Michael Kiesling | 1 award |
| Barbarossa | 1988 | Klaus Teuber | 1 award |
| Bomb Busters | 2025 | Hisashi Hayashi | 1 award |
| Brass: Birmingham | 2018 | Wallace, Brown, Tolman | 1 award |
| Broom Service | 2015 | Pelikan, Pfister | 1 award |
| Café International | 1989 | Rudi Hoffmann | 1 award |
| Call My Bluff | 1993 | Richard Borg | 1 award |
| Camel Up | 2014 | Steffen Bogen | 1 award |
| Carcassonne | 2000 | Klaus-Jürgen Wrede | 1 award |
| Challengers! | 2022 | Krenner, Slawitscheck | 1 award |
| Codenames | 2016 | Vlaada Chvátil | 1 award |
| Colt Express | 2014 | Christophe Raimbault | 1 award |

### Progress
- **Completion: 20/75 games (26.7%)**
- **Remaining: 55 games** from award lists
- **No orphan games** after ID standardization

### Architecture Notes
- **alternate_names field** added to schema for handling games with multiple titles (translations, regional names)
- Duplicate detection now checks both primary name and alternate names across all existing games
- This prevents creating duplicate entries when source lists use different names for the same game

### Next Steps
- [ ] Complete Golden Geek and Deutscher Spiele Preis lists (fill missing years)
- [ ] Add remaining 8 source lists (review sites, designers, publishers)
- [ ] Continue adding game entries for remaining 55 award winners

---

## Session 7 - Wikidata Scraper & Additional Game Entries

**Date:** February 19, 2026

### What Was Accomplished

- **Built Wikidata SPARQL scraper** (`scripts/scrape_wikidata.py`)
  - Queries Wikidata's free public endpoint — no API key required
  - Fetches 10,000 board games per run, resumable via `wikidata_state.json`
  - Outputs to `master_list.csv` (columns: bgg_id, name, year, type)
  - Also retained `scripts/scrape_bgg.py` (BGG XML API, now requires bearer token)
  - BGG API now requires registration — Wikidata selected as alternative
- **Added ~99 new game YAML entries** (covering BGG ranks ~51–118 range)
  - Note: some of these overlap with existing entries on remote; remote versions preferred

### Notes
- `master_list.csv` is a bulk discovery catalog, separate from the `sources/lists/` workflow
- The Wikidata scraper does not replace the award-source-list approach; it supplements it
- Some game files added locally had parallel versions on remote; remote versions (more refined) were kept

---

## Session 8 - SQLite Database

**Date:** February 21, 2026

### What Was Accomplished

- **Built `scripts/build_db.py`** — reads all `games/*.yaml` and produces a normalized SQLite database (`games.db`)
  - Normalized schema: `games` table (scalars) + 11 array/nested tables with foreign keys
  - Indexes on categories, evokes, designers, year, and all rating columns
  - Idempotent: drops and recreates all tables on each run
  - Summary output: `540 games, 4512 categories, 2700 evokes, 781 designers, 662 publishers, 482 artists`
- **Updated `.gitignore`** — `games.db` is a derived artifact, not committed
- **Updated documentation** — CLAUDE.md (key stats, query examples, tooling) and TODO.md

### Architecture Notes
- YAML remains the source of truth; `games.db` is a read cache rebuilt on demand
- Enables SQL queries that were previously impossible without parsing all 540 YAML files
- Designed to power a future Node.js web frontend

---

## Session 9 - Master List Status Tracking & Game Entries

**Date:** February 22, 2026

### What Was Accomplished

- **Added status tracking to `master_list.csv`** — three new columns: `status`, `notes`, `yaml_id`
  - `status`: empty (pending), `skip`, `failed`, `ambiguous`, `duplicate`
  - `notes`: free-text explanation for non-pending statuses
  - `yaml_id`: explicit slug mapping when auto name/slug matching fails
  - Solves two problems: failed/ambiguous games no longer clog the progress queue, and name mismatches (e.g., "1776" vs "1776: The Game of the American Revolutionary War") are resolved

- **Updated `scripts/progress.py`**
  - Checks `yaml_id` first for matching (explicit link bypasses fuzzy matching)
  - Excludes entries with status in (skip, failed, ambiguous, duplicate) from remaining queue
  - Shows status breakdown in stats output (e.g., "Excluded: 5 (2 failed, 2 ambiguous, 1 skip)")
  - New flags: `--failed`, `--skipped`, `--ambiguous`, `--duplicate` to list entries by status

- **Created `scripts/update_master_status.py`** — CLI for updating master list rows
  - Single update: `python3 scripts/update_master_status.py "GameName" --status failed --notes "reason"`
  - Batch from JSON: `--from-results results.json`
  - Auto-backfill: `--backfill` matches YAML names/alternate_names against master list entries
  - Dry-run mode: `--dry-run` to preview changes

- **Ran backfill** — auto-populated `yaml_id` for 90 entries where names didn't match
  - Progress improved from 681→699 matched games, orphans dropped from 104→35
  - Uses subtitle-delimiter matching (`:`, ` -`, ` (`) to avoid false positives

- **Added 40 new game entries** (703 → 743 total)
  - Batch of 50 requested, 10 skipped as already existing
  - Range: Age of Discovery through Attacktix Star Wars
  - 2 duplicates identified and marked (Clank! variant spelling, Old King's Crown with/without "The")

### Progress
- **Completion: 747/3876 (19.3%)**
- **Remaining: 3129 games** in queue

---

## Session 10 - Bulk Batch: 500 Games (Interrupted) + Retry

**Date:** February 23, 2026

### What Was Accomplished

- **Launched 10-agent batch of 500 games** — Batch 1 completed fully; batches 2-10 hit API rate limits but still created most files before dying
- **Committed 403 new game entries** (743 → 1146 total)
- **Retried ~80 missing games** from the interrupted batch using 2 agents
  - Batch 1: 39 created, 9 skipped, 1 failed
  - Batch 2: 43 created, 4 skipped, 3 failed
  - Committed 82 new game entries
- **Improved backfill matching** — added subtitle-delimiter matching for cases like "Heat" → "Heat: Pedal to the Metal"
- **Manually linked edge cases** — Dragon'g Breath, Ea$y Money, Conquistador, Berlin '85 (Unicode fix), 369 Qí

### Progress
- **Completion: 1,784/3,876 (46.3%)**

---

## Session 11 - Bulk Batch: 200 Games

**Date:** February 24, 2026

### What Was Accomplished

- **Added 180 new game entries** using 2 parallel agents of 100 each
  - Range: Hexagony through Keythedral
  - Batch 1: 89 created, 11 skipped
  - Batch 2: 91 created, 4 skipped, 3 failed

### Progress
- **Completion: 1,966/3,876 (51.1%)**

---

## Session 12 - Bulk Batch: 300 Games

**Date:** February 24, 2026

### What Was Accomplished

- **Added 252 new game entries** using 3 parallel agents of 100 each
  - Range: Khalkhin-Gol through Meschugge
  - Batch 1: 88 created, 10 skipped, 2 failed
  - Batch 2: 100 created, 0 failed
  - Batch 3: 64 created, 2 skipped, 34 failed (many obscure/foreign titles)
- **Extensive backfill** — 47 entries linked, 10 false positives cleared
- **Marked 30 failed, 4 ambiguous, 2 skip** entries

### Progress
- **Completion: 2,220/3,876 (57.8%)**

---

## Session 13 - Bulk Batch: 200 Games + Tracking Improvements

**Date:** February 24-25, 2026

### What Was Accomplished

- **Added 131 new game entries** using 2 parallel agents of 100 each
  - Range: Mesopotamia through Nova Luna
  - Batch 1: 89 created, 11 skipped
  - Batch 2: 42 created, 1 skipped, 57 failed (many obscure N-range titles)
- **Improved `scripts/update_master_status.py`** backfill to strip parenthetical suffixes like `(game)`, `(board game)`, `(card game)`, `(dup)` for better matching
- **Manually linked 8 stuck entries** that kept appearing at top of queue (Dead of Winter, Diadem, Fantasy Land, Giganten, Coin Hopping, Berlin '85, China's War, Qi)
- **Fixed CSV encoding issue** — Berlin '85 used U+2019 (right single quote), not U+2018

### Progress
- **Completion: 2,383/3,876 (61.5%)**

---

## Session 14 - Bulk Batch: 400 Games

**Date:** February 25, 2026

### What Was Accomplished

- **Added 382 new game entries** using 4 parallel agents of 100 each
  - Range: Ninjato through Savernake Forest
  - Batch 1 (N-O-Pa): 100 created, 0 failed
  - Batch 2 (Pa-Po): 77 created, 17 failed, 2 ambiguous
  - Batch 3 (P-R): 95 created, 4 skipped, 1 failed
  - Batch 4 (R-S): 100 created, 0 failed
- **Backfill** — 35 legitimate yaml_id links, 8 false positives cleared
- **Marked 16 failed, 2 ambiguous** entries

### Progress
- **Completion: 2,765/3,876 (71.3%)**
- **Remaining: 979 games** in queue
- **Excluded: 132** (97 failed, 22 ambiguous, 11 skip, 2 duplicate)

---

## File Counts

Run `python3 scripts/progress.py 0` for live stats. Snapshot as of March 2026:

- `sources/lists/*.yaml`: 20 source list files
- `games/*.yaml`: 2,735 detailed entries
- `games.db`: SQLite database (rebuilt via `python3 scripts/build_db.py`)
- `master_list.csv`: 3,876 games (Wikidata + manual additions)
