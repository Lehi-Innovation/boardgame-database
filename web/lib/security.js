const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const IMAGE_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// This is a private local tool. Host checks also block DNS rebinding to loopback.
function localRequests(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
    'Cache-Control': 'no-store'
  });
  const port = req.socket.localPort;
  const host = req.headers.host;
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (port === 80) hosts.push('127.0.0.1', 'localhost');
  if (!hosts.includes(host)) return res.status(403).json({ error: true, code: 'HOST_DENIED', message: 'Open the local server using localhost or 127.0.0.1.' });
  const origin = req.headers.origin;
  if ((origin !== undefined && origin !== `http://${host}`) || req.headers['sec-fetch-site'] === 'cross-site') {
    return res.status(403).json({ error: true, code: 'ORIGIN_DENIED', message: 'Use the local application to access the catalog.' });
  }
  if (!['GET', 'HEAD'].includes(req.method) && origin !== `http://${host}`) {
    return res.status(403).json({ error: true, code: 'ORIGIN_REQUIRED', message: 'Use the local application to upload images.' });
  }
  next();
}

// Bound upload memory before multer reads the request, even for chunked bodies.
function uploadLimits() {
  let active = 0;
  let windowStart = Date.now();
  let attempts = 0;
  return (req, res, next) => {
    const now = Date.now();
    if (now - windowStart >= 60_000) { windowStart = now; attempts = 0; }
    if (active >= 2 || attempts >= 10) {
      res.set('Retry-After', '60');
      return res.status(429).json({ error: true, code: 'UPLOAD_LIMIT', message: 'Wait a minute before uploading another image.' });
    }
    attempts++;
    active++;
    let released = false;
    const release = () => { if (!released) { active--; released = true; } };
    req.releaseUpload = release;
    res.once('finish', release);
    // A disconnected client must not free a slot while decoding/writing continues.
    res.once('close', () => { if (!req.processingUpload) release(); });
    next();
  };
}

async function readImage(directory, filename) {
  if (typeof filename !== 'string' || !filename || /[/\\:\0]/.test(filename) || path.basename(filename) !== filename) {
    return null;
  }
  const type = IMAGE_TYPES[path.extname(filename).toLowerCase()];
  if (!type) return null;
  const root = await fs.promises.realpath(directory);
  let handle;
  try {
    const candidate = path.join(root, filename);
    if (!(await fs.promises.lstat(candidate)).isFile()) return null;
    const resolved = await fs.promises.realpath(candidate);
    if (path.dirname(resolved) !== root) return null;
    // Do not follow a symlink, even if it changes between checks and opening.
    handle = await fs.promises.open(candidate, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES) return null;
    return { type, bytes: await handle.readFile() };
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'ELOOP', 'EACCES'].includes(error.code)) return null;
    throw error;
  } finally {
    if (handle) await handle.close();
  }
}

async function writeImage(directory, filename, bytes) {
  if (path.basename(filename) !== filename || /[/\\:\0]/.test(filename) || !IMAGE_TYPES[path.extname(filename).toLowerCase()]) {
    throw new Error('Invalid image filename');
  }
  const root = await fs.promises.realpath(directory);
  const temporary = path.join(root, `.upload-${randomUUID()}`);
  try {
    await fs.promises.writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
    // Atomic replacement does not follow an existing destination symlink.
    await fs.promises.rename(temporary, path.join(root, filename));
  } finally {
    await fs.promises.rm(temporary, { force: true });
  }
}

module.exports = { localRequests, uploadLimits, readImage, writeImage, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS };
