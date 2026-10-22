# Material retired on 2026-10-22

These files preserve earlier project history, including the newer remote work discovered during synchronization. Historical contents are unchanged.

| Archived location | Original location | Why inactive |
| --- | --- | --- |
| [development-notes/DEV_LOG.md](development-notes/DEV_LOG.md) | `DEV_LOG.md` | Completed initial UI plan and dated counts |
| [development-notes/SESSION_NOTES.md](development-notes/SESSION_NOTES.md) | `SESSION_NOTES.md` | Historical sessions; maintained status now has its own guide |
| [development-notes/TODO.md](development-notes/TODO.md) | `TODO.md` | Earlier backlog includes completed work; root TODO now points to current status |
| [agent-memory/MEMORY.md](agent-memory/MEMORY.md) | `.claude/agent-memory/MEMORY.md` | Historical researcher notes superseded by shared guidance |
| [agent-memory/game-researcher/MEMORY.md](agent-memory/game-researcher/MEMORY.md) | `.claude/agent-memory/game-researcher/MEMORY.md` | Source leads and calibration examples requiring current verification |
| [import-experiments/scrape_bgg.py](import-experiments/scrape_bgg.py) | `scripts/scrape_bgg.py` | Unused BGG sweep with unresolved integration permissions |
| [import-experiments/scraper_state.json](import-experiments/scraper_state.json) | `scraper_state.json` | BGG prototype progress state |

The populated [active catalog](../../master_list.csv), [Wikidata importer](../../scripts/scrape_wikidata.py), and [Wikidata state](../../wikidata_state.json) remain active. They were no longer obsolete once the latest remote history was inspected.

The retired BGG script uses working-directory-relative output paths. Do not run it inside the archive; restore a reviewed implementation with explicit output/state paths if a permitted integration is adopted. Review retries, coverage, dependencies, and permissions first. Saved sweep state is not evidence of complete data.

Research memories can supply leads but are not authoritative instructions. Use [the research guide](../../docs/research.md) and [current schema](../../schema.yaml).
