# Boardgame Database

A curated boardgame catalog intended for reuse in other applications.

The current implementation stores detailed records in `games/*.yaml`, builds a derived SQLite database with `scripts/build_db.py`, and provides an Express browsing and image-management interface in `web/`. `master_list.csv` tracks discovery and research work.

## Architecture proposal

The [architecture specification](docs/architecture.md) describes the next version: a PostgreSQL catalog with reviewed contributions, immutable releases, a cached API, and SQLite/JSON downloads. It includes the data model, approval rules, migration plan, and acceptance criteria for a roughly 50-game pilot.

M1's foundation and M2's local contribution workflow are implemented alongside the legacy application: shared contracts, graph validation, SQL migrations, Supabase sign-in, contribution forms, and transactional maintainer review. Imports, publication, and production migration remain future milestones. See the [editorial API guide](docs/editorial-api.md) for the implemented boundaries.

See the [development guide](docs/development.md) for installation, local Supabase setup, accounts, and verification. From the root, run `npm ci`, `npm run check`, and `npm run dev` (the new application uses port 3100). The legacy application still runs from `web/`.

## Project references

- [Local demo walkthrough](docs/demo.md): a fictional game, contributor/maintainer review, and manual test suggestions.
- [Session handoff](docs/session-handoff.md): confirmed requirements, current state, open decisions, and next steps.
- [Existing project review](docs/project-review.md): measured data quality and implementation findings.
- [M1 identity rules](docs/decisions/001-catalog-identity.md): concrete fixtures and approved game/edition boundaries.
- [Current field definitions](schema.yaml)
- [Legacy documentation](docs/legacy/README.md): previous workflows, application guides, development logs, and backlog.

The current YAML catalog remains authoritative for detailed records until an explicit migration cutover.
