# Board Game Images

Store box art images here with the naming convention: `Game Name (Year).jpg`

## Naming Examples
- `Brass Birmingham (2018).jpg`
- `Ark Nova (2021).jpg`
- `Gloomhaven (2017).jpg`
- `Twilight Imperium Fourth Edition (2017).jpg`

## Image Sources

See **[FAIR_USE.md](FAIR_USE.md)** for the full image-use policy. In short, take the most
clearly-licensed source available, in this order:

1. Official press / media kit → `license: publisher-press-kit`
2. Direct publisher permission → `license: publisher-permission`
3. Creative Commons / public domain (e.g. Wikimedia) → `cc-by` / `cc-by-sa` / `cc0` / `public-domain`
4. Documented fair use (publisher store, Wikipedia, retailer listing) → `license: fair-use`

**Never** use BoardGameGeek or other user-uploaded image hosts, gameplay/component shots,
or high-resolution print assets without permission.

### Workflow

The easiest path is `scripts/fetch_image.py`, which downloads, validates resolution, saves
with the correct filename, and records provenance in one step:

```bash
python3 scripts/fetch_image.py SLUG --url IMAGE_URL --license LICENSE \
    [--publisher NAME] [--source-page PAGE_URL] [--notes TEXT]
```

Manual steps if needed:
1. Check `publishers.yaml` for the game's publisher press kit URL and contact info
2. Download from a press kit, CC source, or (Tier 4) a documented fair-use page
3. Save with the correct naming convention: `Game Name (Year).jpg`
4. Record provenance in `images/sources.yaml` (`source_url`, `publisher`, `license`, `date`)
5. Update publisher `status` in `publishers.yaml` as you go

### Tools

```bash
python3 scripts/image_manager.py              # overall progress
python3 scripts/image_manager.py publishers    # games grouped by publisher
python3 scripts/image_manager.py publisher X   # detail view for one publisher
python3 scripts/image_manager.py missing       # list games missing images
python3 scripts/image_manager.py check         # validate image files
python3 scripts/fetch_image.py SLUG --url URL --license LIC  # fetch + validate + record
```

See **[ACQUISITION_PLAN.md](ACQUISITION_PLAN.md)** for the overall strategy, channel
analysis, and phasing.

### Publishers with Self-Service Press Kits

These publishers offer downloadable press assets — start here:

| Publisher | Press Kit URL |
|-----------|---------------|
| Czech Games Edition | https://czechgames.com/for-press/ |
| Pandasaurus Games | https://pandasaurusgames.com/pages/media-kits |
| Leder Games | https://ledergames.com/pages/resources |
| KOSMOS | https://www.kosmos.de/content/presse/pressebilder/pressebilder-spielware/ |
| Repos Production | https://www.rprod.com/en/press |
| Awaken Realms | https://awakenrealms.com/download |

### Asmodee Group

Asmodee owns Fantasy Flight, Z-Man, Days of Wonder, Lookout, Hans im Gluck, eggertspiele, Plan B, and Repos Production. One request to `pr@asmodeena.com` can cover ~80 games.

### Provenance Tracking

Every image must have an entry in `sources.yaml` recording:
- `source_url`: Where the image was obtained (the exact page)
- `publisher`: Who provided it
- `license`: One of `publisher-press-kit`, `publisher-permission`, `cc-by`, `cc-by-sa`,
  `cc0`, `public-domain`, or `fair-use` (see [FAIR_USE.md](FAIR_USE.md))
- `date`: When it was downloaded

This is mandatory — images without provenance are treated as unverified and may be removed.

## Image Guidelines
- Prefer official box art (front of box)
- Minimum resolution: 500x500px
- Preferred resolution: 1000x1000px or higher
- JPG or PNG format
- No gameplay shots (per database policy)
