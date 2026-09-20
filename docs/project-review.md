# Existing project review

Reviewed September 18, 2026. This is a snapshot of the existing implementation before migration to the [proposed architecture](architecture.md). The findings below remain unresolved unless a later change explicitly closes them.

Repository baseline: commit `b8b2d7f` on `main`, plus the local derived SQLite database and research cache. Changes made during the session were documentation only.

## Scope and method

Inspected the game records, discovery catalog, field definitions, research tooling, SQLite builder, query layer, and Express API. Parsed all game YAML files, compared their IDs and scalar fields with the existing SQLite database, rebuilt the database at a temporary path, checked SQLite integrity, and exercised query helpers and Express route handlers without deploying a server.

This review checked structural quality and implementation behavior. It did not independently verify every game's facts, audit third-party service terms, or perform a full security/load test. Source-log coverage cannot be treated as complete because the log does not parse as YAML.

## Measured baseline

| Measure | Result |
| --- | --- |
| Detailed game YAML files | 2,735 |
| Existing and freshly built SQLite game rows | 2,735 each |
| Raw discovery CSV rows | 3,879 |
| CSV rows with external BGG IDs | 3,030 |
| CSV rows with explicit `yaml_id` mappings | 531 |
| Game YAML parse errors / duplicate keys | None found |
| SQLite integrity check | `ok` for existing database and temporary rebuild |
| Games with categories outside `schema.yaml` | 100 |
| Non-string IDs | 6 |
| Unresolved relationship references | 153: 133 expansion references, 12 base-game references, 8 compatibility references |
| Missing publication year | 39 records |
| Empty/missing designer list | 802 records |
| Empty/missing publisher list | 500 records |
| Empty/missing artist list | 2,185 records |
| Image files | 16, including multiple formats for some games |

Missing credits can be legitimate unknowns, particularly for historical games. These counts describe completeness; they do not prove the values are erroneous. Likewise, a parsed record with all fields populated is not necessarily researched or accurate.

The existing database matched YAML entity membership and the inspected scalar values, apart from the numeric/string ID conversion described below. Cache refresh problems are implementation risks on later changes, not evidence that every current record was stale.

## Findings to carry into implementation

### 1. Validation is descriptive rather than enforced

[schema.yaml](../schema.yaml) documents valid values, but [the builder](../scripts/build_db.py) does not apply a schema validator. All 2,735 records have exactly five evokes, yet some values are outside the vocabulary, including `Bluffing`, `Survival`, and `Puzzle Solving`. One hundred records use unrecognized category values. Player-count values also disagree with the schema's restricted list; that can indicate an inadequate schema rather than incorrect game rules.

New import and contribution commands need shared typed validation, database constraints, and reviewed vocabulary mappings. Structural checks must permit explicitly unknown optional facts.

### 2. Numeric IDs break detail lookup

Unquoted IDs in `007`, `1829`, `1835`, `1853`, `1914`, and `1918` parse as numbers. `007` loses its leading zeros and becomes `7`. SQLite converts the values to text, while the YAML API compares a string URL parameter with a numeric ID using strict equality.

Confirmed: `/api/games/1918` returns `404`, while the SQLite query layer finds that game. See [007.yaml](../games/007.yaml) and `getGameById()` in [yaml-handler.js](../web/lib/yaml-handler.js).

Preserve filename-based legacy identity during import, review the mapping, and use permanent string IDs throughout the new system.

### 3. Duplicate and unresolved identities affect relationships

There are 153 unresolved references. Some are unresearched expansions; others are naming mismatches. Several Catan records point to `catan`, but the existing entry is [settlers-of-catan.yaml](https://github.com/Lehi-Innovation/boardgame-database/blob/b8b2d7f/games/settlers-of-catan.yaml). [andor.yaml](https://github.com/Lehi-Innovation/boardgame-database/blob/b8b2d7f/games/andor.yaml) and [legends-of-andor.yaml](https://github.com/Lehi-Innovation/boardgame-database/blob/b8b2d7f/games/legends-of-andor.yaml) have the same name and year under separate IDs.

Follow-up, September 20: integrating current remote `main` brought in the earlier [Catan and Legends of Andor reconciliation](https://github.com/Lehi-Innovation/boardgame-database/commit/2f0f2ec). The links above now pin the reviewed baseline because two of those files were removed by that fix. The broader unresolved-reference count has not been remeasured on the integrated legacy dataset.

The main SQLite game table also omits the external identifiers stored in the discovery CSV. Import needs a durable identity map, explicit duplicate decisions, external-ID retention, and release-wide relationship validation.

### 4. Some precise values lack established identity or evidence

[Digit](../games/digit.yaml) contains definite player counts and playtimes while its description says the identity is unresolved. [Replay Publishing](../games/replay-publishing.yaml) similarly contains specific values alongside a description acknowledging limited documentation. These examples establish uncertainty within the records; this review did not establish their correct replacement values.

Treat the existing dataset as import candidates. Unknown facts should remain unknown, with sources attached to the claims a reviewer actually accepts.

### 5. Research provenance is malformed and incomplete as a machine-readable audit trail

[sources/research-log.yaml](../sources/research-log.yaml) fails parsing at line 5031 in the reviewed snapshot: a top-level `- game_id: calico` appears after the `entries:` mapping, mixing incompatible structures. Other source information may survive in the raw log or `pipeline_cache.db`, but it is not a validated field-level evidence store.

Recover useful citations during the pilot and validate them individually. Do not equate an old logged URL with verification of every field in a game record.

### 6. Rating meanings drift between definitions and research instructions

The field schema defines `feel: 2` as a party/social dynamic; [.claude/agents/game-researcher.md](../.claude/agents/game-researcher.md) calls it `Moderate`. This is a semantic mismatch even though the integer is in range. The existing template also mixes personal affinity/hotness/plays with shared catalog facts.

Use versioned assessment rubrics and attribution. Keep personal application data outside the shared catalog, and avoid converting old ratings mechanically into a new meaning.

### 7. Search and detail endpoints expose different contracts

The SQLite [query layer](../web/lib/db.js) returns plural `designers`/`publishers` and string player counts. The YAML [detail/list projection](../web/lib/yaml-handler.js) returns singular `designer`/`publisher` and numeric counts, and omits alternate names, editions, relationships, artists, and other available fields.

Confirmed with Wingspan through both paths. The new API needs one defined representation with deliberate summary/detail projections and consistent types.

### 8. The database builder can return success with partial data

`build_database()` in [build_db.py](../scripts/build_db.py) removes the old database, catches individual insertion exceptions, and commits the remaining writes. A synthetic record with an invalid list in `upgrade.name` triggered an insertion error while retaining its already-inserted game and category rows. The function returned normally and printed a successful build summary.

The reproduction used temporary files only. Publication must build a candidate, fail on invalid data, validate the complete result, and switch the active release only after success.

### 9. Running processes do not reliably follow data changes

[db.js](../web/lib/db.js) loads a SQLite snapshot into memory once. Its `reopenDb()` helper has no caller in the application. [yaml-handler.js](../web/lib/yaml-handler.js) caches game data until explicitly cleared, with image upload being the application's existing invalidation path.

Rebuilding SQLite or changing a YAML file does not automatically refresh all running API paths. Release pinning and explicit activation replace this ambiguity in the proposed design.

### 10. Research progress differs between the CLI and website

The reviewed `progress.py 0` output reported 3,876 distinct catalog names, 2,765 matched catalog entries, 979 remaining, and 132 excluded. The web master-list helper returned 3,864 entries and 2,455 researched entries. These are different calculations, not counts of distinct verified game designs.

The web helper reads only the first four CSV columns and matches generated slugs, ignoring explicit `yaml_id` links, status, and alternate-name matching used elsewhere. An existing researched entry such as `1776` therefore appears unresearched on the website. See [progress.py](../scripts/progress.py) and `loadMasterList()` in [yaml-handler.js](../web/lib/yaml-handler.js).

The next version should report discovery, submitted, approved, and published progress separately using persistent identities.

### 11. Image association and provenance need explicit modeling

Upload in [server.js](../web/server.js) replaces punctuation with underscores, but lookup in [yaml-handler.js](../web/lib/yaml-handler.js) expects the unsanitized game title and year. This makes some uploaded images undiscoverable through ordinary lookup. Only nine game records were recognized as having images by the existing helper.

[images/sources.yaml](../images/sources.yaml) has a single entry with unset source URL, license, and date. This review did not establish distribution permissions for the remaining files. The new catalog should reference approved asset IDs explicitly and use placeholders when image evidence is incomplete.

### 12. Reproducibility and operational support are incomplete

No automated test suite or CI configuration was found. [scripts/requirements.txt](../scripts/requirements.txt) omits PyYAML despite several scripts importing it, and [.gitignore](../.gitignore) ignores the npm lockfile. There is no versioned dataset release mechanism. The current web application includes unauthenticated image uploads and should not be treated as the proposed reviewed contribution service.

## Verification record

- All game YAML files were inspected for parse errors, duplicate keys/IDs, field shapes, numeric ratings, vocabulary membership, and unresolved links.
- A fresh build in a temporary directory contained all 2,735 games and passed SQLite integrity checking.
- The partial-insertion failure was reproduced against an isolated synthetic dataset.
- Query helpers and Express route handlers confirmed the numeric-ID 404 and response-shape differences.
- No production service was deployed, and no game data or application code was changed during this review.

Temporary diagnostic scripts and raw output were written under `/tmp` during the session. This document preserves the findings needed for follow-up and does not depend on those temporary files. Future measurements should state their date and dataset revision rather than treating these counts as permanent.

The first implementation priority is the architecture's M1 contract/storage work and pilot fixtures covering these failures. See the [session handoff](session-handoff.md) for current working-tree state and next steps.
