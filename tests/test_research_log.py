"""Check that the historical citation log stays readable without losing sources."""

import hashlib
import json
from pathlib import Path
import unittest

import yaml


ROOT = Path(__file__).resolve().parents[1]


def citations(entry):
    if "url" in entry:
        return [[entry["game_id"], entry["url"], entry["description"],
                 entry.get("timestamp", entry.get("date"))]]
    if "urls" in entry:
        return [[entry["game_id"], source["url"], source["note"], entry["date"]]
                for source in entry["urls"]]
    return [citation for source in entry["sources"] for citation in citations(source)]


class ResearchLogTests(unittest.TestCase):
    def test_log_is_one_entries_mapping_with_correct_group_boundaries(self):
        log = yaml.safe_load((ROOT / "sources/research-log.yaml").read_bytes())
        self.assertIsInstance(log, dict)
        entries = log["entries"]
        self.assertIsInstance(entries, list)
        calico = next(entry for entry in entries if entry["game_id"] == "calico")
        self.assertEqual(len(calico["urls"]), 7)
        campaign = next(entry for entry in entries
                        if entry["game_id"] == "campaign-manager-2008")
        self.assertEqual(campaign["date"], "2026-02-20")
        self.assertEqual(len(campaign["sources"]), 5)
        self.assertTrue(all(entry["game_id"] == "campaign-manager-2008"
                            for entry in campaign["sources"]))
        self.assertTrue(any(entry["game_id"] == "cafe-baras" for entry in entries))
        self.assertTrue(any(entry["game_id"] == "captain-flip" for entry in entries))
        self.assertTrue(any(entry["game_id"] == "klask" for entry in entries))

    def test_all_recovered_citations_keep_their_values_and_order(self):
        log = yaml.safe_load((ROOT / "sources/research-log.yaml").read_bytes())
        recovered = [citation for entry in log["entries"] for citation in citations(entry)]
        # Freeze the original 2,510 citations; later appends can extend the log.
        # Includes game ID, URL, exact note/description, and original date precision.
        historical = recovered[:2510]
        raw = json.dumps(historical, ensure_ascii=False, separators=(",", ":")).encode()
        self.assertEqual(len(historical), 2510)
        self.assertEqual(hashlib.sha256(raw).hexdigest(),
                         "436c0c9430e6daf9b07996defe4655ac2fadf646ac8b621022c2e02a6ece4aa7")


if __name__ == "__main__":
    unittest.main()
