# Board game images

This directory holds box art. Image origins and permission evidence belong in [sources.yaml](sources.yaml); publisher asset/contact leads live in [../publishers.yaml](../publishers.yaml). The existing [image-use policy](FAIR_USE.md) and [dated acquisition plan](ACQUISITION_PLAN.md) are preserved. That policy includes documented fair use as a last-resort source category; it is project policy, not a guarantee of legal permission for an individual image.

## Naming and formats

The lookup convention is the exact game `name` and `year` from its YAML record:

```text
Azul (2017).jpg
Wingspan (2019).png
Root (2018).webp
```

The backend recognizes names case-insensitively; the Python checker uses exact case. JPEG, PNG, and WebP are accepted by uploads. Prefer a clear front-of-box image, at least 500 × 500 pixels and ideally 1,000 × 1,000 or larger. The upload path warns about small dimensions but does not reject them.

**Known mismatch:** the uploader replaces punctuation with underscores, while lookup expects the original name. Avoid bulk renaming or reacquiring images to work around this; align the implementation first. Existing assets are preserved. See [status](../docs/status.md).

## Asset workflow

1. Check the publisher directory for an asset lead, then verify that it is current and the intended use is permitted.
2. Follow the existing source preference order: press kit, direct permission, Creative Commons/public domain, then documented fair use under the project policy. A public press-kit URL alone does not establish unrestricted reuse.
3. Save the image and verify that the application associates it with the correct game/edition.
4. Record filename, source URL, publisher, permission/license evidence, acquisition date, and resolution in `sources.yaml`.
5. Update publisher status only when an actual contact or permission event occurred.

Publisher outreach requires an explicit instruction from the owner. Do not infer permission to send messages from the presence of contact details.

BoardGameGeek source use is under evaluation; see [the product brief](../docs/product-brief.md#boardgamegeek-source-policy). Any image reuse also needs an assessment of that particular asset's permissions.

## Provenance shape

The tracker is a mapping keyed by game slug:

```yaml
example-game:
  file: "Example Game (2026).jpg"
  source_url: "https://publisher.example/media/example-game"
  publisher: "Example Publisher"
  license: null
  date: null
  resolution: null
  notes: "Illustrative entry only; replace with actual evidence."
```

Unknown information remains explicit. Uploading through the web interface does not create a provenance entry, and existing files are not proof that permission has been established.

## Tools

Run from the repository root:

```bash
python scripts/image_manager.py
python scripts/image_manager.py publishers
python scripts/image_manager.py publisher "Publisher Name"
python scripts/image_manager.py missing
python scripts/image_manager.py check
python scripts/fetch_image.py --help
```

These report coverage and filename issues. They do not verify licensing or complete the asset workflow.

The dedicated `fetch_image.py SLUG --url IMAGE_URL --license LICENSE` tool downloads and validates art, saves the canonical game name/year filename, and records provenance. Use actual source evidence and the policy’s license labels; it does not establish permission by itself. Read its options before using `--force`, which can replace existing assets/provenance. The web uploader still uses a different filename/provenance path.
