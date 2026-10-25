# Rails consumer: boardgame-marketplace

The Rails application in the sibling `../boardgame-marketplace` checkout uses
this repo's [legacy name snapshot](../name-snapshot.md). Its local database owns
numeric `Game.id` values; the shared `legacy_yaml:*` source keys are strings and
never replace those IDs. Search and selection work without a running catalog
server after an explicit sync. This names-only integration was verified locally
on September 20, 2026; the dated evidence is in the
[session log](../archive/2026-09/session-handoff.md).

## Refresh the local names

Generate an immutable bundle here with `npm run export:names`. In the marketplace
checkout, use the printed `snapshot.json` and adjacent `snapshot.sha256` paths:

```sh
SNAPSHOT=/path/to/snapshot.json CHECKSUM=/path/to/snapshot.sha256 bin/rails catalog:plan
SNAPSHOT=/path/to/snapshot.json CHECKSUM=/path/to/snapshot.sha256 MAPPING=/path/to/mapping.json bin/rails catalog:sync
```

The plan is read-only. A possible existing match needs an explicit reviewed
mapping; title or external-ID similarity does not authorize a merge. Repeat
syncs preserve local IDs and associations. Missing snapshot rows do not delete
local games. See `../boardgame-marketplace/docs/catalog-names.md` in the sibling
checkout for the mapping format, setup, search behavior, and verification.

## Later reviewed catalog and covers

These names are a provisional legacy reference feed, not approved design or
edition identities. A later reviewed release needs an explicit canonical-to-local
crosswalk before it can supply edition facts or the optional
[cover feed](../cover-images.md). Seller photographs, listings, bids, prices,
and inventory stay in the marketplace. Cover display through this new feed has
not been implemented; the names-only search remains independent of it.
