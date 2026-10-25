# Legacy database quality handoff

> Archived repair plan and verification record. The work below is complete;
> use the [legacy app guide](../../legacy-app.md) for current operation.

## Objective and baseline

Resolve the two high priority findings in the [September 26 quality control review](quality-control-2026-09-26.md): the local SQLite read cache is stale, and its builder can replace a good database with a partial build while reporting success.

YAML under `games/` remains authoritative. The legacy Express server uses `games.db` for `/api/games/query`, `/api/filter-options`, and `/api/evokes/counts`; `/api/games` and `/api/games/:id` read YAML through a separate cache. The September 26 local snapshot had 4,013 YAML records and 2,735 SQLite rows: 1,280 current IDs missing from SQLite and two removed IDs still present. These counts describe that snapshot and must not be hard-coded as success criteria.

Work is on a dirty tree. Preserve existing edits and ignored local files. Do not run the current `scripts/build_db.py` against the working `games.db` before changing it: the existing script deletes the destination first.

## Implementation sequence

1. **Make inputs and output testable.** Refactor `scripts/build_db.py` so the build function accepts a source directory and destination path. Keep the default command using `games/` and `games.db`. Enumerate every `*.yaml` file in a stable order, read its exact bytes once, and fail with a filename and nonzero exit on parse errors, missing or unusable required fields, duplicate IDs, or insertion errors. Do not silently skip a YAML file. Preserve the current SQLite identity conversion for this scoped fix; the six numeric YAML IDs, including `007`, have a separate legacy lookup issue.
2. **Stage a complete database beside the destination.** Create a uniquely named temporary SQLite file in the destination directory, so the final replace stays on one filesystem. Build all tables there. Do not catch an insertion error and continue. Close the connection after a successful commit, ensure any SQLite journal/WAL content is checkpointed into the main file or use a single-file journal mode, and clean up all temporary files on failure. Never delete or truncate the existing destination before validation.
3. **Validate the staged database.** Require `PRAGMA integrity_check` to return `ok` and `PRAGMA foreign_key_check` to return no rows. Compare the complete set of staged `games.id` values with the IDs derived from the input snapshot, not only the row count. Check that every input file contributed exactly one row and that no child row refers to a missing game. A failed check must exit nonzero, identify the problem, and leave the destination byte-for-byte unchanged.
4. **Record and verify source freshness.** Add a small metadata table containing the source file count, digest format version, and a SHA-256 digest of the exact YAML input set. Define one canonical digest format used by Python and JavaScript: sort relative filenames by UTF-8 bytes, then hash for each file its UTF-8 filename, one NUL byte, and the raw 32-byte SHA-256 digest of its file bytes. Recompute the source digest before promotion; if files changed during the build, abort. Serialize concurrent promotions so an older build cannot replace a newer one. After all checks, use an atomic same-directory `os.replace` to publish the staged file.
5. **Fail closed on a stale or missing cache.** Update `web/lib/db.js` initialization to read the metadata and recompute the same digest from `games/*.yaml` before serving SQLite queries. Missing database, missing/unknown metadata format, count mismatch, digest mismatch, or a corrupt database must raise an actionable error rather than return `null` and let the server start. `web/server.js` already has a startup `.catch` that exits nonzero; keep that behavior and include the rebuild command in the error. A running server holds an in-memory `sql.js` snapshot, so document that rebuilding requires a server restart. If live reload is added, call `reopenDb()` and clear the separate YAML cache deliberately; do not imply that file replacement updates either cache automatically.
6. **Rebuild only after the safety changes pass.** Keep a copy of the existing ignored `games.db` outside the destination, run the new builder on the real YAML directory, and restart the legacy server. Do not change the YAML catalog or the reviewed PostgreSQL/Supabase path as part of this repair.

## Tests to add

Use temporary source and destination directories; never use the working `games.db` as a test fixture.

- **Success:** a small valid fixture produces the exact expected IDs and child rows, passes integrity/foreign-key checks, stores the source digest, and can be opened by the legacy query layer. A repeat build replaces the cache safely.
- **Partial-write regression:** start with a known-good destination, then introduce a syntactically valid YAML record whose nested value fails during SQLite insertion (the prior review used invalid `upgrade.name`). Assert a nonzero build exit, an informative filename/error, unchanged destination checksum, and no promoted partial rows or leftover staging files.
- **Other failures:** malformed YAML, missing ID, duplicate ID, missing name, changed source bytes during build, and failed integrity/membership checks all preserve the existing database and fail nonzero.
- **Freshness:** the legacy server starts with a matching cache. Add or edit a YAML file without rebuilding; a new server process must refuse to start and must not serve a `200` query with stale results. After a successful rebuild and restart, queries reflect the added/edited file and removed IDs are absent.
- **Full dataset:** compare the rebuilt SQLite ID set and row count against the current parsed YAML input set; verify the two previously removed IDs are absent, then exercise `/api/games/query`, `/api/filter-options`, and `/api/evokes/counts`. Do not assert the historical count of 4,013 in code.

## Completion criteria

The repair is complete when a failed build cannot change the prior database, a successful build publishes one validated complete file, the legacy server refuses a stale cache at startup, and a rebuilt local cache matches the current YAML membership. Record actual counts, test results, and any remaining runtime reload limitation in the handoff or quality control report. Keep the separate numeric-ID detail-route and malformed research-log findings outside this two-issue scope.

## Cache operation

From the repository root, run `python3 scripts/build_db.py` after changing any
`games/*.yaml` file, then restart the legacy Express server. The builder stages
and validates a complete SQLite file before publishing it. At startup, the
server compares the cache's source count and versioned SHA-256 digest with the
current YAML bytes and exits with a rebuild instruction if they differ. The
digest's version 1 input is each top-level `.yaml` filename in UTF-8 byte order,
followed by a NUL byte and the raw SHA-256 digest of that file's bytes.

The running server holds a `sql.js` copy of `games.db` in memory, and the YAML
routes keep their own cache. Replacing the file does not refresh either copy;
restart the server after every rebuild.

## Verification on September 26, 2026

- The new builder rebuilt the local ignored `games.db` from 4,013 YAML files.
  The resulting `games` table has 4,013 rows, with no missing or extra IDs
  compared with the current parsed YAML set. The formerly removed `andor` and
  `settlers-of-catan` IDs are absent.
- The stored format version is 1, the stored source count is 4,013, and the
  stored digest matches an independent recomputation. SQLite reported
  `integrity_check = ok` and no foreign-key violations.
- `python3 -m unittest discover -s tests -p test_legacy_db.py -v` passed all
  nine tests with loopback access, including failed-build preservation, source
  drift, and stale-startup HTTP checks. A fresh legacy server process returned
  HTTP 200 from `/api/games/query`, `/api/filter-options`, and
  `/api/evokes/counts`; the query endpoint reported 4,013 games.
- A copy of the previous local cache was saved at
  `/tmp/boardgame-legacy-db-backup.OJh1sO/games.db` before replacement.
  There was no persistent legacy server process to restart. The verification
  process started from the rebuilt cache and was stopped afterward.
