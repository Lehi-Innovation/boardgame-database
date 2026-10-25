# Cover images

This is the design and implementation guide for edition-linked stock covers.
Consumers can opt out and use the independent [name feed](name-snapshot.md).
An image-enabled launch must meet its cover-coverage target; a placeholder is
a failure fallback, not proof that the target was met. See the
[status page](status.md) for the current implementation boundary.

## Identity and selection

`asset` is a catalog entity with an opaque UUID and reviewed immutable revisions.
It belongs to exactly one edition through `edition_id`. An edition optionally
selects `cover_asset_id`; a game uses its default edition's cover. A different
printing/language must select its own edition, rather than silently borrowing
another edition's artwork. A representative game cover does not establish which
printing a seller owns. Seller photographs remain consumer-owned data.

Changing a title or publication year cannot change an asset association. Changed
image bytes, renditions, or edition ownership require a new asset ID. Source,
attribution, usage terms, and withdrawal status can be corrected through ordinary
reviewed revisions. Old edition records without `cover_asset_id` still parse
without adding defaults or changing their historical hashes.

The optional `GameSummary.cover` contract carries the same `CoverImage` object
as the image feed. Public list/detail serializers must derive it from the same
pinned release and selected edition. The public serializers remain M4 work.

## Missing-image placeholder

Use a consistent single-character tile whenever a main cover is absent,
ineligible, withdrawn, or fails to load. This is the planned fallback for search
results, game cards, and detail views in both Rails and Django; it still needs
implementing in those consumers.

- Display the first letter or number in the displayed game name, skipping leading
  whitespace and punctuation. Uppercase letters where applicable and preserve
  accented/non-Latin characters. Keep leading articles: The Crew uses **T**.
  Wingspan uses **W**, Catan uses **C**, and 7 Wonders uses **7**. If no usable
  character exists, show **?**.
- Center the character on a muted background with high-contrast text. Use the
  same reserved width, height, and aspect ratio as the cover slot at each screen
  size so switching between an image and its fallback causes no layout shift.
- Render the tile locally with text and CSS or inline SVG. It requires no image
  download, stored placeholder file, or working image host.
- Use this same tile for a missing cover and an image-load error; avoid exposing
  a broken-image icon. Keep the full game name available to assistive technology.
  When the adjacent title already names the game, treat the character as
  decorative; otherwise label the fallback "Cover unavailable for {game name}".

The tile is presentation derived from the name. Keep the catalog's `cover` null
and its unavailable reason intact when no eligible cover exists; do not register
the placeholder as an asset or count it toward approved cover coverage. Legacy
screens currently use up to two initials in some views; the target is the single
character defined here.

## Source and usage evidence

Every asset records its source page, acquisition date, alt text, original byte
hash/dimensions, generated renditions, and usage terms. `rights` contains:

- `basis`: publisher permission, press kit, a named CC basis, public domain, or
  a documented fair-use assessment.
- `terms_url` and `note`: evidence and the reviewer-readable scope of the terms.
- `allowed_uses`: explicitly reviewed `noncommercial` and/or `commercial` display.
- `redistribution_allowed`: whether consumers may receive/cache a copy in their
  own catalog distribution. URL-only and bundled delivery are separate choices.
- `attribution`: the text consumers must retain; required for CC BY/BY-SA.

Finding a press kit or setting a license label does not approve a permission.
The maintainer reviews the actual artwork, edition match, and supporting terms.
Commercial use and redistribution are separate facts; neither is inferred from
the other's presence. CC conditions and other applicable restrictions remain in
the terms/note and must be carried to consumers. These fields record a reviewed
decision, not an automated legal determination.

The old policy's blanket description of the project as non-commercial does not
describe the connected marketplace use case. This specification governs new
shared assets. Existing files and their legacy source entries are unverified
candidates until reviewed. No existing image acquired approval in this change.
Do not research or acquire images from BoardGameGeek, Geekdo image hosts, or
other user-uploaded hosts under the existing project source policy. The contract
explicitly rejects the known BGG/Geekdo domains; other source eligibility remains
a review check. Images are delivered for in-context catalog identification.

## Preparation and review

Run `npm run audit:covers` to inspect the initial twenty-game marketplace seed
set. The September 26 audit reported **4 matching legacy image files, 0 complete
legacy provenance entries, and 20 unresolved canonical edition mappings**. The directory
as a whole contains 13 files, 12 matching current game filenames. Inventory is
not an approval or a published-coverage report.

The [twenty-game review packet](../imports/boardgame-marketplace/cover-review/README.md)
now contains twenty sourced game drafts, eighteen proposed editions, and twenty
downloaded artwork candidates. Nineteen pass technical limits; three are held for
wrong/unresolved edition, insufficient resolution/language mismatch, or combined
box variants. None has approved usage metadata. The packet's separate draft
manifest does not change the original audit's twenty unresolved mappings.

Prepare downloaded/local artwork with explicit metadata:

```sh
npm run prepare:cover -- --file /path/to/cover.png --metadata /path/to/metadata.json
```

`metadata.json` must supply `id` (a new asset UUID), `edition_id`, `alt_text`,
`source_url`, `acquired_on` (ISO date), and the complete `rights` object described
above. Establish the selected edition during catalog preparation; do not invent
an edition match from a title or an old image filename.

Preparation accepts a single-frame JPEG, PNG or WebP, at most 20 MB / 40 million
pixels, at least 500 pixels on the long edge and 200 on the short edge. It decodes
the file, applies its orientation, strips metadata, and preserves the entire
cover without cropping or upscaling. It creates WebP renditions within 320×320
and 1200×1200. A SHA-256 object key identifies each output's exact bytes.
The original is represented by its hash and dimensions, not copied into the
public image bundle. Retain acquisition evidence privately as appropriate.

Default output is `.local/cover-staging/ASSET_UUID.json` plus
`.local/cover-staging/objects/covers/SHA256.webp`. Repeated preparation verifies
existing bytes; it never overwrites a different candidate. These are unreviewed
local files. There is no remote fetch, approval, or publication side effect.

Build the two-target proposal using the current approved edition revision and
explicit citations:

```sh
npm run prepare:cover-proposal -- --asset /path/to/ASSET_UUID.json --context /path/to/context.json
```

The context contains `edition_revision_id`, the full current `edition` payload,
`image_source` and `permission_source` objects conforming to the catalog `Source`
schema, and `rationale`. The citation URLs must match `source_url` and
`rights.terms_url`. The command prints `ProposalContent` for the existing
authenticated save/submit API. It creates the asset and updates the edition's
cover selection together. Cite and review both the image and its terms in the
maintainer workflow. The CLI does not submit or approve automatically.

If the edition is new, prepare it and its game using the existing catalog
proposal workflow first, or include the required new targets in one proposal.
All references must resolve and all factual changes need evidence. Authenticated
contributors still cannot approve; maintainers approve exact submitted versions.

## Optional cover feed

The [cover snapshot schema](contracts/cover-snapshot.schema.json) is separate from
the unchanged name schema. It uses canonical game/edition/asset UUIDs and one
release ID. Each game has a nullable `cover` and an explicit unavailable reason.
Available covers include alt text, source/usage metadata, thumbnail/detail URLs,
dimensions, content types, byte sizes, SHA-256 hashes, and storage-relative keys.

Export from a **ready frozen release**, using a connection with `catalog_reader`
access. The ordinary editorial-only application login is intentionally insufficient:

```sh
npm run export:covers -- --release r000001 --base-url https://assets.example/catalog/ --use commercial --require-pilot
```

Supply `CATALOG_DATABASE_URL` through the environment. No administrative role is
required. `--objects` defaults to `.local/cover-staging/objects`; every referenced
file must exist and pass hash, size, dimension and full-decode checks even in
URL-only mode. `--base-url` is the intended delivery root, not a destination that
this command uploads to. The exporter does not claim the URLs are deployed.

Add `--bundle` to include rendition files for permitted offline/self-hosted use.
Without it, only `covers.json` and `covers.sha256` are emitted. Explicitly select
`--use noncommercial` for a consumer with that use context. Unsupported use,
withdrawal, absent editions/covers, or prohibited binary redistribution produce
a null cover and reason. `--require-pilot` fails unless every reserved game ID in
the existing twenty-game pilot manifest has an eligible cover. An ordinary export
can report partial coverage; it does not certify an image-enabled launch.

Bundles are staged and atomically renamed beneath `.local/cover-snapshots`.
Their directory name hashes the exact JSON; retries verify existing files instead
of replacing a pinned bundle. Consumers validate the checksum, schema and cross-field
invariants, stage any image copies, then replace their current snapshot atomically.
A failed refresh keeps the prior complete bundle. Images are optional dependencies;
names-only consumers do not download or process them.

## Withdrawal and delivery

`status: withdrawn` removes an image from later release projections. For an urgent
withdrawal, add its asset UUID to `images/withdrawals.json`; the exporter applies
that denylist even when exporting an older pinned release. This cannot revoke an
already downloaded file or purge an already deployed cache. Production delivery
must also block/delete the object, purge the CDN, and notify consumers to remove
cached copies. Documented withdrawal takes precedence over image URL immutability.
Until those production controls exist, withdrawal is verified at export time only.

The planned host remains Cloudflare R2 with a custom delivery domain. Publish only
eligible renditions; do not expose staging or originals. Use versioned/hash URLs,
correct MIME types, and bounded caching coordinated with withdrawal controls.
R2 provisioning, uploads, CDN configuration, and public catalog publication remain
unimplemented. Local preparation and synthetic ready-release tests do not imply
a hosted image service.

## Consumer acceptance and remaining delivery work

The first working coverage target is all twenty marketplace seed candidates.
Before declaring the image-enabled integration ready:

1. Establish the appropriate edition for each game, obtain actual artwork and
   usage evidence, and approve the cover proposals through human review.
2. Publish a reviewed release and pass the commercial-use pilot coverage gate.
3. Deliver its renditions and demonstrate successful image loads from the chosen
   host, including attribution and full-cover aspect ratio (`object-fit: contain`).
4. Integrate the feed with Rails and Django using reviewed canonical-to-local ID
   crosswalks. Their existing source keys are legacy identities; title matching
   must not substitute for that crosswalk. Preserve local associations and seller
   photos. Show stock covers in results, cards and details; use the
   [single-character placeholder](#missing-image-placeholder) for missing or
   failed images and label edition context where needed.
5. Verify title changes, image replacements, wrong-edition rejection, failed
   refresh, missing-file fallback, and withdrawal across both consumers. A
   names-only consumer must continue working without the feed or image host.
   Check letter-, number-, and non-Latin-leading names, names without a usable
   character, and image-load failures. Verify stable cover-slot dimensions and
   accessible naming for both the image and placeholder states.

The implemented slice includes contracts, typed graph checks, storage support,
preparation, proposal construction, frozen-release export, coverage gates and
automated tests. Real image acquisition/review, publication, hosting, and Rails/
Django cover display are remaining work. Existing name integrations stay usable.
