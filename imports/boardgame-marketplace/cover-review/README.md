# Twenty-game cover review packet

Prepared September 20, 2026 (America/Phoenix); source retrievals occurred on
September 21 UTC. **Research and draft proposals only. No records have been
submitted, approved, published, or connected to consumer cover displays.**

The packet contains 20 sourced game-identity drafts, 18 proposed representative
editions, and 20 downloaded artwork candidates. All game/proposal UUIDs and legacy
source hashes are preserved from the original manifest. The two unresolved
editions are Gloomhaven and The Castles of Burgundy. All image usage decisions
remain unresolved; there are **zero approved assets and zero cover proposals**.

## Review the proposed identities

Read the [edition and artwork table](edition-table.md), then the per-game
rationales and evidence in [research.json](research.json). The
[prepared manifest](prepared-manifest.json) works with the existing importer:

```sh
npm run import:legacy -- plan --manifest imports/boardgame-marketplace/cover-review/prepared-manifest.json
```

This is a separate draft manifest. The original `../manifest.json`, reserved game
and proposal IDs, YAML records, and Rails/Django name integrations are unchanged.
The original `audit:covers` still correctly reports 20 unresolved mappings because
these proposed choices have not been adopted there. Do not replace that result
with the number of researched candidates or pass it off as approved coverage.

Drafts deliberately omit unsourced years, player counts, durations, canonical
publisher/person records, external IDs, and cover selections. Unknown languages
remain empty; an English website or an `EN` SKU suffix alone is not language
evidence. The edition names are proposed catalog labels tied to cited products,
not claims about a consumer's physical copy or its printing.

The most consequential identity choices are:

- **Viticulture:** propose the design name `Viticulture` under the existing reserved
  game UUID and Essential Edition as the selected edition. The publisher describes
  an upgrade from second-edition Viticulture. This does not merge the two legacy
  YAML files. [Publisher comparison](https://stonemaiergames.com/games/viticulture/essential-edition/)
- **7 Wonders and Dominion:** propose their newer editions within the existing
  designs. Repos advises against mixing old/new expansions; no compatibility edge
  is added. Rio Grande describes the card changes in Second Edition.
  [7 Wonders FAQ](https://www.rprod.com/en/7-wonders/faq),
  [Dominion](https://www.riograndegames.com/games/dominion/)
- **Gloomhaven:** keep the original candidate's game identity and leave its edition
  unknown. The current box belongs to the newer product, whose announcement lists
  substantial revisions. Applying the project's redesign boundary requires a
  maintainer decision before associating that cover; the historical second
  *printing* is a different matter.
  [New product announcement](https://cephalofair.com/blogs/chronicle/cephalofair-games-announces-gloomhaven-second-edition),
  [Historical printing explanation](https://cephalofair.com/blogs/chronicle/new-printing-not-new-edition)
- **The Castles of Burgundy:** leave the edition unknown. The US product page's
  article 26925 image has a German title. Confirm the language/product association
  instead of inferring an English cover from the US page.
  [Publisher product](https://www.ravensburger.us/en-US/products/games/family-games/the-castles-of-burgundy-26925)
- **Pandemic Legacy:** retain separate game identities for each season. Select
  Blue for Season 1 and propose Black for Season 2. Box-color variants have the
  same contents within a season, but their artwork remains edition-specific.
  [Season 1](https://store.asmodee.com/products/pandemic-legacy-season-1-blue-edition),
  [Season 2](https://www.zmangames.com/game/pandemic-legacy-season-2/)

## Artwork inspection

All 20 files decoded successfully as single-frame PNG/JPEG/WebP; 19 meet the
existing 20 MB / 40 million pixels / 500-pixel long edge / 200-pixel short edge
limits. Exact URLs, acquisition timestamps, byte hashes, dimensions, and file sizes
are recorded in `research.json`. Original bytes are in the ignored local folder
`.local/cover-research/2026-09-20/originals/`. The local
[contact sheet](../../../.local/cover-research/2026-09-20/contact-sheet.html)
embeds those images and makes no remote requests. The PNG rendering was visually
inspected; this is preparer inspection, not maintainer approval.

Three candidates are held:

1. Gloomhaven is the newer edition's artwork; it cannot establish the original
   candidate's cover.
2. The Castles of Burgundy is only **171 × 250** and has a German title. Obtain
   the correct language/product image at the required resolution; do not upscale.
3. Pandemic Legacy Season 2 combines the black and yellow boxes in one image.
   Obtain a complete single-box Black Edition asset; do not crop the composite.

The other 17 are single-game candidate images that pass technical inspection.
Most are perspective box renderings; Everdell is a flat front. They are not yet
approved as edition matches or cleared for use. Brass's retail/deluxe finish and
the exact language/printing of several products still need reviewer confirmation.

The source HTML/text and failed-request diagnostics are also retained locally.
Repository records include hashes only for successful local page retrievals.
Ravensburger's product page was read with the web tool; its local HTTP request
returned 403, so that failed response is not presented as a source snapshot.

## Usage evidence and next actions

See [usage review and unsent publisher requests](publisher-requests.md). CGE,
Stonemaier and Roxley provide useful promotional/media resources. None of the
evidence inspected establishes every permission needed by this project for shared
commercial catalog hosting plus optional downstream binary distribution.

`rights_review.commercial_display` and `redistribution_allowed` are **null** in
the research file. Null means not established; it does not mean permission was
denied. The research file is intentionally not an `AssetRecord`. Do not insert
fictional rights into `prepare:cover` merely to make its schema pass.

After the evidence is complete:

1. Review/adopt the proposed edition choices and resolve the two unknown editions.
   Re-read current editorial records before save/submit; these offline proposals
   have a new-proposal baseline of version 0 and null base revisions.
2. Replace the three held images and confirm all exact edition/language matches.
3. Obtain documented project-specific usage scope, or another explicitly reviewed
   basis. Prepare assets with the existing `prepare:cover`, then build the cited
   asset/edition proposals using approved edition revisions. Human review remains
   required by the [cover specification](../../../docs/cover-images.md).
4. Publication, hosting, withdrawal enforcement, consumer identity crosswalks and
   cover display follow the existing specification. They are not part of this
   research packet's completion claim.

## Validation

The existing importer parses all 20 draft entries and reports zero preparation
blockers and zero graph/evidence errors. Each retains the expected
`human_review_required` warning. This checks contract consistency and citation
coverage, not whether a proposed fact or permission is approved. The
[validation summary](validation.json) records the remaining checks and counts.
