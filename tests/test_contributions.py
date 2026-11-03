import tempfile
import unittest
from pathlib import Path

from scripts.contributions import connect, read_submission, review, submit


class ContributionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        (self.root / "games").mkdir()
        (self.root / "games/example.yaml").write_text("id: example\naffinity: 4\n")
        self.payload = dict(kind="correction", game_id="example", name="Example (2020)",
                            message='Correct the player count, not my personal rating.\nA "quoted" note.',
                            sources=["https://publisher.example/rules.pdf"])

    def tearDown(self):
        self.temporary.cleanup()

    def test_review_history_versions_conflicts_and_reopening_preserve_records(self):
        original = (self.root / "games/example.yaml").read_bytes()
        submission = submit(self.payload, self.root)
        identifier = submission["id"]
        self.assertEqual(submission["payload"], self.payload)
        accepted = review(identifier, "accepted", "Owner", "Evidence checked; ready to curate", 1, self.root)
        self.assertEqual(accepted["status"], "accepted")
        with self.assertRaisesRegex(ValueError, "conflict"):
            review(identifier, "rejected", "Reviewer", "Stale decision", 1, self.root)
        published = review(identifier, "published", "Owner", "Catalog correction separately applied in commit abc123", 2, self.root)
        reopened = review(identifier, "pending", "Owner", "New evidence; reconsider the correction", 3, self.root)
        self.assertEqual([event["status"] for event in reopened["history"]], ["pending", "accepted", "published", "pending"])
        self.assertEqual((self.root / "games/example.yaml").read_bytes(), original)

    def test_invalid_submissions_and_transitions_leave_no_partial_history(self):
        for payload in (self.payload | {"game_id": "../secret"}, self.payload | {"sources": ["javascript:alert(1)"]}, self.payload | {"message": ""}):
            with self.assertRaises(ValueError):
                submit(payload, self.root)
        self.assertFalse((self.root / ".local").exists())
        submission = submit(self.payload, self.root)
        with self.assertRaises(ValueError):
            review(submission["id"], "published", "Owner", "Cannot skip review", 1, self.root)
        connection = connect(self.root)
        try:
            self.assertEqual(read_submission(connection, submission["id"])["version"], 1)
        finally:
            connection.close()
