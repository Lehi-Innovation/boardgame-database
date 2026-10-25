# Legacy name snapshot

Consumers needing artwork can separately adopt the [cover feed](cover-images.md).
The names contract and its lightweight export remain unchanged. The image feed
uses reviewed canonical identities; existing legacy source IDs need an explicit
crosswalk before consumer adoption.

`npm run export:names` builds a local, framework-neutral reference feed from
`games/*.yaml`. It needs Node 24 and the root dependencies; no catalog server,
Supabase, external data source, or working `games.db` is involved. The YAML and
reserved pilot UUIDs remain unchanged. These names have legacy provenance and
are not approved catalog revisions or claims about a particular physical edition.

The command prints the immutable output directory, checksum, and counts. Use
`npm run export:names -- --out /path/to/output` to choose another directory.
It stages `snapshot.json`, `snapshot.sha256`, and `report.json` together and
renames the directory atomically. An identical repeat verifies the existing
bundle; conflicting contents fail without replacing it. A failed export leaves
previous bundles available. Consumers explicitly choose which bundle to sync.

## Contract

The [standalone JSON Schema](contracts/name-snapshot.schema.json) uses JSON Schema
2020-12. It can be consumed without TypeScript, Zod, an SDK, or an ORM. The
[shared fixture](../tests/fixtures/name-snapshot/snapshot.json) is synthetic.
All fields below are required in schema 1.0; nullable values are explicit `null`.

| Field | Type and meaning |
| --- | --- |
| `schema_version` | String `1.0`; readers reject unsupported major versions before writing |
| `dataset_version` | Opaque string `sha256:` plus 64 lowercase hex digits; identity of this complete generated dataset |
| `source.kind` | String `legacy_yaml` |
| `source.commit` | 40-character Git HEAD hash at export time; individual byte hashes describe the actual working files, including uncommitted edits |
| `source.files_sha256` | SHA-256 of sorted source path/hash pairs, including deferred records |
| `counts` | Nonnegative integers `source_files`, `records`, `aliases`, `deferred_records`, `omitted_aliases` |
| `records` | Array of record objects, sorted by source filename |
| `records[].source_id` | Opaque string `legacy_yaml:` plus percent-encoded filename stem; `legacy_yaml:007` remains a string |
| `records[].title` | Preserved nonempty primary name string |
| `records[].aliases` | Array of nonempty strings; `[]` means no recorded search aliases |
| `records[].disambiguation` | String or `null`; distinct legacy years label colliding names, explicitly as legacy data |
| `records[].source_file` | Relative string such as `games/007.yaml`; provenance, never a path to open in a consumer |
| `records[].source_sha256` | SHA-256 of that file's exact bytes |

Names and aliases preserve Unicode and lexical numeric strings. Source keys have
no Rails/Django primary-key meaning. `metsämies.yaml`, for example, uses
`legacy_yaml:mets%C3%A4mies`. Filename changes require explicit identity
reconciliation in a consumer; do not rename files as a way to rename games.
The current adapters refuse to reassign an existing source key to another game.
A reviewed crosswalk for filename renames or later canonical UUIDs is separate
work; never silently merge on a title or external ID.

Readers accept additive, optional fields within major version 1 and ignore fields
they do not use. Removing/changing a required field or changing its semantics
requires a new major version. Missing metadata means unknown, not zero: this feed
does not supply publisher, player counts, duration, images, or ratings. An adapter
must preserve richer existing local metadata. Missing rows never imply deletion.

`snapshot.sha256` contains `<64 lowercase hex digits>  snapshot.json\n`. Hash the
**exact UTF-8 artifact bytes**, not a JSON reserialization. This verifies file
integrity, not authorship or editorial approval. `dataset_version` is an opaque
producer fingerprint, not a second checksum consumers need to recreate.

For reproducibility, the producer hashes pretty JSON (two-space indentation and
a trailing LF) of ordered `schema_version`, `source`, `counts`, and `records`,
then inserts `dataset_version` after `schema_version`. No timestamp, machine path,
local primary key, or framework envelope enters the artifact. Input-byte changes,
including comments and deferred files, intentionally change the dataset version.
The checksum is then calculated over the final artifact bytes.

Schema validation is followed by source-ID uniqueness, ID/file consistency,
unique aliases, and count checks in all three readers. `npm run names:schema`
regenerates the schema; `npm run names:schema:check` verifies drift.

## Omissions and duplicate names

`report.json` records source path/hash pairs, malformed alias positions (without
copying malformed objects), normalized-title collision groups, and deferred
source IDs. Primary-name/YAML/UTF-8 errors fail the export. Malformed alias
entries are omitted; valid names remain available. NFKC, lowercase, punctuation
to spaces, and whitespace collapsing identify duplicate search aliases; the first
original spelling is kept, and aliases equal to the primary name are omitted.

Same-name records keep separate source identities. Distinct, clear years can
label a collision. Publisher-list differences alone do not justify separate
identities. Unresolved groups are deferred, with all keys retained in the report.
Punctuation normalization also groups `Robots` and `Robots!`, which the previous
read-only scan counted separately.

The September 20 export at Git HEAD `f7fb5a9` contains 4,011 records and 1,294
deduplicated aliases from 4,013 files. It reports 19 malformed alias entries and
defers `legacy_yaml:citadel` and `legacy_yaml:citadels` (same name/year). Bushido,
Dune, Robots, and Splotch use distinct legacy-year labels. No identity decision
or editorial fact approval is implied.

## Integrated Django application

The owner selected `boardgame-exchange` after the Rails MVP. Its real Django adapter
is now implemented and locally adopted; see the [Exchange consumer brief](consumers/boardgame-exchange.md).
It uses this exact snapshot/schema with a project management command, source links,
transactional repeat import, local alias search and the existing collection flow.
The examples below remain small framework-neutral reference implementations.

## Ruby, Python, and Django

The [Ruby reader](../examples/name-snapshot/ruby/read_snapshot.rb) uses
`json_schemer` 2.5.0; the [Python reader](../examples/name-snapshot/python/read_snapshot.py)
uses `jsonschema`. Both take snapshot, checksum, and schema paths, validate before
returning records, and hash the original bytes. The Django example uses that exact
Python reader and provides [illustrative local models](../examples/name-snapshot/python/catalog_example/models.py)
and a real [management command](../examples/name-snapshot/python/catalog_example/management/commands/import_catalog_names.py).

Install the Python dependencies in a virtual environment and the Ruby validator:

```sh
python3 -m venv .local/name-python
.local/name-python/bin/pip install -r examples/name-snapshot/python/requirements.txt
gem install json_schemer -v 2.5.0 --no-document
PYTHON=.local/name-python/bin/python npm run test:names:compat
```

The compatibility runner checks both readers against the same fixture, including
Unicode filenames, `007`, aliases, nulls, checksum mismatch, numeric ID rejection,
unsupported versions, wrong counts, duplicate IDs, and additive fields. It then
runs the Django command against in-memory SQLite, checking explicit reconciliation,
repeat import IDs, collection links, preserved local publisher, missing rows, and
rollback after a mid-import failure. The command does not need a second Django app.

For adaptation to an existing Django project, add the example app to
`INSTALLED_APPS`, place `read_snapshot.py` on its Python import path, and create
normal Django migrations for its illustrative models (or map to your own). Invoke:

```sh
python manage.py import_catalog_names /path/to/snapshot.json \
  --checksum /path/to/snapshot.sha256 \
  --schema /path/to/name-snapshot.schema.json \
  --mapping /path/to/reviewed-mapping.json
```

The optional mapping is a JSON object from source ID to an existing integer
`Game.pk`. Same-title unlinked local games require explicit mapping; the importer
never guesses a merge. Imports validate before a `transaction.atomic()` block;
uniqueness constraints reject conflicting concurrent imports and roll back the
whole operation. Missing rows remain. Production-specific scheduling, concurrent
sync coordination, search views, and a second full application are outside this
minimal example.

The Django command follows the official
[custom management-command](https://docs.djangoproject.com/en/5.2/howto/custom-management-commands/)
and [transaction](https://docs.djangoproject.com/en/5.2/topics/db/transactions/)
documentation. The wire schema follows
[JSON Schema 2020-12](https://json-schema.org/draft/2020-12/json-schema-core).
