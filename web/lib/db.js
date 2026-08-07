/**
 * SQLite query layer for the board game database.
 * Opens games.db read-only via sql.js (pure JS, no native deps).
 * YAML remains the source of truth — this is a derived read cache.
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', '..', 'games.db');
const IMAGES_DIR = path.join(__dirname, '..', '..', 'images');

// Cache image filenames (lowercased basename -> actual filename) for quick lookup
let imageNamesCache = null;
let imageCacheTime = 0;

function getImageNames() {
  const now = Date.now();
  // Refresh cache every 30 seconds
  if (imageNamesCache && now - imageCacheTime < 30000) return imageNamesCache;
  try {
    const files = fs.readdirSync(IMAGES_DIR);
    imageNamesCache = new Map(files.map(f => [path.parse(f).name.toLowerCase(), f]));
    imageCacheTime = now;
  } catch (_) {
    imageNamesCache = new Map();
  }
  return imageNamesCache;
}

function imageFileFor(name, year) {
  if (!name || !year) return null;
  return getImageNames().get(`${name} (${year})`.toLowerCase()) || null;
}

function hasImage(name, year) {
  return imageFileFor(name, year) != null;
}

function imageUrl(name, year) {
  const file = imageFileFor(name, year);
  return file ? `/api/images/${encodeURIComponent(file)}` : null;
}

// Schema cross-reference for categorizing filter options
const MECHANICS = new Set([
  'Worker Placement', 'Deck Building', 'Engine Building', 'Area Control',
  'Tile Placement', 'Dice Rolling', 'Set Collection', 'Trick-taking',
  'Auctions/Bidding', 'Cooperative', '1 vs Many', 'Teams', 'Real-time',
  'Traitor', 'Social Deduction', 'Drafting', 'Press Your Luck', 'Roll & Write',
  'Hex Map', 'Campaign Mode', 'Legacy', 'Bag Building', 'Hand Management',
  'Modular Board', 'Variable Setup', 'Take That', 'Narrative Heavy',
  'Puzzle Solving', 'No Math', 'Word Play', 'Deduction', 'Racing',
  'Economic', 'Action Points', 'Route Building', 'Network Building',
  'Pattern Building', 'Resource Management', 'Trading', 'Negotiation',
  'Bluffing', 'Hidden Movement', 'Programmed Movement', 'Simultaneous Action',
  'Card Drafting', 'Tableau Building', 'Tech Tree', 'Rondel', 'Mancala',
  'Dexterity', 'Asymmetric', 'Variable Player Powers', 'Events'
]);

const STYLES = new Set([
  'Euro', 'Ameritrash', 'Abstract', 'Party', 'Family', 'Wargame',
  'Filler', 'Gateway', 'Cult Classic', 'Dungeon Crawler', '4X',
  'Dudes on a Map', 'Role Playing'
]);

const THEMES = new Set([
  'Fantasy', 'Sci-Fi', 'Horror', 'Historical', 'Western', 'Pirates',
  'Zombies', 'Vampires', 'Cthulhu', 'Aliens', 'Post-Apocalyptic',
  'Superheroes', 'Marvel', 'Disney', 'Lord of the Rings', 'Animals',
  'Food Theme', 'Time Travel', 'Space', 'Medieval', 'Ancient',
  'Mythology', 'Nature', 'City Building', 'Civilization', 'War',
  'Survival', 'Mystery', 'Espionage', 'Steampunk', 'Cyberpunk',
  'Aviation', 'Maritime', 'Trains', 'Agriculture'
]);

let db = null;
let SQL = null;

/**
 * Initialize sql.js and load the database.
 */
async function init() {
  if (db) return db;
  try {
    if (!SQL) SQL = await initSqlJs();
    if (!fs.existsSync(DB_PATH)) {
      console.warn('games.db not found — run python3 scripts/build_db.py first');
      return null;
    }
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    return db;
  } catch (err) {
    console.error('Failed to open games.db:', err.message);
    return null;
  }
}

/**
 * Reload the database (e.g. after rebuild).
 */
async function reopenDb() {
  if (db) { try { db.close(); } catch (_) {} db = null; }
  return init();
}

function getDb() { return db; }

// ============ Query helpers ============

/**
 * Run a parameterized SELECT and return rows as objects.
 */
function query(sql, params = []) {
  const conn = getDb();
  if (!conn) return [];
  const stmt = conn.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Run a parameterized SELECT and return the first row.
 */
function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// ============ Array field helpers ============

const ARRAY_TABLES = {
  categories:      { table: 'game_categories',     col: 'category' },
  evokes:          { table: 'game_evokes',          col: 'evoke' },
  designers:       { table: 'game_designers',       col: 'name' },
  publishers:      { table: 'game_publishers',      col: 'name' },
  artists:         { table: 'game_artists',         col: 'name' },
  alternate_names: { table: 'game_alternate_names', col: 'name' },
  possible_counts: { table: 'game_possible_counts', col: 'count' },
  true_counts:     { table: 'game_true_counts',     col: 'count' },
  expansions:      { table: 'game_expansions',      col: 'expansion_id' },
  compatible_with: { table: 'game_compatible_with', col: 'compatible_id' },
};

/**
 * Batch-fetch array fields for a set of game IDs.
 */
function batchFetchArrays(gameIds) {
  if (gameIds.length === 0) return new Map();

  const placeholders = gameIds.map(() => '?').join(',');
  const result = new Map();
  for (const id of gameIds) {
    const entry = {};
    for (const key of Object.keys(ARRAY_TABLES)) entry[key] = [];
    entry.upgrades = [];
    result.set(id, entry);
  }

  for (const [key, { table, col }] of Object.entries(ARRAY_TABLES)) {
    const rows = query(
      `SELECT game_id, ${col} as val FROM ${table} WHERE game_id IN (${placeholders})`,
      gameIds
    );
    for (const row of rows) {
      result.get(row.game_id)[key].push(row.val);
    }
  }

  // Upgrades
  const upgradeRows = query(
    `SELECT game_id, name, year, type, publisher, notes FROM game_upgrades WHERE game_id IN (${placeholders})`,
    gameIds
  );
  for (const row of upgradeRows) {
    result.get(row.game_id).upgrades.push({
      name: row.name, year: row.year, type: row.type,
      publisher: row.publisher, notes: row.notes
    });
  }

  return result;
}

// ============ Public API ============

function getFilteredGames(filters = {}, sort = 'name', dir = 'asc', page = 1, perPage = 50) {
  if (!getDb()) return { games: [], total: 0, page, per_page: perPage, total_pages: 0 };

  const where = [];
  const params = [];

  // Text search
  if (filters.q) {
    where.push('(g.name LIKE ?1 OR g.description LIKE ?1)');
    params.push(`%${filters.q}%`);
  }

  // Categories (AND)
  if (filters.categories && filters.categories.length > 0) {
    for (const cat of filters.categories) {
      params.push(cat);
      where.push(`g.id IN (SELECT game_id FROM game_categories WHERE category = ?${params.length})`);
    }
  }

  // Evokes (AND)
  if (filters.evokes && filters.evokes.length > 0) {
    for (const evoke of filters.evokes) {
      params.push(evoke);
      where.push(`g.id IN (SELECT game_id FROM game_evokes WHERE evoke = ?${params.length})`);
    }
  }

  // True counts (OR within)
  if (filters.true_counts && filters.true_counts.length > 0) {
    const startIdx = params.length + 1;
    const ph = filters.true_counts.map((_, i) => `?${startIdx + i}`).join(',');
    where.push(`g.id IN (SELECT game_id FROM game_true_counts WHERE count IN (${ph}))`);
    params.push(...filters.true_counts);
  }

  // Year range
  if (filters.year_min != null) { params.push(filters.year_min); where.push(`g.year >= ?${params.length}`); }
  if (filters.year_max != null) { params.push(filters.year_max); where.push(`g.year <= ?${params.length}`); }

  // Playtime range
  if (filters.playtime_min != null) { params.push(filters.playtime_min); where.push(`g.playtime_minutes >= ?${params.length}`); }
  if (filters.playtime_max != null) { params.push(filters.playtime_max); where.push(`g.playtime_minutes <= ?${params.length}`); }

  // Rating ranges
  const ratingFields = ['length', 'rules_complexity', 'strategic_depth', 'feel', 'value'];
  for (const field of ratingFields) {
    if (filters[`${field}_min`] != null) {
      params.push(filters[`${field}_min`]);
      where.push(`g.${field} >= ?${params.length}`);
    }
    if (filters[`${field}_max`] != null) {
      params.push(filters[`${field}_max`]);
      where.push(`g.${field} <= ?${params.length}`);
    }
  }

  // Designer / Publisher
  if (filters.designer) { params.push(filters.designer); where.push(`g.id IN (SELECT game_id FROM game_designers WHERE name = ?${params.length})`); }
  if (filters.publisher) { params.push(filters.publisher); where.push(`g.id IN (SELECT game_id FROM game_publishers WHERE name = ?${params.length})`); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  // Validate sort
  const allowedSorts = ['name', 'year', 'length', 'rules_complexity', 'strategic_depth', 'feel', 'value', 'playtime_minutes'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'name';
  const sortDir = dir === 'desc' ? 'DESC' : 'ASC';
  const orderClause = sortCol === 'name'
    ? `ORDER BY g.name COLLATE NOCASE ${sortDir}`
    : `ORDER BY g.${sortCol} IS NULL, g.${sortCol} ${sortDir}, g.name COLLATE NOCASE ASC`;

  // Count
  const countRow = queryOne(`SELECT COUNT(*) as total FROM games g ${whereClause}`, params);
  const total = countRow ? countRow.total : 0;
  const totalPages = Math.ceil(total / perPage);

  // Fetch page
  const offset = (page - 1) * perPage;
  params.push(perPage, offset);
  const rows = query(
    `SELECT g.* FROM games g ${whereClause} ${orderClause} LIMIT ?${params.length - 1} OFFSET ?${params.length}`,
    params
  );

  const gameIds = rows.map(r => r.id);
  const arrays = batchFetchArrays(gameIds);
  const games = rows.map(row => ({
    ...row,
    ...arrays.get(row.id),
    has_image: hasImage(row.name, row.year),
    image_url: imageUrl(row.name, row.year)
  }));

  return { games, total, page, per_page: perPage, total_pages: totalPages };
}

function getGameById(id) {
  if (!getDb()) return null;
  const row = queryOne('SELECT * FROM games WHERE id = ?1', [id]);
  if (!row) return null;
  const arrays = batchFetchArrays([id]);
  return {
    ...row,
    ...arrays.get(id),
    has_image: hasImage(row.name, row.year),
    image_url: imageUrl(row.name, row.year)
  };
}

function getFilterOptions() {
  if (!getDb()) return null;

  const catRows = query('SELECT DISTINCT category as val FROM game_categories ORDER BY category');
  const mechanics = [], styles = [], themes = [], otherCategories = [];
  for (const { val } of catRows) {
    if (MECHANICS.has(val)) mechanics.push(val);
    else if (STYLES.has(val)) styles.push(val);
    else if (THEMES.has(val)) themes.push(val);
    else otherCategories.push(val);
  }

  return {
    mechanics,
    styles,
    themes,
    other_categories: otherCategories,
    evokes: query('SELECT DISTINCT evoke as val FROM game_evokes ORDER BY evoke').map(r => r.val),
    designers: query('SELECT DISTINCT name as val FROM game_designers ORDER BY name').map(r => r.val),
    publishers: query('SELECT DISTINCT name as val FROM game_publishers ORDER BY name').map(r => r.val),
    year_range: queryOne('SELECT MIN(year) as min, MAX(year) as max FROM games WHERE year IS NOT NULL') || { min: null, max: null },
    playtime_range: queryOne('SELECT MIN(playtime_minutes) as min, MAX(playtime_minutes) as max FROM games WHERE playtime_minutes IS NOT NULL') || { min: null, max: null },
    player_counts: query('SELECT DISTINCT count as val FROM game_true_counts ORDER BY CAST(count AS INTEGER)').map(r => r.val),
  };
}

function getStats() {
  if (!getDb()) return null;
  const total = queryOne('SELECT COUNT(*) as n FROM games');
  const topCategories = query('SELECT category, COUNT(*) as n FROM game_categories GROUP BY category ORDER BY n DESC LIMIT 10');
  return { total_games: total ? total.n : 0, top_categories: topCategories };
}

function getEvokeCounts() {
  if (!getDb()) return [];
  return query('SELECT evoke, COUNT(*) as count FROM game_evokes GROUP BY evoke ORDER BY count DESC');
}

module.exports = { init, getFilteredGames, getGameById, getFilterOptions, getStats, getEvokeCounts, reopenDb };
