# Quality control review — September 26, 2026

> Archived pre-repair review. The two high-priority SQLite findings were fixed;
> see the [repair record](legacy-database-quality-handoff.md) and current
> [legacy app guide](../../legacy-app.md).

## Scope

Reviewed the current working tree without changing application code or source data. The tree already contained substantial uncommitted work. Checks covered TypeScript, unit and database tests, generated contracts, a production build, local Supabase Auth/Data API behavior, editorial HTTP and browser flows, the legacy YAML/SQLite inventory, the names export, and the cover inventory. This was a structural and workflow review, not independent verification of every game fact or image permission.

## Verification

| Check | Result |
| --- | --- |
| TypeScript and Next.js type generation | Passed |
| Unit tests | 44 passed |
| OpenAPI, names, and covers generated-artifact checks | Passed |
| Disposable database tests | 31 passed on native PostgreSQL 14.24; all four migrations applied |
| Supabase database advisors and disposable tests | No advisor issues; 31 tests passed on local PostgreSQL 17.6 |
| Production Next.js build | Passed |
| Local Supabase smoke checks | Passed on PostgreSQL 17.6: migration history, Auth, session revocation, and internal-schema isolation |
| Editorial HTTP and browser checks | Passed using installed Google Chrome: intake, ownership, review, corrections, mobile layout, session lifecycle, and cleanup |
| SQLite integrity | `ok` for the existing `games.db` |
| Full legacy names export | Passed: 4,013 source files, 4,011 records, 1,294 aliases, two deferred records, and 19 omitted aliases |
| Python/Ruby name compatibility fixture | Not completed locally: pinned Python packages and `json_schemer` are absent; Python package installation was blocked by network access. The workflow installs them in CI. |

The initial `npm run check` reached its database phase after passing its other gates, then the sandbox denied `pg_config` with `EPERM`. Re-running `npm run test:db` with process access passed. The first browser attempt lacked Playwright's pinned Chromium binary; rerunning with `PLAYWRIGHT_CHANNEL=chrome` passed.

## Findings

### High — legacy browser reads a stale derived database

The current `games/` directory contains **4,013** parseable YAML records with unique IDs. The ignored local `games.db` contains **2,735** rows: **1,280** current IDs are absent and two removed IDs (`andor`, `settlers-of-catan`) remain. The legacy query layer loads this file once at startup (`web/lib/db.js`), so the SQLite-backed query and filter endpoints do not reflect the current YAML catalog. The separate detail endpoint reads YAML. The file passes SQLite integrity, which does not detect source drift.

**Action:** make the legacy database build atomic and reject a build unless source membership and row counts match. Rebuild the local derived file after that fix, and check its source revision or digest when the legacy server starts. The existing `reopenDb()` helper also needs a caller if live rebuilds are supported.

### High — the legacy builder can publish a partial success

`scripts/build_db.py` deletes the previous database before the new build, catches individual insertion errors, commits remaining rows, and prints a successful summary. This behavior was reproduced in the [September 18 review](project-review.md) and is still present in the code. A malformed record can therefore leave a partial database while the command exits successfully.

**Action:** build to a temporary file, fail on any record error, check integrity and source membership, then replace `games.db` only after a complete build.

### Release gate — pilot covers are not ready for publication

`npm run audit:covers` found 20 marketplace candidates, four matching legacy image files, zero entries with complete legacy provenance, and **20 unresolved edition IDs**. The reviewed cover pipeline and its tests pass, but these inputs cannot satisfy the documented requirement for an eligible, edition-linked cover for every image-enabled launch game. This is planned acquisition/review work rather than a failed code check.

**Action:** resolve edition identities, verify source and usage terms, prepare assets, and review them before enabling the image launch gate. Keep names-only consumers independent during that work.

### Medium — legacy YAML and provenance issues remain

Six YAML records still have numeric `id` values, including `007`, which parses as `7`. The legacy YAML detail lookup compares the route's string ID with `g.id` using strict equality (`web/lib/yaml-handler.js`), so those records remain inaccessible by their expected URL. `sources/research-log.yaml` still fails YAML parsing. These are existing findings from the [September 18 review](project-review.md); the new names export uses filename-based string identities and does not inherit that ID loss.

**Action:** preserve lexical IDs in the legacy detail lookup or migrate it to filename-based identity. Repair or archive the research log before treating it as a machine-readable provenance source.

## Limits and next gate

The checks did not verify the truth of all 4,013 game records, legal permission for any image, hosted deployment, release publishing, or downstream consumer behavior. The Python/Ruby compatibility fixture still needs an environment with its pinned dependencies. The new reviewed release remains a later milestone; a passing editorial workflow does not imply a publishable catalog release.
