const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const IMAGES_DIR = path.join(__dirname, '../../images');
const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
let provenance = {};
let provenanceVersion = null;

function imageProvenance() {
  const source = path.join(IMAGES_DIR, 'sources.yaml');
  if (!fs.existsSync(source)) return {};
  const stat = fs.statSync(source);
  const current = `${stat.ino}:${stat.size}:${stat.mtimeMs}`;
  if (current !== provenanceVersion) {
    provenance = yaml.load(fs.readFileSync(source, 'utf8')) || {};
    provenanceVersion = current;
  }
  return provenance;
}

function basename(game) {
  if (!game.name || game.year == null) return null;
  return `${game.name} (${game.year})`.replace(/[/\\\x00-\x1f\x7f]/g, '_');
}

function findImage(game, files = fs.readdirSync(IMAGES_DIR)) {
  const entry = imageProvenance()[game.id];
  if (entry?.review_status?.startsWith('quarantined')) return null;
  const recorded = entry?.file;
  if (recorded && path.basename(recorded) === recorded && extensions.has(path.extname(recorded).toLowerCase()) && files.includes(recorded)) {
    return recorded;
  }
  const base = basename(game);
  if (!base) return null;
  const map = new Map(files.filter(f => extensions.has(path.extname(f).toLowerCase())).sort()
    .map(f => [path.parse(f).name.toLowerCase(), f]));
  return map.get(base.toLowerCase()) || map.get(base.replace(/[^a-zA-Z0-9\s().-]/g, '_').toLowerCase()) || null;
}

module.exports = { basename, findImage, IMAGES_DIR, extensions };
