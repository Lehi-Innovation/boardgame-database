const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const legacyYamlHandler = require('./lib/yaml-handler');
const legacyDatabase = require('./lib/db');
const { localRequests, uploadLimits, readImage, writeImage, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS } = require('./lib/security');

function createApp({ yamlHandler = legacyYamlHandler, db = legacyDatabase } = {}) {
  const app = express();
  app.disable('x-powered-by');

  // Middleware
  app.use(localRequests);
  app.use(express.json({ limit: '32kb', strict: true }));
  app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny', index: false }));

  // Configure multer for file uploads (store in memory)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_IMAGE_BYTES,
      files: 1,
      fields: 0,
      // Busboy signals the limit on the final allowed part; files/fields enforce one image.
      parts: 2
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

  /**
   * GET /api/games/query
   * Filtered, sorted, paginated game query powered by SQLite.
   * Must be registered before /api/games/:id to avoid route collision.
   */
  app.get('/api/games/query', (req, res) => {
    try {
      const filters = {};

      if (req.query.q) filters.q = req.query.q;
      if (req.query.categories) filters.categories = [].concat(req.query.categories);
      if (req.query.evokes) filters.evokes = [].concat(req.query.evokes);
      if (req.query.true_counts) filters.true_counts = [].concat(req.query.true_counts);

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
  app.post('/api/games/:id/upload', uploadLimits(), upload.single('image'), async (req, res) => {
    req.processingUpload = true;
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

      // Decode and re-encode pixels; never serve arbitrary uploaded bytes.
      let imageBytes;
      try {
        const image = sharp(req.file.buffer, { limitInputPixels: MAX_IMAGE_PIXELS, animated: false, failOn: 'warning' });
        const metadata = await image.metadata();
        const ext = path.extname(req.file.originalname).toLowerCase();
        const format = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp' }[ext];
        if (metadata.format !== format || (metadata.pages || 1) !== 1 || !metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
          throw new Error('Unsupported image');
        }
        imageBytes = await image.rotate().toFormat(format).toBuffer();
        if (imageBytes.length > MAX_IMAGE_BYTES) throw new Error('Image is too large');

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
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${game.name} (${game.year})${ext}`;

      // Sanitize filename (prevent path traversal)
      const sanitized = filename.replace(/[^a-zA-Z0-9\s().-]/g, '_');
      await writeImage(yamlHandler.IMAGES_DIR, sanitized, imageBytes);

      // Clear cache so next request reflects new image
      yamlHandler.clearCache();

      res.json({
        success: true,
        filename: sanitized,
        path: `/api/images/${encodeURIComponent(sanitized)}`,
        message: 'Image uploaded successfully'
      });
    } catch (err) {
      console.error('Error uploading image:', err);
      res.status(500).json({
        error: true,
        message: 'Failed to upload image',
        code: 'UPLOAD_ERROR'
      });
    } finally {
      req.releaseUpload();
    }
  });

  /**
   * GET /api/images/:filename
   * Serve images from the images directory
   */
  app.get('/api/images/:filename', async (req, res) => {
    try {
      // Express decodes the route parameter once. A second decode enables bypasses.
      const image = await readImage(yamlHandler.IMAGES_DIR, req.params.filename);
      if (!image) {
        return res.status(404).json({
          error: true,
          message: 'Image not found',
          code: 'NOT_FOUND'
        });
      }

      res.type(image.type).send(image.bytes);
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
      res.json({
        status: 'healthy',
        games_loaded: games.length,
      });
    } catch (err) {
      res.status(500).json({
        status: 'unhealthy',
        error: 'Catalog health check failed'
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

  // ============ Error Handling ============

  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: true,
          message: 'File too large. Maximum 20MB allowed.',
          code: 'FILE_TOO_LARGE'
        });
      }
      return res.status(400).json({ error: true, message: 'Upload exactly one image without extra fields.', code: 'INVALID_UPLOAD' });
    }

    if (err.type === 'entity.too.large') return res.status(413).json({ error: true, message: 'Request is too large.', code: 'BODY_TOO_LARGE' });
    if (err instanceof URIError || err.type === 'entity.parse.failed') return res.status(400).json({ error: true, message: 'Invalid request.', code: 'INVALID_REQUEST' });

    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({
        error: true,
        message: err.message,
        code: 'INVALID_FILE_TYPE'
      });
    }

    console.error('Legacy request failed');
    res.status(500).json({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  });

  return app;
}

module.exports = { createApp };

// ============ Server Start ============

// Initialize SQLite DB then start server
if (require.main === module) {
  const PORT = Number(process.env.PORT || 3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  legacyDatabase.init().then(() => {
    const app = createApp();
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
}
