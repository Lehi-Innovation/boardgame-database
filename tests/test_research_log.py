"""Regression checks for evidence preservation and concurrent log updates."""

import contextlib
import io
import json
import multiprocessing
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

from scripts.research_log import append_entries, log_lock, main, read_log


def entry(slug="example", **changes):
    result = dict(
        timestamp="2026-10-27T20:15:00Z", game_id=slug,
        url='https://example.test/game?q="quoted"&path=one\\two',
        description='Publisher notes: "quoted", café, \\path\nSecond line.',
    )
    return result | changes


def concurrent_writer(path, number, barrier):
    barrier.wait(timeout=20)
    append_entries([entry(f"game-{number}")], path=path)


class ResearchLogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "research-log.yaml"

    def test_new_and_empty_log_round_trip(self):
        self.assertEqual(append_entries([entry()], self.path), 1)
        self.assertEqual(read_log(self.path.read_text()), [entry()])
        self.path.write_text("# Keep this explanation\nentries: []\n")
        append_entries([entry()], self.path)
        self.assertTrue(self.path.read_text().startswith("# Keep this explanation\n"))
        self.assertEqual(read_log(self.path.read_text()), [entry()])

    def test_append_preserves_existing_bytes_and_batch_order(self):
        append_entries([entry()], self.path)
        original = "# Historical note\n" + self.path.read_text().rstrip("\n")
        self.path.write_text(original)
        additions = [entry("second"), entry("third", context="Additional evidence retained")]
        append_entries(additions, self.path)
        self.assertTrue(self.path.read_text().startswith(original + "\n"))
        self.assertEqual(read_log(self.path.read_text()), [entry()] + additions)

    def test_append_supports_existing_indentless_block_list(self):
        original = yaml.safe_dump({"entries": [entry()]}, sort_keys=False)
        self.path.write_text(original)
        append_entries([entry("second")], self.path)
        self.assertTrue(self.path.read_text().startswith(original))
        self.assertEqual(read_log(self.path.read_text()), [entry(), entry("second")])

    def test_append_preserves_crlf_bytes_and_unicode_slug(self):
        append_entries([entry()], self.path)
        original = self.path.read_bytes().replace(b"\n", b"\r\n")
        self.path.write_bytes(original)
        append_entries([entry("metsämies")], self.path)
        self.assertTrue(self.path.read_bytes().startswith(original))
        self.assertEqual(read_log(self.path.read_text()), [entry(), entry("metsämies")])

    def test_refuses_malformed_and_duplicate_key_logs_without_modifying_them(self):
        for original in (
            "entries:\n- game_id: broken\n",
            "entries: []\nentries: []\n",
            "entries: []\n- game_id: mixed-format\n",
        ):
            with self.subTest(original=original):
                self.path.write_text(original)
                with self.assertRaises((ValueError, yaml.YAMLError)):
                    append_entries([entry()], self.path)
                self.assertEqual(self.path.read_text(), original)

    def test_rejects_bad_entries_before_creating_log(self):
        for changes in (
            {"game_id": "../unsafe"}, {"timestamp": "2026-10-27"},
            {"timestamp": "2026-02-30T00:00:00Z"}, {"url": "file:///tmp/game"},
            {"url": "https://example.test/line\nbreak"}, {"description": ""},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                append_entries([entry(**changes)], self.path)
        self.assertFalse(self.path.exists())

    def test_failed_replace_leaves_original_and_cleans_temporary_file(self):
        append_entries([entry()], self.path)
        original = self.path.read_bytes()
        with patch("scripts.research_log.os.replace", side_effect=OSError("disk failure")):
            with self.assertRaises(OSError):
                append_entries([entry("second")], self.path)
        self.assertEqual(self.path.read_bytes(), original)
        self.assertFalse(list(self.path.parent.glob("*.tmp")))

    def test_lock_times_out_without_writing(self):
        with log_lock(self.path):
            with self.assertRaises(TimeoutError):
                with log_lock(self.path, timeout=0):
                    self.fail("A second lock unexpectedly succeeded")
        self.assertFalse(self.path.exists())

    def test_concurrent_processes_keep_every_entry(self):
        append_entries([entry()], self.path)
        original = self.path.read_bytes()
        context = multiprocessing.get_context("spawn")
        barrier = context.Barrier(4)
        processes = [context.Process(target=concurrent_writer, args=(self.path, i, barrier)) for i in range(4)]
        try:
            for process in processes:
                process.start()
            for process in processes:
                process.join(timeout=30)
                self.assertEqual(process.exitcode, 0)
        finally:
            for process in processes:
                if process.is_alive():
                    process.terminate()
                    process.join()
        self.assertTrue(self.path.read_bytes().startswith(original))
        self.assertEqual({row["game_id"] for row in read_log(self.path.read_text())},
                         {"example", "game-0", "game-1", "game-2", "game-3"})

    def test_empty_batch_does_not_create_files(self):
        self.assertEqual(append_entries([], self.path), 0)
        self.assertEqual(list(self.path.parent.iterdir()), [])

    def test_json_cli_appends_canonical_entries(self):
        evidence = self.path.parent / "evidence.json"
        evidence.write_text(json.dumps([entry()]))
        with patch("scripts.research_log.LOG_PATH", self.path), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(main(["--from-json", str(evidence)]), 0)
        self.assertEqual(read_log(self.path.read_text()), [entry()])

    def test_json_cli_rejects_non_list_input_without_creating_log(self):
        evidence = self.path.parent / "evidence.json"
        evidence.write_text(json.dumps(entry()))
        with patch("scripts.research_log.LOG_PATH", self.path), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(main(["--from-json", str(evidence)]), 1)
        self.assertFalse(self.path.exists())


if __name__ == "__main__":
    unittest.main()
