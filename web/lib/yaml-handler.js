const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const db = require('./db');
const gamePayload = require('./game-payload');
const images = require('./images');

const GAMES_DIR = path.join(__dirname, '../../games');
const IMAGES_DIR = path.join(__dirname, '../../images');

let gamesCache = null;
let cacheFingerprint = null;

/**
 * Load all game files from the games directory
 * Returns an array of game objects with metadata
 */
async function loadAllGames() {
  const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.yaml')).sort();
  const fingerprint = files.map(f => `${f}:${fs.statSync(path.join(GAMES_DIR, f)).mtimeMs}`).join('|')
    + fs.readdirSync(IMAGES_DIR).sort().map(f => `${f}:${fs.statSync(path.join(IMAGES_DIR, f)).mtimeMs}`).join('|');
  if (gamesCache && fingerprint === cacheFingerprint) {
    return gamesCache;
  }

  try {
    const games = [];

    const imageFiles = fs.readdirSync(IMAGES_DIR);

    for (const file of files) {
      try {
        const filePath = path.join(GAMES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const gameData = yaml.load(content);

        if (gameData && gameData.id) {
          // Resolve this game's image file (exact basename, any extension)
          const imageFile = images.findImage(gameData, imageFiles);

          games.push(gamePayload(gameData, imageFile));
        }
      } catch (err) {
        console.error(`Error loading game file ${file}:`, err.message);
      }
    }

    // Sort by name
    games.sort((a, b) => a.name.localeCompare(b.name));
    gamesCache = games;
    cacheFingerprint = fingerprint;
    return games;
  } catch (err) {
    console.error('Error loading games directory:', err.message);
    return [];
  }
}

/**
 * Get a single game by ID
 */
async function getGameById(gameId) {
  const games = await loadAllGames();
  return games.find(g => g.id === gameId);
}

/**
 * Check if an image exists for a game using naming convention
 * Images are named: {Game Name} ({Year}).{ext}
 */
function checkImageExists(gameData) { return images.findImage(gameData) !== null; }
function getExpectedImageFilename(gameData) { return images.findImage(gameData); }

/**
 * Get image URL for a game
 */
async function getImageUrl(gameId) {
  const game = await getGameById(gameId);
  if (!game) {
    return null;
  }

  const filename = getExpectedImageFilename(game);
  if (!filename) {
    return null;
  }

  return `/api/images/${encodeURIComponent(filename)}`;
}

async function loadMasterList() {
  return db.getMasterList();
}

/**
 * Clear the games cache (useful after file updates)
 */
function clearCache() {
  gamesCache = null;
}

module.exports = {
  loadAllGames,
  getGameById,
  loadMasterList,
  checkImageExists,
  getExpectedImageFilename,
  getImageUrl,
  clearCache,
  GAMES_DIR,
  IMAGES_DIR
};
