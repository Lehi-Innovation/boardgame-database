# Local web interface

The current Express app provides a SQLite-backed game browser, an image manager, and a CSV catalog tracker. Product direction is maintained in [the brief](../docs/product-brief.md).

## Run

From the repository root, after Python dependency setup:

```bash
python3 scripts/build_db.py
cd web
npm ci
npm start
```

Use `npm run dev` from `web/`, or `bash server.sh` from the root, for nodemon. Start Node from `web/` because static assets use that working directory. See [development](../docs/development.md) for full setup.

## Pages

- [Games](http://localhost:3000/): card/table browsing, text and attribute filters, evokes, and game details.
- [Images](http://localhost:3000/images): box-art management and uploads.
- [Master list](http://localhost:3000/master-list): CSV catalog coverage with nomination enrichment.

Metadata editing, personal-rating entry, play logging, accounts, marketplace transactions, and community submissions are not implemented.

## API

| Method | Path | Current behavior |
| --- | --- | --- |
| GET | `/api/games/query` | SQLite filtered, sorted, paginated results |
| GET | `/api/filter-options` | SQLite filter choices |
| GET | `/api/evokes/counts` | SQLite evoke counts |
| GET | `/api/games` | Selected YAML fields and image status/URL |
| GET | `/api/games/:id` | Legacy selected YAML fields plus image URL |
| POST | `/api/games/:id/upload` | Multipart `image`; JPEG/PNG/WebP, up to 20 MiB |
| GET | `/api/images/:filename` | Local image |
| GET | `/api/master-list` | CSV catalog with research and nomination data |
| GET | `/api/health` | YAML-loader status and count |

The legacy YAML endpoints and SQLite query endpoint have different payloads. Some details expected by the UI are absent from the legacy selection. A healthy YAML response does not prove the SQLite database is loaded.

## Files and cache behavior

- [server.js](server.js): routes and uploads.
- [lib/db.js](lib/db.js): SQLite query layer using sql.js.
- [lib/yaml-handler.js](lib/yaml-handler.js): CSV/YAML readers and caches.
- [public/games.html](public/games.html), [public/images.html](public/images.html), [public/master-list.html](public/master-list.html): pages.
- [public/css/common.css](public/css/common.css), [public/js/](public/js/): shared presentation and interaction.

Rebuild `games.db` after YAML changes and restart the server. Restart after external CSV edits to refresh backlog caches. Uploads clear YAML caches; the SQLite layer's image-filename cache refreshes on a short timer.

Uploads retain the original bytes/extension and replace punctuation in the generated filename with underscores. Existing files with the same generated name can be overwritten. Lookups use original names, so punctuation remains a mismatch risk. The dedicated `fetch_image.py` tool uses canonical naming and records provenance; UI uploads do not. See [image guidance](../images/README.md).

The app has no authentication and is currently a local administration/browsing tool. See [status](../docs/status.md) for known issues and public-deployment work.
