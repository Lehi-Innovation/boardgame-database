# Development

## Setup

Use Python 3.10 or newer and a supported Node.js release with npm. The repository does not yet declare a tested Node version range.

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

Open [localhost:3000](http://localhost:3000/). Start Node from `web/`: static file serving depends on that working directory. Use `npm run dev` there, or `bash server.sh` from the root, for automatic restarts. Set `PORT=3001` before `npm start` to choose another port.

Stop your server with Ctrl+C. Identify an occupied port's process before stopping it.

## Data flow

- [../master_list.csv](../master_list.csv) is the canonical discovery catalog and research queue. Its status and `yaml_id` columns track exclusions and links to researched records.
- [../games/](../games/) contains the authoritative detailed game metadata.
- `python scripts/build_db.py` rebuilds the ignored `games.db` SQLite read cache from YAML. Rebuild after adding or changing game records, then restart the server to reload it. Never edit the derived database as the source of truth.
- `web/lib/db.js` uses sql.js for filtered/paginated queries. `web/lib/yaml-handler.js` serves legacy game/image endpoints and CSV backlog data. These paths have different payloads and caches.
- Source lists enrich the CSV queue with nominations. They do not define its total universe.
- The research pipeline caches downloaded HTML in ignored `pipeline_cache.db` and returns extracted text for a researcher to interpret.

The frontend consists of three static HTML pages with shared CSS/JavaScript. There is no frontend build, hosted database service, or linter. Focused Python regression tests and GitHub Actions cover provenance tooling and validation; see the checks below. See [the web reference](../web/README.md) for routes.

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
| `validate_catalog.py` | Read-only checks of schema vocabulary, record IDs/types/counts, explicit CSV mappings, and research-log structure |
| `compare_bga.py`, `compare_sources.py`, `retailer_check.py` | Compare embedded platform/retailer snapshots with catalog coverage |
| `scrape_wikidata.py` | Existing discovery importer; see the CSV compatibility issue in [status](status.md) before fetching |

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

`validate_catalog.py` reads `schema.yaml` for rating/tag/player-count vocabulary. The full audit checks all game files, explicit CSV mappings, and the research log. Use `--games FILE...` to check selected records, `--only log` for provenance, or `--json` for a complete machine-readable report. Paths passed to `--games` are relative to your current directory; default repository paths are resolved from the script. `--root PATH` supports audits of fixture repositories. Exit status is 1 for errors and 0 when only warnings remain.

The full catalog audit currently fails on existing data issues; see [status.md](status.md) for the dated baseline. Historical research-log IDs without current files are warnings and are not rewritten. Missing optional legacy fields are accepted. The audit checks structure and explicit references; it does not infer equivalent editions, reconcile Python/web name matching, certify facts, or check image permissions.

[GitHub Actions](../.github/workflows/checks.yml) runs the regression suite and research-log audit on pushes and pull requests. The full catalog audit is deliberately not a passing CI claim while known data debt remains. CI has been configured locally; a hosted run is confirmed only by its actual results.

After data changes, rebuild `games.db` and inspect builder output for skipped/error records. Test both the SQLite query routes and legacy YAML routes when relevant: a healthy YAML endpoint alone does not verify the browser's query store.

For upload changes, use temporary fixtures and preserve existing art. The image checker reports filenames, not permissions.

## Dependencies

Python dependencies live in [../scripts/requirements.txt](../scripts/requirements.txt). Node dependencies and the lockfile live in [../web/](../web/). Use `npm ci` for reproducible installs and update the lockfile with intentional dependency changes.

Keep caches, SQLite sidecars, virtual environments, and bytecode out of commits. Update [organization.md](organization.md) when adding or moving entry points.
