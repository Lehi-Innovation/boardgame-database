#!/usr/bin/env python3
"""Build a SQLite database from YAML game files.

Reads all games/*.yaml files and produces games.db — a normalized
SQLite database for querying, searching, and sorting across the
entire collection. YAML remains the source of truth; this DB is
a derived read cache that can be rebuilt at any time.

Usage:
    python3 scripts/build_db.py
    python3 scripts/build_db.py --source-dir /path/to/games --destination /path/to/games.db
"""

import argparse
import fcntl
import hashlib
import os
import sqlite3
import sys
import tempfile
from contextlib import closing
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
GAMES_DIR = PROJECT_ROOT / 'games'
DB_PATH = PROJECT_ROOT / 'games.db'
DIGEST_FORMAT_VERSION = 1

SCHEMA_SQL = """
-- Core game table: one row per game, scalar fields only
CREATE TABLE games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    year INTEGER,
    edition TEXT,
    game_family TEXT,
    base_game TEXT,
    playtime_minutes INTEGER,
    min_playtime INTEGER,
    max_playtime INTEGER,
    min_age INTEGER,
    length INTEGER,
    rules_complexity INTEGER,
    strategic_depth INTEGER,
    feel INTEGER,
    value INTEGER,
    affinity INTEGER,
    hotness INTEGER,
    description TEXT,
    total_plays INTEGER DEFAULT 0
);

CREATE TABLE build_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    source_file_count INTEGER NOT NULL,
    digest_format_version INTEGER NOT NULL,
    source_digest TEXT NOT NULL
);

-- Array tables
CREATE TABLE game_alternate_names (
    game_id TEXT NOT NULL REFERENCES games(id),
    name TEXT NOT NULL
);

CREATE TABLE game_designers (
    game_id TEXT NOT NULL REFERENCES games(id),
    name TEXT NOT NULL
);

CREATE TABLE game_publishers (
    game_id TEXT NOT NULL REFERENCES games(id),
    name TEXT NOT NULL
);

CREATE TABLE game_artists (
    game_id TEXT NOT NULL REFERENCES games(id),
    name TEXT NOT NULL
);

CREATE TABLE game_categories (
    game_id TEXT NOT NULL REFERENCES games(id),
    category TEXT NOT NULL
);

CREATE TABLE game_evokes (
    game_id TEXT NOT NULL REFERENCES games(id),
    evoke TEXT NOT NULL
);

CREATE TABLE game_possible_counts (
    game_id TEXT NOT NULL REFERENCES games(id),
    count TEXT NOT NULL
);

CREATE TABLE game_true_counts (
    game_id TEXT NOT NULL REFERENCES games(id),
    count TEXT NOT NULL
);

CREATE TABLE game_expansions (
    game_id TEXT NOT NULL REFERENCES games(id),
    expansion_id TEXT NOT NULL
);

CREATE TABLE game_compatible_with (
    game_id TEXT NOT NULL REFERENCES games(id),
    compatible_id TEXT NOT NULL
);

-- Nested table for upgrades
CREATE TABLE game_upgrades (
    game_id TEXT NOT NULL REFERENCES games(id),
    name TEXT,
    year INTEGER,
    type TEXT,
    publisher TEXT,
    notes TEXT
);

-- Indexes for common queries
CREATE INDEX idx_categories_category ON game_categories(category);
CREATE INDEX idx_evokes_evoke ON game_evokes(evoke);
CREATE INDEX idx_designers_name ON game_designers(name);
CREATE INDEX idx_games_year ON games(year);
CREATE INDEX idx_games_rules_complexity ON games(rules_complexity);
CREATE INDEX idx_games_strategic_depth ON games(strategic_depth);
CREATE INDEX idx_games_length ON games(length);
CREATE INDEX idx_games_feel ON games(feel);
CREATE INDEX idx_games_value ON games(value);
CREATE INDEX idx_games_name ON games(name);
"""


def yaml_paths(source_dir):
    """List top-level YAML files in canonical UTF-8 filename order."""
    source_dir = Path(source_dir)
    return sorted(
        (path for path in source_dir.iterdir() if path.name.endswith('.yaml')),
        key=lambda path: path.name.encode('utf-8'),
    )


def digest_file(digest, name, contents):
    digest.update(name.encode('utf-8'))
    digest.update(b'\0')
    digest.update(hashlib.sha256(contents).digest())


def source_digest(source_dir):
    """Re-read the current source set for the final freshness check."""
    digest = hashlib.sha256()
    files = yaml_paths(source_dir)
    for path in files:
        try:
            digest_file(digest, path.name, path.read_bytes())
        except OSError as error:
            raise ValueError(f'{path}: cannot read source: {error}') from error
    return len(files), digest.hexdigest()


def sqlite_id(value):
    """Keep lexical identity intact instead of accepting YAML number coercion."""
    if isinstance(value, str) and value.strip():
        return value
    raise ValueError('id must be a nonempty string; quote numeric IDs')


def load_yaml_files(source_dir):
    """Parse one snapshot, reading each YAML file's exact bytes once."""
    files = yaml_paths(source_dir)
    if not files:
        raise ValueError(f'{source_dir}: no YAML files found')
    digest = hashlib.sha256()
    games = []
    id_paths = {}
    for path in files:
        try:
            contents = path.read_bytes()
            digest_file(digest, path.name, contents)
            game = yaml.safe_load(contents)
            if not isinstance(game, dict):
                raise ValueError('expected a YAML mapping')
            game_id = sqlite_id(game.get('id'))
            if game_id in id_paths:
                raise ValueError(
                    f'duplicate id {game_id!r}; first found in {id_paths[game_id]}'
                )
            if not isinstance(game.get('name'), str) or not game['name'].strip():
                raise ValueError('name must be a nonempty string')
            id_paths[game_id] = path
            games.append((path, game))
        except (OSError, yaml.YAMLError, ValueError) as error:
            raise ValueError(f'{path}: {error}') from error
    return games, set(id_paths), digest.hexdigest()


def insert_game(cursor, game):
    """Insert a single game into all relevant tables."""
    # Extract total_plays from nested plays_tracked
    total_plays = 0
    plays_tracked = game.get('plays_tracked')
    if isinstance(plays_tracked, dict):
        total_plays = plays_tracked.get('total_plays', 0) or 0

    # Insert into main games table
    cursor.execute("""
        INSERT INTO games (
            id, name, year, edition, game_family, base_game,
            playtime_minutes, min_playtime, max_playtime, min_age,
            length, rules_complexity, strategic_depth, feel, value,
            affinity, hotness, description, total_plays
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        game['id'],
        game['name'],
        game.get('year'),
        game.get('edition'),
        game.get('game_family'),
        game.get('base_game'),
        game.get('playtime_minutes'),
        game.get('min_playtime'),
        game.get('max_playtime'),
        game.get('min_age'),
        game.get('length'),
        game.get('rules_complexity'),
        game.get('strategic_depth'),
        game.get('feel'),
        game.get('value'),
        game.get('affinity'),
        game.get('hotness'),
        game.get('description', '').strip() if game.get('description') else None,
        total_plays,
    ))

    game_id = game['id']

    # Array fields: (yaml_key, table_name, column_name)
    array_fields = [
        ('alternate_names', 'game_alternate_names', 'name'),
        ('designer', 'game_designers', 'name'),
        ('publisher', 'game_publishers', 'name'),
        ('artist', 'game_artists', 'name'),
        ('categories', 'game_categories', 'category'),
        ('evokes', 'game_evokes', 'evoke'),
        ('possible_counts', 'game_possible_counts', 'count'),
        ('true_counts', 'game_true_counts', 'count'),
        ('expansions', 'game_expansions', 'expansion_id'),
        ('compatible_with', 'game_compatible_with', 'compatible_id'),
    ]

    for yaml_key, table, col in array_fields:
        items = game.get(yaml_key) or []
        for item in items:
            cursor.execute(
                f"INSERT INTO {table} (game_id, {col}) VALUES (?, ?)",
                (game_id, str(item))
            )

    # Upgrades (nested objects)
    for upgrade in (game.get('upgrades') or []):
        if isinstance(upgrade, dict):
            for field in ('name', 'year', 'type', 'publisher', 'notes'):
                if isinstance(upgrade.get(field), (list, dict)):
                    raise ValueError(f'upgrade.{field} has an unsupported nested value')
            cursor.execute("""
                INSERT INTO game_upgrades (game_id, name, year, type, publisher, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                game_id,
                upgrade.get('name'),
                upgrade.get('year'),
                upgrade.get('type'),
                upgrade.get('publisher'),
                upgrade.get('notes'),
            ))


CHILD_TABLES = (
    'game_alternate_names', 'game_designers', 'game_publishers',
    'game_artists', 'game_categories', 'game_evokes',
    'game_possible_counts', 'game_true_counts', 'game_expansions',
    'game_compatible_with', 'game_upgrades',
)


def validate_staged_database(conn, expected_ids, expected_count):
    """Reject corrupt, incomplete, or orphaned staged content."""
    integrity = [row[0] for row in conn.execute('PRAGMA integrity_check')]
    if integrity != ['ok']:
        raise ValueError(f'integrity_check failed: {integrity[:5]}')
    foreign_keys = conn.execute('PRAGMA foreign_key_check').fetchall()
    if foreign_keys:
        raise ValueError(f'foreign_key_check failed: {foreign_keys[:5]}')
    rows = conn.execute('SELECT id FROM games').fetchall()
    actual_ids = {row[0] for row in rows}
    if len(rows) != expected_count or actual_ids != expected_ids:
        missing = sorted(expected_ids - actual_ids)
        extra = sorted(actual_ids - expected_ids)
        raise ValueError(
            f'game membership mismatch: expected {expected_count} rows, '
            f'found {len(rows)}; missing {missing[:5]}, extra {extra[:5]}'
        )
    for table in CHILD_TABLES:
        orphan = conn.execute(
            f'SELECT game_id FROM {table} WHERE game_id NOT IN '
            '(SELECT id FROM games) LIMIT 1'
        ).fetchone()
        if orphan:
            raise ValueError(f'{table} has orphaned game_id {orphan[0]!r}')


def build_database(source_dir=GAMES_DIR, destination_path=DB_PATH):
    """Build, validate, and atomically publish a database from one YAML snapshot."""
    source_dir = Path(source_dir)
    destination_path = Path(destination_path)
    games, expected_ids, digest = load_yaml_files(source_dir)
    stage_path = None
    try:
        fd, stage_name = tempfile.mkstemp(
            prefix=f'.{destination_path.name}.stage-',
            suffix='.db', dir=destination_path.parent,
        )
        stage_path = Path(stage_name)
        os.close(fd)
        with closing(sqlite3.connect(stage_path)) as conn:
            conn.execute('PRAGMA journal_mode=DELETE')
            conn.execute('PRAGMA foreign_keys=ON')
            conn.executescript(SCHEMA_SQL)
            cursor = conn.cursor()
            for path, game in games:
                try:
                    insert_game(cursor, game)
                except Exception as error:
                    raise ValueError(f'{path}: insertion failed: {error}') from error
            conn.execute(
                'INSERT INTO build_metadata '
                '(id, source_file_count, digest_format_version, source_digest) '
                'VALUES (1, ?, ?, ?)',
                (len(games), DIGEST_FORMAT_VERSION, digest),
            )
            conn.commit()
            validate_staged_database(conn, expected_ids, len(games))
            counts = {
                table: conn.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
                for table in ('games', 'game_categories', 'game_evokes',
                              'game_designers', 'game_publishers', 'game_artists',
                              'game_upgrades')
            }
        # Lock the destination directory through both freshness check and replace.
        # flock on the directory leaves no lock artifact or unlink race.
        directory_fd = os.open(destination_path.parent, os.O_RDONLY)
        try:
            fcntl.flock(directory_fd, fcntl.LOCK_EX)
            current_count, current_digest = source_digest(source_dir)
            if current_count != len(games) or current_digest != digest:
                raise ValueError('YAML source changed during build; retry the build')
            os.replace(stage_path, destination_path)
            stage_path = None
        finally:
            os.close(directory_fd)
    finally:
        if stage_path is not None:
            for suffix in ('', '-journal', '-wal', '-shm'):
                try:
                    Path(str(stage_path) + suffix).unlink()
                except FileNotFoundError:
                    pass
    print(f"Built {destination_path}: "
          f"{counts['games']} games, "
          f"{counts['game_categories']} categories, "
          f"{counts['game_evokes']} evokes, "
          f"{counts['game_designers']} designers, "
          f"{counts['game_publishers']} publishers, "
          f"{counts['game_artists']} artists, "
          f"{counts['game_upgrades']} upgrades")
    return counts


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=GAMES_DIR)
    parser.add_argument('--destination', type=Path, default=DB_PATH)
    args = parser.parse_args()
    try:
        build_database(args.source_dir, args.destination)
    except (OSError, sqlite3.Error, ValueError) as error:
        print(f'Database build failed: {error}', file=sys.stderr)
        sys.exit(1)
