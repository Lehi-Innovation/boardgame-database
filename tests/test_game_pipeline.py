import argparse
import contextlib
import io
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from scripts import game_pipeline
from scripts.research_log import read_log


class PipelineLoggingTests(unittest.TestCase):
    def test_pipeline_records_actual_utc_log_time_and_cache_uncertainty(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "research-log.yaml"
            before = datetime.now(timezone.utc).replace(microsecond=0)
            with patch.object(game_pipeline, "LOG_PATH", path), contextlib.redirect_stderr(io.StringIO()):
                game_pipeline.append_research_log("example", [
                    dict(url='https://example.test/game?title="Example"', source_type="publisher"),
                ])
            rows = read_log(path.read_text())
            stamp = datetime.fromisoformat(rows[0]["timestamp"].replace("Z", "+00:00"))
            self.assertLessEqual(before, stamp)
            self.assertLessEqual(stamp, datetime.now(timezone.utc))
            self.assertIn("may be cached", rows[0]["description"])
            self.assertEqual(rows[0]["game_id"], "example")

    def test_failed_logging_returns_error_and_keeps_source_output(self):
        args = argparse.Namespace(game_name="Example", urls=None, log="example")
        result = dict(game_name="Example", sources=[dict(url="https://example.test", text="Evidence")])
        stdout, stderr = io.StringIO(), io.StringIO()
        with patch("argparse.ArgumentParser.parse_args", return_value=args), \
                patch.object(game_pipeline, "extract_clean_text", return_value=result), \
                patch.object(game_pipeline, "append_research_log", side_effect=ValueError("invalid log")), \
                contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            self.assertEqual(game_pipeline.main(), 1)
        self.assertIn('"text": "Evidence"', stdout.getvalue())
        self.assertIn("Research log unchanged: invalid log", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
