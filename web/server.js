const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const yamlHandler = require('./lib/yaml-handler');
const db = require('./lib/db');
const schema = require('./lib/schema');
const images = require('./lib/images');
const { spawnSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) {
        return res.status(403).json({ error: true, message: 'Cross-origin writes are not allowed' });
      }
    } catch (_) { return res.status(403).json({ error: true, message: 'Invalid origin' }); }
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Synchronous script loading lets every page use the same schema vocabulary.
app.get('/api/schema.js', (req, res) => {
  const ratings = Object.fromEntries(Object.entries(schema)
    .filter(([, value]) => value?.values && !Array.isArray(value.values)));
  const presentation = { categories: schema.categories, ratings, evokes: schema.evokes, discovery_presets: schema.discovery_presets };
  res.type('application/javascript').send(`window.CatalogSchema = ${JSON.stringify(presentation).replace(/</g, '\\u003c')};`);
});

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (allowedMimes.includes(mime) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP allowed.'));
    }
  }
});

// ============ API Endpoints ============

app.post('/api/contributions', (req, res) => {
  if (!req.is('application/json')) return res.status(415).json({ message: 'Use a JSON submission' });
  const result = spawnSync(process.env.PYTHON || 'python3', ['scripts/contributions.py', 'submit'],
    { cwd: path.join(__dirname, '..'), input: JSON.stringify(req.body), encoding: 'utf8' });
  if (result.status !== 0) {
    let message = 'Submission could not be saved';
    let status = 500;
    try {
      const error = JSON.parse(result.stderr).error;
      if (error) { message = error; status = 400; }
    } catch (_) {}
    return res.status(status).json({ message });
  }
  const submission = JSON.parse(result.stdout);
  res.status(201).json({ id: submission.id, status: submission.status, version: submission.version });
});

/**
 * GET /api/games/query
 * Filtered, sorted, paginated game query powered by SQLite.
 * Must be registered before /api/games/:id to avoid route collision.
 */
app.get('/api/games/query', (req, res) => {
  try {
    if (!db.getStats()) return res.status(503).json({ error: true, message: 'Build games.db to browse the catalog', code: 'DB_UNAVAILABLE' });
    const filters = {};

    if (req.query.q) filters.q = req.query.q;
    if (req.query.categories) filters.categories = [].concat(req.query.categories);
    if (req.query.evokes) filters.evokes = [].concat(req.query.evokes);
    if (req.query.true_counts) filters.true_counts = [].concat(req.query.true_counts);
    if (req.query.possible_counts) filters.possible_counts = [].concat(req.query.possible_counts);

    const intParam = (name) => {
      const v = req.query[name];
      return v != null && v !== '' ? parseInt(v, 10) : undefined;
    };

    filters.year_min = intParam('year_min');
    filters.year_max = intParam('year_max');
    filters.playtime_min = intParam('playtime_min');
    filters.playtime_max = intParam('playtime_max');

    for (const field of ['length', 'rules_complexity', 'strategic_depth', 'feel', 'value']) {
      filters[`${field}_min`] = intParam(`${field}_min`);
      filters[`${field}_max`] = intParam(`${field}_max`);
    }

    if (req.query.designer) filters.designer = req.query.designer;
    if (req.query.publisher) filters.publisher = req.query.publisher;

    const sort = req.query.sort || 'name';
    const dir = req.query.dir || 'asc';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.per_page, 10) || 50));

    const result = db.getFilteredGames(filters, sort, dir, page, perPage);
    res.json(result);
  } catch (err) {
    console.error('Error in /api/games/query:', err);
    res.status(500).json({ error: true, message: 'Query failed', code: 'QUERY_ERROR' });
  }
});

/**
 * GET /api/filter-options
 * Distinct values for all filter dropdowns.
 */
app.get('/api/filter-options', (req, res) => {
  try {
    const options = db.getFilterOptions();
    if (!options) {
      return res.status(503).json({ error: true, message: 'Database not available', code: 'DB_UNAVAILABLE' });
    }
    res.json(options);
  } catch (err) {
    console.error('Error in /api/filter-options:', err);
    res.status(500).json({ error: true, message: 'Failed to load filter options', code: 'FILTER_ERROR' });
  }
});

/**
 * GET /api/evokes/counts
 * Return evoke values with game counts for the evokes section.
 */
app.get('/api/evokes/counts', (req, res) => {
  try {
    const counts = db.getEvokeCounts();
    if (!counts) {
      return res.status(503).json({ error: true, message: 'Database not available', code: 'DB_UNAVAILABLE' });
    }
    res.json(counts);
  } catch (err) {
    console.error('Error in /api/evokes/counts:', err);
    res.status(500).json({ error: true, message: 'Failed to load evoke counts', code: 'EVOKE_ERROR' });
  }
});

/**
 * GET /api/games
 * Return all games with metadata and image status
 */
app.get('/api/games', async (req, res) => {
  try {
    const games = await yamlHandler.loadAllGames();
    res.json(games);
  } catch (err) {
    console.error('Error fetching games:', err);
    res.status(500).json({
      error: true,
      message: 'Failed to load games',
      code: 'LOAD_ERROR'
    });
  }
});

/**
 * GET /api/games/:id
 * Return single game details
 */
app.get('/api/games/:id', async (req, res) => {
  try {
    const game = await yamlHandler.getGameById(req.params.id);

    if (!game) {
      return res.status(404).json({
        error: true,
        message: 'Game not found',
        code: 'NOT_FOUND'
      });
    }

    // Add image URL if exists
    const imageUrl = await yamlHandler.getImageUrl(req.params.id);
    res.json({ ...game, image_url: imageUrl });
  } catch (err) {
    console.error('Error fetching game:', err);
    res.status(500).json({
      error: true,
      message: 'Failed to load game',
      code: 'LOAD_ERROR'
    });
  }
});

/**
 * POST /api/games/:id/upload
 * Upload image for a specific game
 * Image will be named: {Game Name} ({Year}).{ext}
 */
app.post('/api/games/:id/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No file provided',
        code: 'NO_FILE'
      });
    }

    // Get game metadata
    const game = await yamlHandler.getGameById(req.params.id);
    if (!game) {
      return res.status(404).json({
        error: true,
        message: 'Game not found',
        code: 'NOT_FOUND'
      });
    }

    // Validate image with sharp
    let metadata;
    try {
      metadata = await sharp(req.file.buffer).metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Unsupported image encoding');

      // Warn if dimensions are small
      if (metadata.width < 500 || metadata.height < 500) {
        console.warn(
          `Image for ${game.name} is small: ${metadata.width}x${metadata.height}px`
        );
      }
    } catch (err) {
      return res.status(400).json({
        error: true,
        message: 'Invalid image file',
        code: 'INVALID_IMAGE'
      });
    }

    // Generate filename from game metadata
    const base = images.basename(game);
    if (!base) return res.status(400).json({ error: true, message: 'Game needs a known name and year' });
    const ext = { jpeg: '.jpg', png: '.png', webp: '.webp' }[metadata.format];
    const filename = `${base}${ext}`;
    const filepath = path.join(yamlHandler.IMAGES_DIR, filename);

    // Write file to disk
    const previous = fs.existsSync(filepath) ? fs.readFileSync(filepath) : null;
    fs.writeFileSync(filepath, req.file.buffer);
    const provenance = {
      file: filename, source_url: null, publisher: game.publisher?.[0] || null,
      license: null, date: new Date().toISOString().slice(0, 10),
      resolution: `${metadata.width}x${metadata.height}`, review_status: 'unverified',
      notes: 'Uploaded through the local image manager; origin and permission evidence were not supplied.'
    };
    const recorded = spawnSync(process.env.PYTHON || 'python3',
      ['-m', 'scripts.image_assets', '--record', String(game.id), '--replace'],
      { cwd: path.join(__dirname, '..'), input: JSON.stringify(provenance), encoding: 'utf8' });
    if (recorded.status !== 0) {
      if (previous) fs.writeFileSync(filepath, previous);
      else fs.unlinkSync(filepath);
      throw new Error(`Provenance could not be recorded: ${recorded.stderr || recorded.error}`);
    }

    // Clear cache so next request reflects new image
    yamlHandler.clearCache();

    res.json({
      success: true,
      filename,
      path: `/api/images/${encodeURIComponent(filename)}`,
      message: 'Image uploaded successfully'
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({
      error: true,
      message: 'Failed to upload image',
      code: 'UPLOAD_ERROR',
      details: err.message
    });
  }
});

/**
 * GET /api/images/:filename
 * Serve images from the images directory
 */
app.get('/api/images/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(yamlHandler.IMAGES_DIR, filename);

    // Prevent path traversal
    const normalized = path.normalize(filepath);
    if (path.basename(filename) !== filename || !images.extensions.has(path.extname(filename).toLowerCase()) || path.dirname(normalized) !== yamlHandler.IMAGES_DIR) {
      return res.status(403).json({
        error: true,
        message: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        error: true,
        message: 'Image not found',
        code: 'NOT_FOUND'
      });
    }

    // Send file with appropriate content type
    res.sendFile(filepath);
  } catch (err) {
    console.error('Error serving image:', err);
    res.status(500).json({
      error: true,
      message: 'Failed to serve image',
      code: 'SERVE_ERROR'
    });
  }
});

/**
 * GET /api/master-list
 * Return merged master list from all source lists with research status
 */
app.get('/api/master-list', async (req, res) => {
  try {
    const masterList = await yamlHandler.loadMasterList();
    res.json(masterList);
  } catch (err) {
    console.error('Error fetching master list:', err);
    res.status(500).json({
      error: true,
      message: 'Failed to load master list',
      code: 'LOAD_ERROR'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    const games = await yamlHandler.loadAllGames();
    const stats = db.getStats();
    res.status(stats ? 200 : 503).json({
      status: stats ? 'healthy' : 'database_unavailable',
      games_loaded: games.length,
      database_games: stats?.total_games ?? null,
      images_directory: yamlHandler.IMAGES_DIR
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

// ============ Page Routes ============

/**
 * GET / → Games page (primary)
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'games.html'));
});

/**
 * GET /images → Image Manager
 */
app.get('/images', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'images.html'));
});

/**
 * GET /master-list
 * Serve master list page
 */
app.get('/master-list', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'master-list.html'));
});

app.get('/contribute', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contribute.html'));
});

// ============ Error Handling ============

app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        error: true,
        message: 'File too large. Maximum 20MB allowed.',
        code: 'FILE_TOO_LARGE'
      });
    }
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: true,
      message: err.message,
      code: 'INVALID_FILE_TYPE'
    });
  }

  res.status(500).json({
    error: true,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// ============ Server Start ============

// Initialize SQLite DB then start server
if (require.main === module) db.init().then(() => {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  Board Game Database - Web Interface                       ║
╚════════════════════════════════════════════════════════════╝

Server running at http://localhost:${PORT}

Pages:
  /             - Games browser (filter + search)
  /images       - Image manager (drag & drop upload)
  /master-list  - Master list tracker

API Endpoints:
  GET    /api/games/query        - Filtered game query (SQLite)
  GET    /api/filter-options     - Filter dropdown values
  GET    /api/games              - All games (YAML)
  GET    /api/games/:id          - Single game
  POST   /api/games/:id/upload   - Upload image
  GET    /api/images/:filename   - Serve image
  GET    /api/health             - Health check

Press Ctrl+C to stop the server
  `);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
