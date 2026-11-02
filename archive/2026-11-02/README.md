# Image identity audit: 2026-11-02

Two pre-existing assets were removed from active image lookup after inspecting
their actual pixels. Two others were replaced with documented publisher assets.
Original bytes and prior metadata remain preserved.

| Original path | Archived path | Finding |
| --- | --- | --- |
| `images/Clank_ Legacy_ Acquisitions Incorporated (2019).jpg` | [image-audit/Clank_ Legacy_ Acquisitions Incorporated (2019).jpg](<image-audit/Clank_ Legacy_ Acquisitions Incorporated (2019).jpg>) | Shows **Clank! Legacy 2: Acquisitions Incorporated — Darkest Magic**, a different game from the 2019 original |
| `images/Pandemic Legacy: Season 1 (2015).webp` | [image-audit/Pandemic Legacy: Season 1 (2015).webp](<image-audit/Pandemic Legacy: Season 1 (2015).webp>) | Shows **Clank! Legacy: Acquisitions Incorporated** and miniatures; wrong game and not a box-only image |
| `images/Lost Ruins of Arnak (2020).png` | [image-audit/Lost Ruins of Arnak (2020).png](<image-audit/Lost Ruins of Arnak (2020).png>) | Untraceable predecessor; replaced with the visually inspected box image from the official CGE press factsheet |
| `images/Codenames (2016).webp` | [image-audit/Codenames (2016).webp](<image-audit/Codenames (2016).webp>) | Untraceable predecessor; replaced with the original-game box image linked by the official CGE 2015 press factsheet |

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
