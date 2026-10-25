# Legacy YAML and Express application

Use this guide when working on the original YAML catalog or running its Express
browser. The new reviewed catalog has a separate [development guide](development.md).

`games/*.yaml` is the detailed-data source. `games.db` is a local, ignored read
cache used by `/api/games/query`, `/api/filter-options`, and
`/api/evokes/counts`. The `/api/games` and `/api/games/:id` routes use a separate
in-memory YAML cache. Editing YAML does not refresh either running cache.
See [schema.yaml](../schema.yaml) for legacy field definitions;
[master_list.csv](../master_list.csv) tracks discovery and research progress.

## Build and run

From the repository root, with Python 3 and PyYAML installed:

```sh
python3 scripts/build_db.py
```

Start the separate web package:

```sh
cd web
npm ci
npm start
```

The web application listens only on `127.0.0.1`, on port 3000 by default. Open
`http://127.0.0.1:3000` or `http://localhost:3000` on the same computer. This is
a private local tool: LAN access and reverse-proxy hosting are unsupported.
Requests using other Host values or foreign browser origins are rejected, and
uploads require the exact same Origin as the page. The browser image manager
supplies this automatically; command-line uploads must explicitly send that
Origin. This protects against cross-site requests and DNS rebinding; it does
not authenticate other processes or users on the same computer.

Uploads accept one JPEG, PNG, or WebP file, with a 20 MiB input/output limit and
a 40-million-pixel decoding limit. The server rejects animated or mismatched
formats, strips metadata by decoding and re-encoding pixels, and replaces files
atomically. Uploads are limited to two concurrent requests and ten attempts per
minute. Image reads reject traversal, symlinks, and non-image filenames.

Run the HTTP and file-serving security regression tests from `web/` with
`npm test` (Node 24). Tests use a temporary image directory and synthetic game;
they do not modify the real catalog or covers. From the repository root,
`npm run test:legacy` runs the same tests. CI runs these tests and audits the
dependencies. `npm run dev` uses Node's built-in watch mode. Dependency versions
and `web/package-lock.json` are included in version control; use `npm ci` for a
reproducible installation.

After any YAML change, rebuild `games.db` and **restart the Express process**.
Startup refuses a
missing, corrupt, or stale database and prints the rebuild command. There is no
automatic reload of the SQLite or YAML in-memory caches.

The builder reads all top-level `.yaml` entries in UTF-8 filename order,
validates the complete result, records a source count and digest, then replaces
the old database atomically. A failed build leaves the old file intact. For
isolated diagnostics, use `--source-dir DIR --destination PATH`; never use the
working `games.db` as a test fixture. From the repository root, run the
regression suite, which uses temporary directories:

```sh
python3 -m unittest discover -s tests -p test_legacy_db.py -v
```

The September 26 rebuild and endpoint results are in the
[archived quality handoff](archive/2026-09/legacy-database-quality-handoff.md).
That review also records a separate numeric-YAML-ID detail-route issue; the
cache repair did not change legacy identity conversion. The old
[legacy guides](legacy/README.md) describe earlier workflows and may contain
historical counts or superseded instructions.
