const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// The maintained schema is also the presentation vocabulary.
const schema = yaml.load(fs.readFileSync(path.join(__dirname, '../../schema.yaml'), 'utf8'));
module.exports = schema;
