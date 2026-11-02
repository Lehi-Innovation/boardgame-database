const schema = require('./schema');

module.exports = function gamePayload(record, imageFile = null) {
  const game = { ...record };
  for (const [field, value] of Object.entries(schema.template)) {
    if (!(field in game) && field !== 'plays_tracked') {
      game[field] = Array.isArray(value) ? [] : value;
    }
  }
  // Preserve the original singular field names and legacy query aliases.
  game.designers = game.designer;
  game.publishers = game.publisher;
  game.artists = game.artist;
  game.total_plays = game.plays_tracked?.total_plays ?? null;
  game.has_image = imageFile !== null;
  game.image_url = imageFile ? `/api/images/${encodeURIComponent(imageFile)}` : null;
  return game;
};
