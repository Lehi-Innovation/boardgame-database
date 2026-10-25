"""Regression tests for the derived legacy SQLite cache.

Run with ``python3 -m unittest discover -s tests -p test_legacy_db.py``.
Every build and server in this module uses a temporary catalog and database.
"""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock
from urllib.error import URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
BUILDER_PATH = ROOT / "scripts" / "build_db.py"
SERVER_PATH = ROOT / "web" / "server.js"


def load_builder():
    spec = importlib.util.spec_from_file_location("legacy_build_db_under_test", BUILDER_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def source_digest(source_dir):
    """Independent implementation of the specified canonical digest format."""
    files = sorted(source_dir.glob("*.yaml"), key=lambda p: p.name.encode("utf-8"))
    digest = hashlib.sha256()
    for path in files:
        digest.update(path.name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class LegacyDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="legacy-db-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "games"
        self.output = self.root / "cache"
        self.source.mkdir()
        self.output.mkdir()
        self.db_path = self.output / "games.db"
        self.write_game("zeta.yaml", "alpha", "Alpha", "Fantasy")
        self.write_game("épsilon.yaml", "beta", "Beta", "Mystery")

    def write_game(self, filename, game_id, name, evoke):
        (self.source / filename).write_text(
            f"id: {json.dumps(game_id)}\n"
            f"name: {name}\n"
            "year: 2020\n"
            "designer: [Ada]\n"
            "categories: [Cooperative]\n"
            f"evokes: [{evoke}]\n"
            "true_counts: [2]\n"
            "upgrades:\n"
            "  - name: Deluxe\n"
            "    year: 2022\n",
            encoding="utf-8",
        )

    def build(self):
        return subprocess.run(
            [sys.executable, str(BUILDER_PATH), "--source-dir", str(self.source),
             "--destination", str(self.db_path)],
            cwd=ROOT, capture_output=True, text=True,
        )

    def assert_build_failed_preserving_cache(self, result, previous_hash, filename=None):
        self.assertNotEqual(result.returncode, 0, result.stdout)
        if filename:
            self.assertIn(filename, result.stderr)
        self.assertEqual(sha256(self.db_path), previous_hash)
        with sqlite3.connect(self.db_path) as conn:
            self.assertEqual({row[0] for row in conn.execute("SELECT id FROM games")},
                             {"alpha", "beta"})
        extra_files = [p.name for p in self.output.iterdir()
                       if p.name != self.db_path.name and not p.name.endswith(".lock")]
        self.assertEqual(extra_files, [], f"staging files remain: {extra_files}")

    def good_cache_hash(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        return sha256(self.db_path)

    def test_success_metadata_membership_children_and_repeat_build(self):
        self.good_cache_hash()
        with sqlite3.connect(self.db_path) as conn:
            self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone(), ("ok",))
            self.assertEqual(conn.execute("PRAGMA foreign_key_check").fetchall(), [])
            self.assertEqual({row[0] for row in conn.execute("SELECT id FROM games")},
                             {"alpha", "beta"})
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM games").fetchone(), (2,))
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM game_designers").fetchone(), (2,))
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM game_categories").fetchone(), (2,))
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM game_evokes").fetchone(), (2,))
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM game_upgrades").fetchone(), (2,))
            self.assertEqual(conn.execute(
                "SELECT id, source_file_count, digest_format_version, source_digest "
                "FROM build_metadata").fetchone(), (1, 2, 1, source_digest(self.source)))
        self.assertEqual(self.build().returncode, 0)
        with sqlite3.connect(self.db_path) as conn:
            self.assertEqual({row[0] for row in conn.execute("SELECT id FROM games")},
                             {"alpha", "beta"})

    def test_nested_insert_failure_keeps_previous_database(self):
        previous_hash = self.good_cache_hash()
        (self.source / "broken.yaml").write_text(
            "id: broken\nname: Broken\ncategories: [Cooperative]\n"
            "upgrades:\n  - name: [invalid, sqlite, value]\n", encoding="utf-8")
        result = self.build()
        self.assert_build_failed_preserving_cache(result, previous_hash, "broken.yaml")
        self.assertIn("insertion failed", result.stderr.lower())

    def test_invalid_yaml_and_required_fields_keep_previous_database(self):
        previous_hash = self.good_cache_hash()
        cases = {
            "malformed.yaml": "id: bad\nname: [unterminated\n",
            "missing-id.yaml": "name: Missing ID\n",
            "missing-name.yaml": "id: missing-name\n",
            "zz-duplicate.yaml": "id: alpha\nname: Duplicate\n",
            "unquoted-id.yaml": "id: 007\nname: Unquoted ID\n",
            "boolean-id.yaml": "id: true\nname: Boolean ID\n",
        }
        for filename, contents in cases.items():
            with self.subTest(filename=filename):
                path = self.source / filename
                path.write_text(contents, encoding="utf-8")
                try:
                    self.assert_build_failed_preserving_cache(
                        self.build(), previous_hash, filename)
                finally:
                    path.unlink()

    def test_yaml_loader_rejects_non_string_ids_without_coercion(self):
        (self.source / "unquoted.yaml").write_text(
            "id: 007\nname: Unquoted\n", encoding="utf-8")
        script = (
            "require('./web/lib/yaml-handler.js').loadAllGames()"
            ".then(games => console.log(JSON.stringify(games.map(game => game.id))));"
        )
        env = {**os.environ, "BOARDGAME_GAMES_DIR": str(self.source)}
        result = subprocess.run(["node", "-e", script], cwd=ROOT,
                                env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(set(json.loads(result.stdout)), {"alpha", "beta"})
        self.assertIn("unquoted.yaml", result.stderr)

    def test_quoted_numeric_ids_survive_sqlite_and_real_http_reads(self):
        numeric_ids = ["007", "7", "0", "1829", "9007199254740993123"]
        for game_id in numeric_ids:
            self.write_game(f"{game_id}.yaml", game_id, f"Numeric {game_id}", "Mystery")
        self.good_cache_hash()
        expected = {"alpha", "beta", *numeric_ids}
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("SELECT id, typeof(id) FROM games").fetchall()
            self.assertEqual({row[0] for row in rows}, expected)
            self.assertTrue(all(row[1] == "text" for row in rows))
        process, port = self.start_server()
        self.assertIsNone(process.poll())
        for endpoint in ["/api/games", "/api/games/query"]:
            result = self.get_json(port, endpoint)
            games = result if isinstance(result, list) else result["games"]
            self.assertEqual({game["id"] for game in games}, expected)
            self.assertTrue(all(type(game["id"]) is str for game in games))
        for game_id in numeric_ids:
            game = self.get_json(port, f"/api/games/{game_id}")
            self.assertEqual(game["id"], game_id)
            self.assertEqual(game["name"], f"Numeric {game_id}")

    def test_source_change_during_build_keeps_previous_database(self):
        previous_hash = self.good_cache_hash()
        builder = load_builder()
        original_insert = builder.insert_game
        changed = False

        def changing_insert(cursor, game):
            nonlocal changed
            original_insert(cursor, game)
            if not changed:
                changed = True
                with (self.source / "zeta.yaml").open("ab") as file:
                    file.write(b"\n# changed during build\n")

        with mock.patch.object(builder, "insert_game", side_effect=changing_insert):
            with self.assertRaisesRegex(Exception, "(?i)(chang|digest|source)"):
                builder.build_database(self.source, self.db_path)
        self.assertTrue(changed)
        self.assertEqual(sha256(self.db_path), previous_hash)
        self.assertEqual([p.name for p in self.output.iterdir()
                          if p.name != self.db_path.name and not p.name.endswith(".lock")], [])

    def test_membership_validation_failure_keeps_previous_database(self):
        previous_hash = self.good_cache_hash()
        builder = load_builder()
        original_validate = builder.validate_staged_database

        def corrupt_membership(conn, expected_ids, expected_count):
            conn.execute("INSERT INTO games (id, name) VALUES (?, ?)", ("extra", "Extra"))
            conn.commit()
            return original_validate(conn, expected_ids, expected_count)

        with mock.patch.object(builder, "validate_staged_database",
                               side_effect=corrupt_membership):
            with self.assertRaises(Exception):
                builder.build_database(self.source, self.db_path)
        self.assertEqual(sha256(self.db_path), previous_hash)
        self.assertEqual([p.name for p in self.output.iterdir()
                          if p.name != self.db_path.name and not p.name.endswith(".lock")], [])

    def test_explicit_validation_error_keeps_previous_database(self):
        previous_hash = self.good_cache_hash()
        builder = load_builder()
        with mock.patch.object(builder, "validate_staged_database",
                               side_effect=RuntimeError("forced integrity failure")):
            with self.assertRaisesRegex(RuntimeError, "integrity failure"):
                builder.build_database(self.source, self.db_path)
        self.assertEqual(sha256(self.db_path), previous_hash)
        self.assertEqual([p.name for p in self.output.iterdir()
                          if p.name != self.db_path.name and not p.name.endswith(".lock")], [])

    def test_foreign_key_validator_rejects_orphaned_child(self):
        self.good_cache_hash()
        builder = load_builder()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT INTO game_categories (game_id, category) VALUES (?, ?)",
                         ("missing", "Orphan"))
            conn.commit()
            with self.assertRaisesRegex(ValueError, "foreign_key_check"):
                builder.validate_staged_database(conn, {"alpha", "beta"}, 2)

    def free_port(self):
        try:
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                return sock.getsockname()[1]
        except PermissionError:
            self.skipTest("sandbox disallows loopback sockets")

    def check_node_init(self, db_path=None):
        """Exercise web/lib/db.js in a new process, as startup does."""
        script = (
            "const db = require('./web/lib/db.js'); "
            "db.init({dbPath: process.argv[1], gamesDir: process.argv[2]}) "
            ".then(() => { console.log(JSON.stringify(db.getFilteredGames().games.map(g => g.id))); }) "
            ".catch(err => { console.error(err.message); process.exit(1); });"
        )
        return subprocess.run(
            ["node", "-e", script, str(db_path or self.db_path), str(self.source)],
            cwd=ROOT, capture_output=True, text=True,
        )

    def test_legacy_query_layer_rejects_missing_stale_or_invalid_cache(self):
        self.good_cache_hash()
        success = self.check_node_init()
        self.assertEqual(success.returncode, 0, success.stderr)
        self.assertEqual(set(json.loads(success.stdout)), {"alpha", "beta"})

        missing = self.check_node_init(self.output / "missing.db")
        self.assertNotEqual(missing.returncode, 0)
        self.assertIn("python3 scripts/build_db.py", missing.stderr)

        original = self.db_path.read_bytes()
        mutations = {
            "missing metadata": "DROP TABLE build_metadata",
            "unknown format": "UPDATE build_metadata SET digest_format_version = 999",
            "count mismatch": "UPDATE build_metadata SET source_file_count = 999",
            "digest mismatch": "UPDATE build_metadata SET source_digest = 'bad'",
        }
        for name, sql in mutations.items():
            with self.subTest(name=name):
                self.db_path.write_bytes(original)
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute(sql)
                rejected = self.check_node_init()
                self.assertNotEqual(rejected.returncode, 0)
                self.assertIn("python3 scripts/build_db.py", rejected.stderr)

        self.db_path.write_bytes(b"not a SQLite database")
        corrupt = self.check_node_init()
        self.assertNotEqual(corrupt.returncode, 0)
        self.assertIn("python3 scripts/build_db.py", corrupt.stderr)

        self.db_path.write_bytes(original)
        with (self.source / "zeta.yaml").open("ab") as file:
            file.write(b"\n# stale bytes\n")
        stale = self.check_node_init()
        self.assertNotEqual(stale.returncode, 0)
        self.assertIn("python3 scripts/build_db.py", stale.stderr)

    def start_server(self):
        port = self.free_port()
        env = os.environ.copy()
        env.update({"PORT": str(port), "BOARDGAME_DB_PATH": str(self.db_path),
                    "BOARDGAME_GAMES_DIR": str(self.source)})
        process = subprocess.Popen(
            ["node", str(SERVER_PATH)], cwd=ROOT / "web", env=env,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        self.addCleanup(self.stop_server, process)
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if process.poll() is not None:
                return process, port
            try:
                with urlopen(f"http://127.0.0.1:{port}/api/games/query", timeout=0.2) as response:
                    if response.status == 200:
                        return process, port
            except (URLError, TimeoutError, ConnectionError):
                time.sleep(0.05)
        self.fail("legacy server did not start within 10 seconds")

    @staticmethod
    def stop_server(process):
        if process.poll() is None:
            process.terminate()
            try:
                process.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.communicate(timeout=5)

    def get_json(self, port, endpoint):
        with urlopen(f"http://127.0.0.1:{port}{endpoint}", timeout=5) as response:
            self.assertEqual(response.status, 200)
            return json.load(response)

    def test_server_refuses_stale_cache_and_uses_rebuild_after_restart(self):
        self.good_cache_hash()
        process, port = self.start_server()
        self.assertIsNone(process.poll())
        result = self.get_json(port, "/api/games/query")
        self.assertEqual({game["id"] for game in result["games"]}, {"alpha", "beta"})
        self.assertEqual({(row["evoke"], row["count"]) for row in
                          self.get_json(port, "/api/evokes/counts")},
                         {("Fantasy", 1), ("Mystery", 1)})
        self.assertIn("Cooperative", self.get_json(port, "/api/filter-options")["mechanics"])
        self.stop_server(process)

        (self.source / "épsilon.yaml").unlink()
        self.write_game("gamma.yaml", "gamma", "Gamma", "Adventure")
        stale_process, stale_port = self.start_server()
        self.assertNotEqual(stale_process.poll(), None,
                            "stale cache served an HTTP query")
        self.assertNotEqual(stale_process.returncode, 0)
        stdout, stderr = stale_process.communicate(timeout=5)
        self.assertIn("python3 scripts/build_db.py", stderr + stdout)

        self.assertEqual(self.build().returncode, 0)
        rebuilt_process, rebuilt_port = self.start_server()
        self.assertIsNone(rebuilt_process.poll())
        result = self.get_json(rebuilt_port, "/api/games/query")
        self.assertEqual({game["id"] for game in result["games"]}, {"alpha", "gamma"})
        self.assertIn("Adventure", [row["evoke"] for row in
                                    self.get_json(rebuilt_port, "/api/evokes/counts")])
        self.assertNotIn("beta", {game["id"] for game in result["games"]})


if __name__ == "__main__":
    unittest.main()
