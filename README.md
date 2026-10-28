# Board Game Database

An approachable board game catalog for discovering games that fit your people, time, and desired experience, including hidden gems. The intended product is a visual, mobile-first guide supported by curated community contributions.

The repository currently contains a CSV discovery catalog, detailed YAML records, a derived SQLite query store, research tools, and a local web interface. Public contribution workflows and personalized discovery are future work.

## Start here

| Question | Maintained reference |
| --- | --- |
| What are we building, and for whom? | [Product brief](docs/product-brief.md) |
| Where does each kind of file belong? | [Project organization](docs/organization.md) |
| How do I run and check the project? | [Development guide](docs/development.md) |
| How do I research or correct a game? | [Research workflow](docs/research.md) |
| What works, what needs attention, and what comes next? | [Project status](docs/status.md) |
| What fields and values are valid? | [Schema](schema.yaml) |
| What should a coding assistant read? | [Agent guidance](AGENTS.md) |

## Run locally

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r scripts/requirements.txt
python scripts/progress.py 0
python scripts/build_db.py
cd web
npm ci
npm start
```

Open [the game browser](http://localhost:3000/) or [the catalog backlog](http://localhost:3000/master-list). See the [development guide](docs/development.md) for prerequisites and the development launcher.

The web app is currently a local administration tool with unauthenticated image uploads. Public hosting needs a separate implementation and access-control review.

Run focused checks with `python -m unittest discover -s tests -v` and `python scripts/validate_catalog.py --only log`. The full read-only audit, `python scripts/validate_catalog.py --json`, reports existing catalog issues described in [project status](docs/status.md).

## Working data

- [games/](games/): current game records, one YAML file per game or edition.
- [master_list.csv](master_list.csv): canonical discovery catalog, research status, and YAML mappings.
- [sources/](sources/): nomination enrichment and research provenance.
- [images/](images/): box art and its provenance.
- [publishers.yaml](publishers.yaml): publisher asset/contact directory.
- [archive/](archive/README.md): historical material, excluded from the active catalog.

Use the progress tools for live counts. Source-list nominations are one discovery signal; they are not a requirement for inclusion or a measure of game quality.
