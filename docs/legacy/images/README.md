# Board Game Images

Store box art images here with the naming convention: `Game Name (Year).jpg`

## Naming Examples
- `Brass Birmingham (2018).jpg`
- `Ark Nova (2021).jpg`
- `Gloomhaven (2017).jpg`
- `Twilight Imperium Fourth Edition (2017).jpg`

## Image Sources

All images must come from official publisher sources with appropriate licensing for commercial use. Do NOT use BoardGameGeek or other user-uploaded images.

### Workflow

1. Check `publishers.yaml` for the game's publisher press kit URL and contact info
2. Download from self-service press kits, or email the publisher to request assets
3. Save with the correct naming convention: `Game Name (Year).jpg`
4. Record provenance in `images/sources.yaml`
5. Update publisher `status` in `publishers.yaml` as you go

### Tools

```bash
python3 scripts/image_manager.py              # overall progress
python3 scripts/image_manager.py publishers    # games grouped by publisher
python3 scripts/image_manager.py publisher X   # detail view for one publisher
python3 scripts/image_manager.py missing       # list games missing images
python3 scripts/image_manager.py check         # validate image files
```

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
- `source_url`: Where the image was obtained
- `publisher`: Who provided it
- `license`: License type or permission reference
- `date`: When it was downloaded

This is required for commercial use.

## Image Guidelines
- Prefer official box art (front of box)
- Minimum resolution: 500x500px
- Preferred resolution: 1000x1000px or higher
- JPG or PNG format
- No gameplay shots (per database policy)
