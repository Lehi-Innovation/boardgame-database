# Development

## Setup

Use Python 3.10 or newer and a supported Node.js release with npm. Node 24.13.1 was tested locally on 2026-11-01; CI uses Node 24.

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r scripts/requirements.txt
python scripts/build_db.py
cd web
npm ci
npm start
```

Open [localhost:3000](http://localhost:3000/). The app binds to `127.0.0.1`; static paths are resolved from the application directory. Use `npm run dev` there, or `bash server.sh` from the root, for automatic restarts. Set `PORT=3001` before `npm start` to choose another port.

Stop your server with Ctrl+C. Identify an occupied port's process before stopping it.

## Data flow

- [../master_list.csv](../master_list.csv) is the canonical discovery catalog and research queue. Its status and `yaml_id` columns track exclusions and links to researched records.
- [../games/](../games/) contains the authoritative detailed game metadata.
- `python scripts/build_db.py` rebuilds the ignored `games.db` SQLite read cache from YAML. Rebuild after game or CSV changes. Rebuilds publish atomically, and the server detects database replacement without a restart. A failed build preserves the previous cache. Never edit the derived database as the source of truth.
- `web/lib/db.js` uses sql.js for filtered/paginated queries. `web/lib/yaml-handler.js` serves legacy game/image endpoints and CSV backlog data. Both paths return the complete record through a shared payload adapter, including singular metadata names and plural compatibility aliases. YAML edits invalidate its cache; SQLite changes become visible after rebuilding.
- Source lists enrich the CSV queue with nominations. They do not define its total universe.
- The research pipeline caches downloaded HTML in ignored `pipeline_cache.db` and returns extracted text for a researcher to interpret.

The frontend consists of four static HTML pages with shared CSS/JavaScript. There is no frontend build, hosted database service, or linter. Python regressions and isolated real-server tests cover catalog identity, provenance, import pagination, payload parity, uploads, and contribution review; see the checks below. See [the web reference](../web/README.md) for routes.

## Tools

| Script | Purpose |
| --- | --- |
| `progress.py` | CSV catalog coverage; optional count or status filter |
| `update_master_status.py` | Update CSV status, notes, or YAML mapping; inspect `--backfill --dry-run` before applying inferred matches |
| `build_db.py` | Rebuild the SQLite read cache |
| `image_manager.py` | Report image coverage and filename issues |
| `fetch_image.py` | Download, validate, and record provenance for an image; see [image guidance](../images/README.md) |
| `normalize_publishers.py` | Normalize publisher names; preview with `--dry-run` |
| `game_pipeline.py`, `html_preprocessor.py` | Fetch/cache/extract source text |
| `research_log.py` | Validate and atomically append a JSON list of consulted evidence; invoke as `python -m scripts.research_log --from-json FILE` |
| `catalog.py` | Shared edition-aware identity resolver and JSON coverage snapshot |
| `reconcile_records.py` | Reviewed 2026-11-01 repairs; run as `python -m scripts.reconcile_records` to preview |
| `image_assets.py` | Shared naming and locked atomic image-provenance writes |
| `contributions.py` | Local suggestion inbox and versioned review history; see [contributions](contributions.md) |
| `validate_catalog.py` | Read-only checks of schema vocabulary, record IDs/types/counts, explicit CSV mappings, and research-log structure |
| `compare_bga.py`, `compare_sources.py`, `retailer_check.py` | Compare embedded platform/retailer snapshots with catalog coverage |
| `scrape_wikidata.py` | Seven-column, atomic, replay-safe discovery import; completion uses raw binding counts; `--restart` replays old pagination without deleting records |

Comparison scripts contain dated source snapshots; their output is not a current live inventory. Review matching and proposed changes before updating catalog data. The BGG sweep prototype is [archived](../archive/2026-10-22/README.md).

## Checks

From the root, with dependencies installed:

```bash
python -m unittest discover -s tests -v
python scripts/validate_catalog.py --only log
python scripts/validate_catalog.py --games games/azul.yaml
python scripts/validate_catalog.py --json
python scripts/progress.py 0
python scripts/image_manager.py check
python scripts/game_pipeline.py --help
node --check web/server.js
node --check web/lib/db.js
node --check web/lib/yaml-handler.js
git diff --check
```

The regression suite uses temporary files and spawned processes to exercise quoted/multiline text, duplicate keys, failed replacements, locking, concurrent writes, pipeline error reporting, and schema-driven record checks. It does not fetch sources or modify the real log, catalog, or caches.

`validate_catalog.py` reads `schema.yaml` for rating/tag/player-count vocabulary. The schema also defines the three provisional experience shortcuts; supported-count and suggested-count filters are separate. The full audit checks all game files, explicit CSV mappings, and the research log. Use `--games FILE...` to check selected records, `--only log` for provenance, or `--json` for a complete machine-readable report. Paths passed to `--games` are relative to your current directory; default repository paths are resolved from the script. `--root PATH` supports audits of fixture repositories. Exit status is 1 for errors and 0 when only warnings remain.

The full catalog audit passes after the 2026-11-01 repairs; see [status.md](status.md) for measured counts. Reviewed historical IDs are linked through `sources/game-aliases.yaml`; unmapped IDs still produce warnings and the original log is never rewritten. Missing optional legacy fields are accepted. The audit checks structure and explicit references; it does not infer equivalent editions, reconcile Python/web name matching, certify facts, or check image permissions. Exact positive player counts above twelve are supported; the legacy `12+` label does not cap group size.

[GitHub Actions](../.github/workflows/checks.yml) installs Python and web dependencies, runs the regression suite (including isolated HTTP/upload tests), the full structural audit, and an atomic database rebuild. The expanded workflow passed for draft PR #9 at `2d7b614` on hosted run [41539378136](https://github.com/Lehi-Innovation/boardgame-database/actions/runs/41539378136), including the full audit and SQLite rebuild. Check subsequent PR heads separately; a previous pass does not validate later commits.

After data changes, rebuild `games.db` and inspect builder output for skipped/error records. Test both the SQLite query routes and legacy YAML routes when relevant: a healthy YAML endpoint alone does not verify the browser's query store.

Optional real-browser checks use Playwright/Chromium: install `playwright` and run `python -m playwright install chromium`, then `python -m tests.browser_smoke`. They run four pages and correction submission at phone/tablet/desktop widths using a temporary two-game repository, and print screenshot locations. They are not user usability validation.

For upload changes, use temporary fixtures and preserve existing art. The image checker reports filenames, not permissions.

## Dependencies

Python dependencies live in [../scripts/requirements.txt](../scripts/requirements.txt). Node dependencies and the lockfile live in [../web/](../web/). Use `npm ci` for reproducible installs and update the lockfile with intentional dependency changes.

Keep caches, SQLite sidecars, virtual environments, and bytecode out of commits. Update [organization.md](organization.md) when adding or moving entry points.
