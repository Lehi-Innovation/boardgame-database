# Board game images

This directory holds box art. Image origins and permission evidence belong in [sources.yaml](sources.yaml); publisher asset/contact leads live in [../publishers.yaml](../publishers.yaml). The existing [image-use policy](FAIR_USE.md) and [dated acquisition plan](ACQUISITION_PLAN.md) are preserved. That policy includes documented fair use as a last-resort source category; it is project policy, not a guarantee of legal permission for an individual image.

## Naming and formats

The lookup convention is the exact game `name` and `year` from its YAML record:

```text
Azul (2017).jpg
Wingspan (2019).png
Root (2018).webp
```

The backend and Python checker recognize names case-insensitively. Punctuation and Unicode are preserved; path separators and control characters become underscores. Both also recognize the old upload underscore convention, preserving existing assets. JPEG, PNG, and WebP are accepted by uploads. Prefer a clear front-of-box image, at least 500 × 500 pixels and ideally 1,000 × 1,000 or larger. The upload path warns about small dimensions but does not reject them.

All 13 pre-existing assets were inventoried on 2026-11-01 with dimensions and hashes, then individually inspected on 2026-11-02. [Visual findings](identity-review.yaml) document eleven matching titles with unresolved printings and two wrong-game assets. The latter are [quarantined unchanged](../archive/2026-11-02/README.md), Both remain archived; Pandemic now has a correct replacement. Twelve covers are active. Codenames and Lost Ruins of Arnak now use inspected replacements linked by official CGE press factsheets, with exact source URLs and the publisher's web-promotion terms recorded. Their untraceable predecessors are archived. Pandemic Legacy now uses a correct blue-box image from Z-Man and Rebellion a larger image from Fantasy Flight, both under the documented fair-use category of the existing project policy, without claiming publisher permission. Eight active covers still have unknown origins/use evidence; all original acquisition histories remain unknown.

An explicit game-ID/filename link in `sources.yaml` takes precedence over inferred naming. This preserves an association when sourced title/year metadata is corrected. Codenames' old 2016 filename is retained in the archive and provenance history after its original publication was corrected to 2015 and a documented replacement acquired. An association does not establish the cover's exact printing or origin. Lookup validates that the recorded filename stays within the image directory and uses a supported format.

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

Unknown information remains explicit. Web uploads create an explicitly unverified provenance entry with measured dimensions and upload date. Source/permission fields remain null until evidence is supplied. Replacement retains earlier metadata in `history`; both the uploader and fetch tool use the same locked atomic writer. Existing files are not proof of permission.

Entries with `review_status` beginning `quarantined` are excluded from both lookup paths, including inferred filename matches. Keep their `archived_file` and hash as evidence. A separately reviewed replacement can supersede the quarantine while retaining the previous entry in history.

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

The dedicated `fetch_image.py SLUG --url IMAGE_URL --license LICENSE` tool fully decodes JPEG/PNG/WebP with Pillow, chooses the extension from those bytes, saves the canonical game name/year filename, and records source page, exact image URL, hash and dimensions. Invalid/truncated/unsupported files are rejected before writing. Use actual source evidence and the policy’s license labels; it does not establish permission by itself. Read its options before using `--force`, which can replace existing assets/provenance. The web uploader uses the same naming and provenance path; upload responses and both API paths reflect the image immediately.
