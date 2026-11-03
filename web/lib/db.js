/**
 * SQLite query layer for the board game database.
 * Opens games.db read-only via sql.js (pure JS, no native deps).
 * YAML remains the source of truth — this is a derived read cache.
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const schema = require('./schema');
const gamePayload = require('./game-payload');

const DB_PATH = path.join(__dirname, '..', '..', 'games.db');

const images = require('./images');
function imageFileFor(id, name, year) { return images.findImage({ id, name, year }); }

const MECHANICS = new Set(schema.categories.mechanics);
const STYLES = new Set(schema.categories.styles);
const THEMES = new Set(schema.categories.themes);

let db = null;
let SQL = null;
let databaseVersion = null;

function version() {
  const stat = fs.statSync(DB_PATH);
  return `${stat.ino}:${stat.size}:${stat.mtimeMs}`;
}

function readSnapshot() {
  const descriptor = fs.openSync(DB_PATH, 'r');
  try {
    const stat = fs.fstatSync(descriptor);
    return { buffer: fs.readFileSync(descriptor), version: `${stat.ino}:${stat.size}:${stat.mtimeMs}` };
  } finally { fs.closeSync(descriptor); }
}

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
    const snapshot = readSnapshot();
    db = new SQL.Database(snapshot.buffer);
    databaseVersion = snapshot.version;
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

function getDb() {
  if (SQL && fs.existsSync(DB_PATH) && databaseVersion !== version()) {
    // Publish a new connection only after successfully reading a complete file.
    const snapshot = readSnapshot();
    const replacement = new SQL.Database(snapshot.buffer);
    if (db) db.close();
    db = replacement;
    databaseVersion = snapshot.version;
  }
  return db;
}

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
  for (const field of ['possible_counts', 'true_counts']) {
    if (!filters[field]?.length) continue;
    const startIdx = params.length + 1;
    const ph = filters[field].map((_, i) => `?${startIdx + i}`).join(',');
    where.push(`g.id IN (SELECT game_id FROM game_${field} WHERE count IN (${ph}))`);
    params.push(...filters[field]);
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

  const games = rows.map(row => gamePayload(JSON.parse(row.record_json), imageFileFor(row.id, row.name, row.year)));

  return { games, total, page, per_page: perPage, total_pages: totalPages };
}

function getGameById(id) {
  if (!getDb()) return null;
  const row = queryOne('SELECT * FROM games WHERE id = ?1', [id]);
  if (!row) return null;
  return gamePayload(JSON.parse(row.record_json), imageFileFor(row.id, row.name, row.year));
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
    schema: { categories: schema.categories, ratings: Object.fromEntries(Object.entries(schema).filter(([, def]) => def?.values && !Array.isArray(def.values))) },
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
    supported_player_counts: query('SELECT DISTINCT count as val FROM game_possible_counts ORDER BY CAST(count AS INTEGER)').map(r => r.val),
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

function getMasterList() {
  const row = queryOne('SELECT payload FROM catalog_snapshot');
  if (!row) throw new Error('Catalog snapshot unavailable; rebuild games.db');
  return JSON.parse(row.payload);
}

module.exports = { getMasterList, init, getFilteredGames, getGameById, getFilterOptions, getStats, getEvokeCounts, reopenDb };
