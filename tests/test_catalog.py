import csv
import tempfile
import unittest
from pathlib import Path

from scripts.catalog import CSV_FIELDS, IdentityIndex, build_catalog
from scripts.reconcile_records import repair_text
from scripts.yaml_utils import load_yaml
from scripts.update_master_status import update_row


class IdentityTests(unittest.TestCase):
    def setUp(self):
        self.index = IdentityIndex({
            "dune": {"name": "Dune", "year": 2019},
            "dune-1979": {"name": "Dune", "year": 1979, "alternate_names": ["Dune: The Board Game"]},
            "example": {"name": "Example", "year": 2020},
        })

    def test_same_title_editions_require_year_or_explicit_mapping(self):
        self.assertEqual(self.index.resolve({"name": "Dune"}), (None, "ambiguous_identity"))
        self.assertEqual(self.index.resolve({"name": "Dune", "year": "1979"}), ("dune-1979", "exact"))
        self.assertEqual(self.index.resolve({"name": "Dune", "year": "2021"}), (None, "year_conflict"))
        self.assertEqual(self.index.resolve({"name": "Dune", "yaml_id": "dune"}), ("dune", "explicit"))

    def test_bad_mapping_and_exclusions_do_not_fall_back_to_names(self):
        self.assertEqual(self.index.resolve({"name": "Example", "yaml_id": "missing"}), (None, "missing_mapping"))
        self.assertEqual(self.index.resolve({"name": "Example", "status": "failed"}), (None, "excluded"))
        self.assertEqual(self.index.resolve({"name": "Dune: The Board Game"}), ("dune-1979", "exact"))

    def test_status_updates_require_an_unambiguous_edition(self):
        rows = [dict(name="Dune", year="1979", yaml_id=""), dict(name="Dune", year="2019", yaml_id="")]
        with self.assertRaises(ValueError):
            update_row(rows, "Dune", yaml_id="dune")
        self.assertEqual([r['yaml_id'] for r in rows], ['', ''])
        self.assertTrue(update_row(rows, "Dune", year="1979", yaml_id="dune-1979"))
        self.assertEqual([r['yaml_id'] for r in rows], ['dune-1979', ''])

    def test_catalog_preserves_editions_multiline_notes_and_exclusions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rows = [
                dict(name="Dune", year="1979", notes="First line\nSecond, quoted line"),
                dict(name="Dune", year="2019"),
                dict(name="Dune", year="2019"),
                dict(name="Example", year="2020", status="failed", notes="Needs research"),
            ]
            with (root / "master_list.csv").open("w", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
                writer.writeheader()
                writer.writerows(rows)
            report = build_catalog(root, self.index.games)
            self.assertEqual((report["csv_rows"], report["total"], report["researched"], report["excluded"], report["pending"]), (4, 3, 2, 1, 0))
            self.assertTrue(any("\n" in g["notes"] for g in report["games"]))
            self.assertEqual(report["unmatched_game_ids"], ["example"])


class RepairTests(unittest.TestCase):
    def test_discovery_presets_only_reference_current_schema_evokes(self):
        from scripts.catalog import ROOT
        schema = load_yaml((ROOT / 'schema.yaml').read_text())
        for preset in schema['discovery_presets']:
            self.assertTrue(preset['label'])
            self.assertTrue(preset['description'])
            self.assertTrue(set(preset['evokes']) <= set(schema['evokes']['values']))

    def test_repairs_preserve_comments_history_ratings_and_large_groups(self):
        original = '''id: 007
name: Example
alternate_names:
  - Example: An Adventure
publisher:
categories: []
evokes: [Clever, Tension, Rivalry, Agency, Complete]
possible_counts: [2, 16, 30]
true_counts: [16]
affinity: 4 # Owner's actual rating
hotness: 2
plays_tracked: {total_plays: 9, configs: []}
'''
        updated, changes = repair_text(original, "007")
        game = load_yaml(updated)
        self.assertEqual(game["id"], "007")
        self.assertEqual(game["alternate_names"], ["Example: An Adventure"])
        self.assertEqual(game["publisher"], [])
        self.assertIn("affinity: 4 # Owner's actual rating", updated)
        self.assertIn("possible_counts: [2, 16, 30]", updated)
        self.assertEqual(repair_text(updated, "007"), (updated, {}))


if __name__ == "__main__":
    unittest.main()
