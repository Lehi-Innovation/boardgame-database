import contextlib
import io
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

import yaml

from scripts.validate_catalog import ROOT, audit, main, validate_game, validate_mappings
from scripts.yaml_utils import load_yaml


class CatalogValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = load_yaml((ROOT / "schema.yaml").read_text())

    def game(self):
        game = deepcopy(self.schema["template"])
        game.update(id="example", name="Example", categories=[self.schema["categories"]["styles"][0]],
                    evokes=self.schema["evokes"]["values"][:5], possible_counts=[2, 3], true_counts=[2])
        return game

    def codes(self, game):
        return {item["code"] for item in validate_game(game, Path("example.yaml"), self.schema)}

    def test_schema_template_with_valid_values_passes(self):
        self.assertEqual(self.codes(self.game()), set())

    def test_unknown_experience_can_be_empty_but_partial_tag_lists_fail(self):
        self.assertEqual(self.codes(self.game() | {"evokes": []}), set())
        for count in (1, 2, 3, 4, 6):
            with self.subTest(count=count):
                self.assertIn("evokes_count", self.codes(self.game() | {
                    "evokes": self.schema["evokes"]["values"][:count]}))

    def test_numeric_ids_including_leading_zero_are_reported(self):
        result = validate_game(self.game() | {"id": 7}, Path("007.yaml"), self.schema)
        self.assertEqual(result[0]["code"], "record_id")
        self.assertIn("'007'", result[0]["message"])

    def test_matching_lowercase_unicode_slug_is_valid(self):
        self.assertEqual(validate_game(self.game() | {"id": "metsämies"}, "metsämies.yaml", self.schema), [])

    def test_schema_changes_are_used_without_copied_vocabulary(self):
        schema = deepcopy(self.schema)
        schema["categories"]["styles"].append("Fixture style")
        schema["evokes"]["values"].append("Fixture feeling")
        game = self.game() | {"categories": ["Fixture style"], "evokes": ["Fixture feeling"] + self.schema["evokes"]["values"][:4]}
        self.assertEqual(validate_game(game, "example.yaml", schema), [])

    def test_unknown_values_and_bad_ratings_are_reported(self):
        game = self.game() | {"categories": ["Unlisted"], "evokes": ["Unknown"] * 5,
                              "length": True, "feel": 5}
        self.assertEqual(self.codes(game), {"category", "evokes_count", "evoke", "rating"})

    def test_player_count_types_and_supported_recommendations(self):
        game = self.game() | {"possible_counts": [True, "2"], "true_counts": [4]}
        self.assertEqual(self.codes(game), {"player_count", "recommended_count"})

    def test_exact_large_group_counts_survive_without_an_upper_cap(self):
        game = self.game() | {"possible_counts": [2, 16, 30, "12+"], "true_counts": [16, 30]}
        self.assertEqual(self.codes(game), set())
        game["possible_counts"] = [0, -1, True, "16"]
        self.assertIn("player_count", self.codes(game))

    def test_invalid_lists_numbers_and_playtime_range(self):
        game = self.game() | {"designer": "A designer", "categories": [{}], "min_age": False,
                              "min_playtime": 60, "max_playtime": 30}
        self.assertEqual(self.codes(game), {"list_type", "list_value", "number", "playtime_range"})

    def test_legacy_optional_fields_are_not_required(self):
        game = self.game()
        for field in ("plays_tracked", "alternate_names", "artist", "upgrades", "value"):
            del game[field]
        self.assertEqual(self.codes(game), set())

    def test_nested_duplicate_yaml_keys_are_rejected(self):
        with self.assertRaises(yaml.constructor.ConstructorError):
            load_yaml("plays_tracked:\n  total_plays: 1\n  total_plays: 2\n")

    def test_csv_mapping_checks_do_not_guess_from_names(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "master_list.csv"
            path.write_text("bgg_id,name,year,type,status,notes,yaml_id\n,Example,,,done,,missing\n,Example (different edition),2026,boardgame,,,\n")
            issues = validate_mappings(path, {"example"})
            self.assertEqual({item["code"] for item in issues}, {"csv_status", "csv_mapping"})

    def test_cli_errors_for_a_missing_selected_file(self):
        with tempfile.TemporaryDirectory() as directory, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(main(["--games", str(Path(directory) / "missing.yaml")]), 1)

    def test_fixture_audit_preserves_historical_references_as_warnings(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "schema.yaml").write_text(yaml.safe_dump(self.schema))
            (root / "games").mkdir()
            (root / "games" / "example.yaml").write_text(yaml.safe_dump(self.game()))
            (root / "master_list.csv").write_text("bgg_id,name,year,type,status,notes,yaml_id\n,Example,,,,,example\n")
            (root / "sources").mkdir()
            evidence = dict(timestamp="2026-10-27T20:15:00Z", game_id="historical-id",
                            url="https://example.test", description="Original evidence")
            (root / "sources" / "research-log.yaml").write_text(yaml.safe_dump({"entries": [evidence]}))
            report = audit(root)
            self.assertEqual(report["checked"], {"games": 1, "catalogs": 1, "log_entries": 1})
            self.assertEqual(report["errors"], 0)
            self.assertEqual(report["warnings"], 1)
            self.assertEqual(report["issues"][0]["code"], "historical_log_id")


if __name__ == "__main__":
    unittest.main()
