import csv
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.scrape_wikidata import FIELDS, PAGE_SIZE, fetch_page, import_page


class WikidataTests(unittest.TestCase):
    def test_raw_binding_count_controls_pagination_even_when_labels_are_skipped(self):
        bindings = [{"gameLabel": {"value": "Q123"}} for _ in range(PAGE_SIZE)]
        with patch("scripts.scrape_wikidata.requests.get") as get:
            get.return_value.json.return_value = {"results": {"bindings": bindings}}
            rows, count = fetch_page(0)
        self.assertEqual(rows, [])
        self.assertEqual(count, PAGE_SIZE)

    def test_same_title_editions_from_a_page_keep_distinct_years(self):
        bindings = [dict(gameLabel={"value": "Dune"}, date={"value": f"{year}-01-01T00:00:00Z"}) for year in (1979, 2019)]
        with patch("scripts.scrape_wikidata.requests.get") as get:
            get.return_value.json.return_value = {"results": {"bindings": bindings}}
            rows, count = fetch_page(0)
        self.assertEqual([row['year'] for row in rows], ['1979', '2019'])
        self.assertEqual(count, 2)

    def test_editorial_columns_survive_and_replaying_a_page_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "catalog.csv"
            state_path = Path(directory) / "state.json"
            original = dict.fromkeys(FIELDS, "") | dict(bgg_id="123", name="Example", year="2020", type="boardgame", status="failed", notes='A "quoted", multiline\nnote', yaml_id="example")
            with output.open("w", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=FIELDS)
                writer.writeheader()
                writer.writerow(original)
            rows = [dict(bgg_id="123", name="Alias", year="2020", type="boardgame"), dict(bgg_id="", name="New", year="2021", type="boardgame")]
            added, state = import_page({"offset": 0, "done": False}, rows, PAGE_SIZE, output, state_path)
            self.assertEqual((added, state), (1, {"offset": PAGE_SIZE, "done": False}))
            self.assertEqual(import_page({"offset": 0}, rows, PAGE_SIZE, output, state_path)[0], 0)
            with output.open(newline="") as handle:
                saved = list(csv.DictReader(handle))
            self.assertEqual(saved[0], original)
            self.assertEqual(json.loads(state_path.read_text())["offset"], PAGE_SIZE)

    def test_legacy_header_is_rejected_without_modifying_csv_or_state(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "catalog.csv"
            output.write_text("bgg_id,name,year,type\n,Old,2000,boardgame\n")
            original = output.read_bytes()
            state = Path(directory) / "state.json"
            with self.assertRaises(ValueError):
                import_page({"offset": 0}, [], 0, output, state)
            self.assertEqual(output.read_bytes(), original)
            self.assertFalse(state.exists())
