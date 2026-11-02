# Retirements: 2026-11-02

## Duplicate game records

The following records duplicated an active game rather than representing a distinct
edition. All three original files remain byte-for-byte intact. Their owner ratings were
null and neither held play history. Different provisional experience estimates
remain in these archived originals; they were not silently merged.

| Original path | Archived record | Current record | Original SHA-256 |
| --- | --- | --- | --- |
| `games/two-player-chess.yaml` | [two-player-chess.yaml](duplicate-records/two-player-chess.yaml) | [chess](../../games/chess.yaml) | `44787c3fb6431c7a00ac5dec9a2b7924eb4abc99c31ef43ce4dab070fdf5a305` |
| `games/the-castle-carcassonne.yaml` | [the-castle-carcassonne.yaml](duplicate-records/the-castle-carcassonne.yaml) | [carcassonne-the-castle](../../games/carcassonne-the-castle.yaml) | `d7511e71f0cad0275634d30067f8b8be410a28d7b32534ebaac2a1edde4ead6d` |
| `games/hannibal.yaml` | [hannibal.yaml](duplicate-records/hannibal.yaml) | [hannibal-rome-vs-carthage](../../games/hannibal-rome-vs-carthage.yaml) | `bf2d8ef145f224c751fdc55f7e3ffe29315171d5fe241deaae0d7675dd3b6e67` |

The retired IDs have explained evidence links in [game-aliases.yaml](../../sources/game-aliases.yaml).
The CSV mappings now use the retained records. The separate Mayfair **The Castle
(1981)** discovery row was not merged into the Carcassonne game: its incorrect
mapping was cleared and it remains pending independent rules/specification work.
Faidutti and Laget’s **Castle (2000)** also remains a separate active card game.

Both Hannibal YAMLs explicitly represented Simonitch's Avalon Hill 1996 original.
The publisher's contemporary product-906 advertisement and independent play review
support that identity. Neither file represented the later Valley Games or PHALANX
revisions. The archived short-title record includes an incorrect claim that Hannibal
introduced card-driven wargaming; the retained record explains the earlier
We the People system instead. Archiving preserves evidence, not publication approval.

Restore a duplicate only if new evidence establishes a distinct edition or if
reversing the consolidation deliberately. Review the current canonical record,
CSV mappings, evidence aliases and any newly accumulated owner data together.

## Family overviews excluded from playable records

These two YAMLs describe categories or series rather than one playable game or
edition. Their original bytes and empty owner fields remain intact. They are
not duplicate-game merges, and neither retired ID redirects to an arbitrary
family member. Neither ID had historical research-log entries.

| Original path | Archived record | Reason | Original SHA-256 |
| --- | --- | --- | --- |
| `games/tiger-game.yaml` | [tiger-game.yaml](family-overviews/tiger-game.yaml) | Describes a broad family across South and Southeast Asia. Specific Nepali [Bagh-Chal](../../games/bagh-chal.yaml) remains active, with its own rules; other hunt games are not aliases of it. | `a0798742d03d0d9a5eabd13ca7cb1595109cb798e7af87bd084d72853de43ef4` |
| `games/third-reich-great-pacific-war-series.yaml` | [third-reich-great-pacific-war-series.yaml](family-overviews/third-reich-great-pacific-war-series.yaml) | Blends Avalon Hill/GMT history with the separate Avalanche Press line. Its family-level CSV row is now `skip`; [Advanced Third Reich](../../games/advanced-third-reich.yaml) remains a distinct active game. | `0d15914574db590d4b9932250a1212d38a415b4552de0247f5c09b988fb9ae2f` |

[Berkeley's Bagh-Chal rules](https://gamescrafters.berkeley.edu/games.php?game=baghchal)
identify the four-tiger/twenty-goat game, not the entire hunt-game family.
[Avalanche Press's rules introduction](https://www.avalanchepress.com/pdf/SWW_Rules_3rd_Edition.pdf)
distinguishes Third Reich, Great Pacific War and their combined Second World War
rules. Those are not alternative names for Avalon Hill's Advanced Third Reich.
The active records' consulted evidence explains the distinctions; the archived
descriptions remain historical errors, not approved replacement text.

Restore only after establishing a particular playable game/edition, or introducing
an explicitly separate family entity with appropriate consumers. Review source
IDs, mappings and protected owner data before restoring; do not reuse the old
dates, ratings and player counts as verified specifications.

## Image identity audit

Originals are preserved here after wrong-game quarantine or replacement with
documented publisher assets. No original bytes were altered.

| Original path | Archived path | Finding |
| --- | --- | --- |
| `images/Clank_ Legacy_ Acquisitions Incorporated (2019).jpg` | [image-audit/Clank_ Legacy_ Acquisitions Incorporated (2019).jpg](<image-audit/Clank_ Legacy_ Acquisitions Incorporated (2019).jpg>) | Shows **Clank! Legacy 2: Acquisitions Incorporated — Darkest Magic**, a different game from the 2019 original |
| `images/Pandemic Legacy: Season 1 (2015).webp` | [image-audit/Pandemic Legacy: Season 1 (2015).webp](<image-audit/Pandemic Legacy: Season 1 (2015).webp>) | Shows **Clank! Legacy: Acquisitions Incorporated** and miniatures; wrong game and not a box-only image |
| `images/Lost Ruins of Arnak (2020).png` | [image-audit/Lost Ruins of Arnak (2020).png](<image-audit/Lost Ruins of Arnak (2020).png>) | Untraceable predecessor; replaced with the visually inspected box image from the official CGE press factsheet |
| `images/Codenames (2016).webp` | [image-audit/Codenames (2016).webp](<image-audit/Codenames (2016).webp>) | Untraceable predecessor; replaced with the original-game box image linked by the official CGE 2015 press factsheet |
| `images/Star Wars: Rebellion (2016).png` | [image-audit/Star Wars: Rebellion (2016).png](<image-audit/Star Wars: Rebellion (2016).png>) | Untraceable 300×302 predecessor; replaced with the inspected 1000×1000 publisher product image |
| `images/Root (2018).webp` | [image-audit/Root (2018).webp](<image-audit/Root (2018).webp>) | Untraceable smaller predecessor; replaced by Root Box Art.png from the media kit linked by Leder Games |
| `images/Ready Set Bet (2022).jpg` | [image-audit/Ready Set Bet (2022).jpg](<image-audit/Ready Set Bet (2022).jpg>) | Untraceable predecessor; replaced by inspected standard English box from AEG’s storefront |
| `images/Wingspan (2019).png` | [image-audit/Wingspan (2019).png](<image-audit/Wingspan (2019).png>) | Untraceable predecessor; replaced with a web-size variant of Stonemaier’s linked base-box asset |
| `images/7 Wonders (2010).png` | [image-audit/7 Wonders (2010).png](<image-audit/7 Wonders (2010).png>) | Later packaging on an original-edition record; replaced by the explicitly labeled first-edition retailer box |
| `images/A Feast for Odin (2016).webp` | [image-audit/A Feast for Odin (2016).webp](<image-audit/A Feast for Odin (2016).webp>) | Untraceable predecessor; replaced by the explicitly labeled original Z-Man English box |
| `images/Dixit (2008).jpg` | [image-audit/Dixit (2008).jpg](<image-audit/Dixit (2008).jpg>) | Untraceable predecessor; replaced by a sourced English FAMILY box whose icons confirm the earlier 3–6 player version |

The active [image inventory](../../images/sources.yaml) retains hashes,
observations, archive paths and the previous entries in history. Neither the
filenames nor the old inventory established identity or reuse permission.

Restore only after identifying the represented edition, establishing source/use
evidence under the current image policy, and using the matching game record and
filename. The composite Clank! image additionally needs a box-only replacement.
Do not restore either under its original incorrect game association.

The CGE replacements have exact source-page/image URLs, download dates, hashes,
dimensions and the publisher's stated web-promotion terms in the current inventory.
Their printings are not inferred to have been manufactured in the original
publication year. Restoring either predecessor would also require its own source
evidence; do not copy a replacement's provenance onto different bytes.

Pandemic Legacy now has a correct blue-box image from Z-Man's product page.
That replacement and Rebellion's use the documented fair-use category under the
existing project policy, with exact page/image URLs, hashes and web dimensions.
This classification is not a publisher permission grant. The original wrongly
named Pandemic/Clank composite remains quarantined.

The current original Clank! Legacy record also has a correct box-only replacement
from a documented retailer source. It has no sequel subtitle and no foreground
component composite. The mislabeled sequel image remains archived.

Eleven original assets are archived here. The other two, 7 Wonders Duel and Heat,
remain unchanged in the active directory: fresh downloads from their publishers'
exact linked URLs matched their original SHA-256 values. Their historic acquisition
dates remain unknown; the inventory records the new reacquisition event.
