const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const sharp = require('sharp');
const { createApp } = require('../server');
const { readImage, writeImage, uploadLimits } = require('../lib/security');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-security-'));
  const images = path.join(root, 'images');
  await fs.mkdir(images);
  let cacheClears = 0;
  const game = { id: 'sample', name: 'Sample', year: 2026 };
  const yamlHandler = {
    IMAGES_DIR: images,
    loadAllGames: async () => [game],
    getGameById: async id => id === game.id ? game : undefined,
    clearCache: () => { cacheClears++; }
  };
  const app = createApp({ yamlHandler, db: {} });
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await fs.rm(root, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { root, images, origin, cacheClears: () => cacheClears };
}

function multipart(bytes, name = 'sample.png', type = 'image/png') {
  const form = new FormData();
  form.append('image', new Blob([bytes], { type }), name);
  return form;
}

function rawRequest(origin, requestPath, headers = {}) {
  const url = new URL(origin);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: url.hostname, port: url.port, path: requestPath, headers }, res => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('local reads work; foreign hosts, origins, browser requests and framing are blocked', async t => {
  const { origin } = await fixture(t);
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).images_directory, undefined);
  assert.equal((await rawRequest(origin, '/api/health', { Host: 'attacker.example' })).status, 403);
  assert.equal((await fetch(`${origin}/api/health`, { headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await rawRequest(origin, '/api/health', { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await fetch(`${origin}/`, { headers: { Origin: origin } })).status, 200);
});

test('uploads reject absent or foreign origins before accepting any file', async t => {
  const { origin, images, cacheClears } = await fixture(t);
  for (const headers of [{}, { Origin: 'null' }, { Origin: 'https://attacker.example' }]) {
    const response = await fetch(`${origin}/api/games/sample/upload`, { method: 'POST', headers, body: multipart(Buffer.from('not an image')) });
    assert.equal(response.status, 403);
  }
  assert.deepEqual(await fs.readdir(images), []);
  assert.equal(cacheClears(), 0);
});

test('same-origin upload decodes pixels, strips metadata, and serves a typed image', async t => {
  const { origin, images, cacheClears } = await fixture(t);
  const original = await sharp({ create: { width: 520, height: 520, channels: 3, background: '#334455' } }).png().withMetadata().toBuffer();
  const response = await fetch(`${origin}/api/games/sample/upload`, { method: 'POST', headers: { Origin: origin }, body: multipart(original) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.filename, 'Sample (2026).png');
  const stored = await fs.readFile(path.join(images, result.filename));
  const metadata = await sharp(stored).metadata();
  assert.equal(metadata.width, 520);
  assert.equal(metadata.height, 520);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(cacheClears(), 1);
  const served = await fetch(`${origin}${result.path}`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), stored);
});

test('invalid bytes, mismatched formats, animation, excessive pixels, and extra fields never write files', async t => {
  const { origin, images } = await fixture(t);
  const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#334455' } }).jpeg().toBuffer();
  const huge = await sharp({ create: { width: 6400, height: 6400, channels: 3, background: '#334455' } }).png().toBuffer();
  // GIF is rejected even when given an allowed extension and MIME type.
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
  const frames = Buffer.concat([Buffer.alloc(8 * 8 * 3, 0), Buffer.alloc(8 * 8 * 3, 255)]);
  const animated = await sharp(frames, { raw: { width: 8, height: 16, channels: 3, pageHeight: 8 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  assert.equal((await sharp(animated).metadata()).pages, 2);
  const cases = [multipart(Buffer.from('invalid')), multipart(jpeg), multipart(gif), multipart(huge), multipart(animated, 'sample.webp', 'image/webp')];
  const extra = multipart(jpeg, 'sample.jpg', 'image/jpeg');
  extra.append('extra', 'not allowed');
  cases.push(extra);
  for (const body of cases) {
    const response = await fetch(`${origin}/api/games/sample/upload`, { method: 'POST', headers: { Origin: origin }, body });
    assert.equal(response.status, 400);
  }
  assert.deepEqual(await fs.readdir(images), []);
});

test('image reads reject traversal, double encoding, sibling paths, symlinks and non-images', async t => {
  const { origin, root, images } = await fixture(t);
  await fs.writeFile(path.join(root, 'private.png'), 'private');
  await fs.writeFile(path.join(images, 'sources.yaml'), 'private metadata');
  assert.equal(await readImage(images, '../private.png'), null);
  assert.equal(await readImage(images, '..\\private.png'), null);
  assert.equal(await readImage(images, 'sources.yaml'), null);
  for (const requestPath of ['/api/images/..%2fprivate.png', '/api/images/%252e%252e%252fprivate.png', '/api/images/sources.yaml', '/api/images/%zz']) {
    assert.ok([400, 404].includes((await rawRequest(origin, requestPath)).status));
  }
  try {
    await fs.symlink(path.join(root, 'private.png'), path.join(images, 'link.png'));
  } catch (error) {
    if (error.code === 'EPERM') { t.diagnostic('Symlink assertions require OS permission to create symlinks'); return; }
    throw error;
  }
  assert.equal(await readImage(images, 'link.png'), null);
  assert.equal((await fetch(`${origin}/api/images/link.png`)).status, 404);
  await writeImage(images, 'link.png', Buffer.from('replacement'));
  assert.equal(await fs.readFile(path.join(root, 'private.png'), 'utf8'), 'private');
  assert.equal(await fs.readFile(path.join(images, 'link.png'), 'utf8'), 'replacement');
  assert.equal((await fs.lstat(path.join(images, 'link.png'))).isSymbolicLink(), false);
});

test('upload attempts and body sizes are bounded with useful status codes', async t => {
  const { origin } = await fixture(t);
  for (let i = 0; i < 10; i++) {
    assert.equal((await fetch(`${origin}/api/games/sample/upload`, { method: 'POST', headers: { Origin: origin }, body: multipart(Buffer.from('invalid')) })).status, 400);
  }
  const limited = await fetch(`${origin}/api/games/sample/upload`, { method: 'POST', headers: { Origin: origin }, body: multipart(Buffer.from('invalid')) });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  const json = await fetch(`${origin}/api/games/sample/upload`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ padding: 'x'.repeat(40_000) }) });
  assert.equal(json.status, 413);
});

test('oversized multipart files fail before image processing or any disk write', async t => {
  const { origin, images, cacheClears } = await fixture(t);
  const response = await fetch(`${origin}/api/games/sample/upload`, {
    method: 'POST', headers: { Origin: origin }, body: multipart(Buffer.alloc(20 * 1024 * 1024 + 1))
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await fs.readdir(images), []);
  assert.equal(cacheClears(), 0);
});

test('concurrency slots survive disconnects during processing and release exactly once', () => {
  const limit = uploadLimits();
  function attempt() {
    const req = {};
    const res = new EventEmitter();
    let status;
    let accepted = false;
    res.set = () => {};
    res.status = value => { status = value; return res; };
    res.json = () => res;
    limit(req, res, () => { accepted = true; });
    return { req, res, accepted, status };
  }
  const first = attempt();
  const second = attempt();
  assert.ok(first.accepted && second.accepted);
  assert.equal(attempt().status, 429);
  first.req.processingUpload = true;
  first.res.emit('close');
  assert.equal(attempt().status, 429);
  first.req.releaseUpload();
  first.res.emit('finish');
  const third = attempt();
  assert.ok(third.accepted);
  assert.equal(attempt().status, 429);
  // Disconnect before image processing releases a slot as well.
  second.res.emit('close');
  assert.ok(attempt().accepted);
});
