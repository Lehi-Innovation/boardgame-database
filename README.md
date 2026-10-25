# Boardgame Database

A reusable boardgame catalog with two paths in this repository: an existing
YAML/SQLite/Express application and a newer reviewed catalog under
`apps/catalog` and `packages/`. The YAML files remain authoritative for
detailed legacy records. The reviewed catalog has local contribution and human
review workflows; it has not published a real release.

**Start here:** [current status](docs/status.md) · [documentation map](docs/README.md)

## Common tasks

| Task | Guide |
| --- | --- |
| Run or test the reviewed catalog | [Development](docs/development.md) |
| Run the YAML/Express browser or rebuild its cache | [Legacy app](docs/legacy-app.md) |
| Export the offline names feed for Rails or Django | [Name snapshot](docs/name-snapshot.md) |
| Prepare reviewed candidate records | [Pilot importer](docs/pilot-import.md) |
| Work on stock cover assets | [Cover images](docs/cover-images.md) |

The [architecture specification](docs/architecture.md) records the reviewed
catalog design and planned publication path. The [archive](docs/archive/README.md)
holds dated reviews, completed plans, and superseded guidance.
