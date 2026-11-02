import tempfile
import unittest
import contextlib
import io
import struct
from pathlib import Path
from unittest.mock import patch

import yaml

from scripts.image_assets import find_image, image_basename, record_provenance
from scripts import fetch_image


class ImageTests(unittest.TestCase):
    def test_fetch_failure_restores_prior_art_or_removes_new_art(self):
        data = b'\x89PNG\r\n\x1a\n' + b'\x00' * 8 + struct.pack('>II', 500, 500)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'Example (2020).png'
            for prior in (None, b'original-art-bytes'):
                if prior is not None:
                    path.write_bytes(prior)
                with patch.object(fetch_image, 'IMAGES_DIR', directory), \
                     patch.object(fetch_image, 'load_game', return_value=dict(name='Example', year=2020, publisher=[])), \
                     patch.object(fetch_image, 'download', return_value=(data, 'image/png')), \
                     patch.object(fetch_image, 'slug_in_sources', return_value=False), \
                     patch.object(fetch_image, 'record_provenance', side_effect=OSError('Cannot record provenance')), \
                     patch('sys.argv', ['fetch_image', 'example', '--url', 'https://publisher.example/cover.png', '--license', 'fair-use', '--force']), \
                     contextlib.redirect_stdout(io.StringIO()):
                    with self.assertRaises(OSError):
                        fetch_image.main()
                self.assertEqual(path.read_bytes() if path.exists() else None, prior)

    def test_punctuation_unicode_case_and_legacy_upload_names_match(self):
        game = {"name": "Clank! Legacy: Acquisitions Incorporated", "year": 2019}
        legacy = "Clank_ Legacy_ Acquisitions Incorporated (2019).jpg"
        canonical = "Clank! Legacy: Acquisitions Incorporated (2019).png"
        self.assertEqual(find_image(game, [legacy, "README.md"]), legacy)
        self.assertEqual(find_image(game, [legacy, canonical]), canonical)
        self.assertEqual(find_image({"name": "Élan/Go", "year": 2020}, ["ÉLAN_GO (2020).WEBP"]), "ÉLAN_GO (2020).WEBP")
        self.assertEqual(image_basename({"name": "../Bad\\Name", "year": 2020}), ".._Bad_Name (2020)")
        self.assertIsNone(image_basename({"name": "Undated", "year": None}))

    def test_explicit_inventory_links_survive_sourced_title_or_year_corrections(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'sources.yaml'
            source.write_text('example:\n  file: Example (2021).png\n')
            game = dict(id='example', name='Example', year=2020)
            self.assertEqual(find_image(game, ['Example (2021).png'], source), 'Example (2021).png')
            source.write_text('example:\n  file: ../outside.png\n')
            self.assertIsNone(find_image(game, ['../outside.png'], source))

    def test_atomic_provenance_quotes_and_replacement_history(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "games").mkdir()
            (root / "games/example.yaml").write_text("id: example\n")
            (root / "images").mkdir()
            entry = dict(file="Example (2020).jpg", source_url=None, license=None, notes='A "quoted" note\nNext line')
            record_provenance("example", entry, root)
            path = root / "images/sources.yaml"
            original = path.read_bytes()
            with self.assertRaises(ValueError):
                record_provenance("example", entry, root)
            with patch("scripts.image_assets.os.replace", side_effect=OSError("replacement failed")):
                with self.assertRaises(OSError):
                    record_provenance("example", entry | {"notes": "Replacement"}, root, replace=True)
            self.assertEqual(path.read_bytes(), original)
            record_provenance("example", entry | {"notes": "Replacement"}, root, replace=True)
            result = yaml.safe_load(path.read_text())["example"]
            self.assertEqual(result["history"], [entry])
            self.assertEqual(list((root / "images").glob(".sources-*.tmp")), [])
