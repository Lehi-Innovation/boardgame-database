"""Exercise the real Express/SQLite/upload paths in an isolated tiny repository."""
import csv
import json
import os
import shutil
import socket
import struct
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request
import zlib
from pathlib import Path

from scripts.build_db import ROOT, build_database
from scripts.catalog import CSV_FIELDS, build_catalog


@unittest.skipUnless(shutil.which("node") and (ROOT / "web/node_modules/sharp").exists(),
                     "Run npm ci in web/ to enable isolated web integration tests")
class WebIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temporary.name)
        shutil.copytree(ROOT / "web", cls.root / "web", ignore=shutil.ignore_patterns("node_modules"))
        (cls.root / "web/node_modules").symlink_to(ROOT / "web/node_modules", target_is_directory=True)
        shutil.copytree(ROOT / "scripts", cls.root / "scripts", ignore=shutil.ignore_patterns("__pycache__"))
        shutil.copy(ROOT / "schema.yaml", cls.root)
        (cls.root / "games").mkdir()
        for slug in ("azul", "clank-legacy-acquisitions-incorporated"):
            shutil.copy(ROOT / "games" / f"{slug}.yaml", cls.root / "games")
        # A fixture-only large-group variant verifies supported versus preferred
        # counts without changing real game specifications.
        fixture_game = cls.root / 'games/clank-legacy-acquisitions-incorporated.yaml'
        import yaml
        fixture_data = yaml.safe_load(fixture_game.read_text())
        fixture_data['possible_counts'].append(16)
        fixture_game.write_text(yaml.safe_dump(fixture_data, allow_unicode=True, sort_keys=False))
        (cls.root / "images").mkdir()
        (cls.root / "images/sources.yaml").write_text("{}\n")
        with (cls.root / "master_list.csv").open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
            writer.writeheader()
            writer.writerows([dict(name="Azul", year="2017", yaml_id="azul"),
                              dict(name="Unverified", status="failed", notes="Quoted, multiline\nresearch note")])
        build_database(cls.root)
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        cls.url = f"http://127.0.0.1:{port}"
        cls.process = subprocess.Popen(["node", "server.js"], cwd=cls.root / "web",
                                       env=os.environ | {"PORT": str(port)},
                                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for attempt in range(100):
            try:
                urllib.request.urlopen(cls.url + "/api/health", timeout=1).close()
                return
            except (OSError, urllib.error.URLError):
                if cls.process.poll() is not None:
                    raise RuntimeError("Fixture web server exited early")
                time.sleep(0.05)
        raise RuntimeError("Fixture web server did not become ready")

    @classmethod
    def tearDownClass(cls):
        cls.process.terminate()
        cls.process.wait(timeout=5)
        cls.temporary.cleanup()

    def get(self, route):
        with urllib.request.urlopen(self.url + route) as response:
            return json.load(response)

    def test_payload_and_coverage_agree_with_their_authoritative_inputs(self):
        query = self.get("/api/games/query?q=Azul")
        detail = self.get("/api/games/azul")
        self.assertEqual(query["games"], [detail])
        self.assertIn("alternate_names", detail)
        self.assertIn("artist", detail)
        self.assertIn("upgrades", detail)
        self.assertEqual(self.get("/api/master-list"), build_catalog(self.root))
        options = self.get("/api/filter-options")
        self.assertIn("Humor", options["themes"])
        self.assertIn("feel", options["schema"]["ratings"])
        self.assertIn('16', options['supported_player_counts'])
        self.assertEqual([g['id'] for g in self.get('/api/games/query?possible_counts=16')['games']], ['clank-legacy-acquisitions-incorporated'])
        self.assertEqual(self.get('/api/games/query?true_counts=16')['games'], [])

    def test_upload_punctuation_provenance_immediate_lookup_and_origin_guard(self):
        def chunk(kind, data):
            return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
        png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 500, 500, 8, 2, 0, 0, 0))
        png += chunk(b"IDAT", zlib.compress((b"\0" + b"\xff\0\0" * 500) * 500)) + chunk(b"IEND", b"")
        boundary = "boardgame-fixture-boundary"
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="cover.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
                + png + f"\r\n--{boundary}--\r\n".encode())
        route = self.url + "/api/games/clank-legacy-acquisitions-incorporated/upload"
        request = urllib.request.Request(route, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "Origin": "https://unrelated.example"})
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request)
        self.assertEqual(caught.exception.code, 403)
        self.assertEqual(list((self.root / "images").glob("*.png")), [])
        request.remove_header("Origin")
        with urllib.request.urlopen(request) as response:
            result = json.load(response)
        self.assertEqual(result["filename"], "Clank! Legacy: Acquisitions Incorporated (2019).png")
        detail = self.get("/api/games/clank-legacy-acquisitions-incorporated")
        query = self.get("/api/games/query?q=Acquisitions")
        self.assertEqual(query["games"], [detail])
        self.assertTrue(detail["has_image"])
        with urllib.request.urlopen(self.url + detail["image_url"]) as response:
            self.assertEqual(response.read(), png)
        import yaml
        provenance = yaml.safe_load((self.root / "images/sources.yaml").read_text())
        entry = provenance[detail["id"]]
        self.assertEqual(entry["resolution"], "500x500")
        self.assertIsNone(entry["license"])
        self.assertIsNone(entry["source_url"])

    def test_image_route_cannot_serve_provenance_or_traverse_to_other_files(self):
        for route in ("/api/images/sources.yaml", "/api/images/..%2Fschema.yaml"):
            with self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(self.url + route)
            self.assertEqual(caught.exception.code, 403)

    def test_submission_is_reviewable_without_changing_catalog(self):
        original = (self.root / 'games/azul.yaml').read_bytes()
        payload = dict(kind='correction', game_id='azul', name='Azul',
                       message='Please verify the player count', sources=['https://publisher.example/rules'])
        request = urllib.request.Request(self.url + '/api/contributions', data=json.dumps(payload).encode(),
                                         headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request) as response:
            self.assertEqual(response.status, 201)
            receipt = json.load(response)
        from scripts.contributions import connect, read_submission
        connection = connect(self.root)
        try:
            submission = read_submission(connection, receipt['id'])
            self.assertEqual(submission['payload'], payload)
            self.assertEqual(submission['status'], 'pending')
        finally:
            connection.close()
        self.assertEqual((self.root / 'games/azul.yaml').read_bytes(), original)

    def test_failed_database_build_preserves_cache_and_successful_rebuild_refreshes_server(self):
        database = self.root / 'games.db'
        before = database.read_bytes()
        broken = self.root / 'games/broken.yaml'
        broken.write_text('id: broken\nname: Broken\nevokes: []\n')
        try:
            with self.assertRaises(ValueError):
                build_database(self.root)
            self.assertEqual(database.read_bytes(), before)
        finally:
            broken.unlink()
        path = self.root / 'games/azul.yaml'
        original = path.read_text()
        try:
            path.write_text(original.replace('name: "Azul"', 'name: "Azul Fixture Refresh"'))
            build_database(self.root)
            detail = self.get('/api/games/azul')
            query = self.get('/api/games/query?q=Fixture%20Refresh')
            self.assertEqual(detail['name'], 'Azul Fixture Refresh')
            self.assertEqual(query['games'], [detail])
        finally:
            path.write_text(original)
            build_database(self.root)
