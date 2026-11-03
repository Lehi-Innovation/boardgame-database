# Local web interface

The current Express app provides a SQLite-backed game browser, an image manager, a CSV catalog tracker, and a local contribution inbox. Product direction is maintained in [the brief](../docs/product-brief.md).

## Run

From the repository root, after Python dependency setup:

```bash
python3 scripts/build_db.py
cd web
npm ci
npm start
```

Use `npm run dev` from `web/`, or `bash server.sh` from the root, for nodemon. Static assets resolve from the application directory; the server binds to loopback. See [development](../docs/development.md) for full setup.

## Pages

- [Games](http://localhost:3000/): card/table browsing, text and attribute filters, evokes, and game details.
- [Images](http://localhost:3000/images): box-art management and uploads.
- [Master list](http://localhost:3000/master-list): CSV catalog coverage with nomination enrichment.

Missing-game suggestions and corrections are saved for review at `/contribute`; the local review CLI preserves decision history. See [contributions](../docs/contributions.md). Metadata editing, personal-rating entry, play logging, public accounts, and marketplace transactions are not implemented.

## API

| Method | Path | Current behavior |
| --- | --- | --- |
| GET | `/api/games/query` | SQLite filtered, sorted, paginated results |
| GET | `/api/filter-options` | SQLite filter choices |
| GET | `/api/evokes/counts` | SQLite evoke counts |
| GET | `/api/games` | Complete YAML record and image status/URL |
| GET | `/api/games/:id` | Complete YAML record and image status/URL |
| POST | `/api/games/:id/upload` | Multipart `image`; JPEG/PNG/WebP, up to 20 MiB |
| GET | `/api/images/:filename` | Local image |
| GET | `/api/master-list` | Shared edition-aware catalog snapshot, including exclusions and source row numbers |
| GET | `/api/schema.js` | Schema-derived categories, evokes, and rating labels for all pages |
| POST | `/api/contributions` | Save a JSON suggestion/correction as pending; never edits catalog records |
| GET | `/api/health` | YAML and SQLite availability/counts (503 if database absent) |

YAML and SQLite return the same complete payload after a rebuild. Singular `designer`/`publisher`/`artist` names and plural query aliases are included, along with relationships, upgrades, and recorded play history. Missing legacy play history stays unknown.

## Files and cache behavior

- [server.js](server.js): routes and uploads.
- [lib/db.js](lib/db.js): SQLite query layer using sql.js.
- [lib/yaml-handler.js](lib/yaml-handler.js): YAML reader/cache and catalog-snapshot adapter.
- [public/games.html](public/games.html), [public/images.html](public/images.html), [public/master-list.html](public/master-list.html): pages.
- [public/css/common.css](public/css/common.css), [public/js/](public/js/): shared presentation and interaction.

Rebuild `games.db` after YAML or CSV changes. The server detects the atomic replacement without a restart; YAML reads detect file edits. Schema presentation changes require a restart. Failed database builds preserve the previous cache.

Uploads preserve punctuation/Unicode in canonical name/year filenames, validate the actual image encoding, and record unverified provenance with dimensions. The decoded encoding determines the saved extension. Previous provenance is retained in history on replacement. Both query and YAML image lookups refresh immediately. Existing same-name art can be replaced by an explicit upload; use fixtures for tests.

The app rejects cross-origin writes and binds to `127.0.0.1`. It remains a local administration tool without public authentication. See [status](../docs/status.md) for unresolved identity, evidence, and deployment work.
