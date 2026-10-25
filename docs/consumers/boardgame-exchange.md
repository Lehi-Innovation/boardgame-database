# Django consumer: boardgame-exchange

The Django application in the sibling `../boardgame-exchange` checkout imports
the same [legacy name snapshot](../name-snapshot.md). Its collection search uses
local PostgreSQL games and aliases, with integer `Game.pk` values preserved.
The local names integration was verified September 20, 2026; the dated evidence
is in the [session log](../archive/2026-09/session-handoff.md). The React prototype
was outside this connection.

## Refresh the local names

Run `npm run export:names` in this repo. In Exchange, import the printed
`snapshot.json` after reviewing a dry run:

```sh
.venv/bin/python manage.py import_catalog_names /path/to/snapshot.json --dry-run
.venv/bin/python manage.py import_catalog_names /path/to/snapshot.json
```

The adjacent `snapshot.sha256` is used by default. Existing same-title games
require an explicit source-ID-to-local-PK mapping. The importer validates the
bundle before a serialized transaction and leaves the previous dataset intact
on failure. Missing source rows do not delete games or copies. Its local
setup, reconciliation, and browser verification are documented in
`../boardgame-exchange/docs/CATALOG_INTEGRATION.md` in the sibling checkout.
This sync is enabled for local development, not production.

## Later reviewed catalog and covers

Legacy source IDs are not reviewed game or edition UUIDs. The optional
[cover feed](../cover-images.md) requires an explicit canonical-to-local
crosswalk, reviewed usage terms, attribution, and withdrawal handling.
Stock-cover display has not been added to Exchange's names-only adapter.
Physical copies and seller photos remain Exchange-owned records.
