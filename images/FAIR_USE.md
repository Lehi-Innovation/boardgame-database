# Image Use Policy

This database is a **non-commercial cataloging and identification project**. Box-art
images are used to help identify games, the same way a library catalog or store listing
shows a cover. This document defines what images may be added and how.

> This is a project policy, not legal advice. When in doubt, prefer a more permissive
> source (press kit or Creative Commons) and always record provenance.

## Source preference order

Always take the most clearly-licensed option available, in this order:

1. **Official press / media kit** — `license: publisher-press-kit`
2. **Direct publisher permission** (email/written) — `license: publisher-permission`
3. **Creative Commons / public domain** (e.g. Wikimedia Commons) — `license: cc-by`,
   `cc-by-sa`, `cc0`, or `public-domain`
4. **Documented fair use** (publisher storefront, Wikipedia article image, retailer
   listing) — `license: fair-use`

Tiers 1–3 are always preferred. Tier 4 exists so the long tail of games — old, defunct,
or tiny-publisher titles with no press kit and no CC image — can still be identified.

## Fair-use criteria (Tier 4)

A `fair-use` image must meet **all** of the following:

- **Identification only** — front box art used to identify the game, not decoration.
- **Low / web resolution** — roughly 500–1500 px on the long edge. Do **not** use
  high-resolution print assets under fair use; those require permission.
- **One image per game** — no galleries, no component/gameplay shots.
- **Provenance recorded** — `source_url` points to the exact page the image came from,
  and `license: fair-use` is set in `images/sources.yaml`.
- **Honor takedowns** — if a rights holder asks, the image is removed promptly and the
  game falls back to no image.

## Always prohibited

- **BoardGameGeek and other user-uploaded image hosts** — blocked regardless of tier.
- **Gameplay / component photos** — box art only (per database policy).
- **High-resolution print assets** without explicit permission.
- **Redistribution as standalone art** — images live in this catalog in context, not as
  a downloadable asset pack.

## Provenance is mandatory

Every image — in every tier — must have an entry in `images/sources.yaml` recording
`source_url`, `publisher`, `license`, and `date`. Use `scripts/fetch_image.py`, which
records this automatically. Images without provenance are treated as unverified and may
be removed.
