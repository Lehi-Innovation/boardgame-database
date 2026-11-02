# Retirements: 2026-11-02

## Duplicate game records

The following records duplicated an active game rather than representing a distinct
edition. Both original files remain byte-for-byte intact. Their owner ratings were
null and neither held play history. Different provisional experience estimates
remain in these archived originals; they were not silently merged.

| Original path | Archived record | Current record | Original SHA-256 |
| --- | --- | --- | --- |
| `games/two-player-chess.yaml` | [two-player-chess.yaml](duplicate-records/two-player-chess.yaml) | [chess](../../games/chess.yaml) | `44787c3fb6431c7a00ac5dec9a2b7924eb4abc99c31ef43ce4dab070fdf5a305` |
| `games/the-castle-carcassonne.yaml` | [the-castle-carcassonne.yaml](duplicate-records/the-castle-carcassonne.yaml) | [carcassonne-the-castle](../../games/carcassonne-the-castle.yaml) | `d7511e71f0cad0275634d30067f8b8be410a28d7b32534ebaac2a1edde4ead6d` |

The retired IDs have explained evidence links in [game-aliases.yaml](../../sources/game-aliases.yaml).
The CSV mappings now use the retained records. The separate Mayfair **The Castle
(1981)** discovery row was not merged into the Carcassonne game: its incorrect
mapping was cleared and it remains pending independent rules/specification work.
Faidutti and Laget’s **Castle (2000)** also remains a separate active card game.

Restore a duplicate only if new evidence establishes a distinct edition or if
reversing the consolidation deliberately. Review the current canonical record,
CSV mappings, evidence aliases and any newly accumulated owner data together.

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
