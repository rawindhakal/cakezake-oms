const PlatformConfig = require('../models/PlatformConfig');

// Simple in-memory cache — refreshed every 5 minutes
let cache = {};
let cacheAt = 0;
const TTL = 5 * 60 * 1000;

async function getConfig(key) {
  if (Date.now() - cacheAt > TTL) {
    const all = await PlatformConfig.find().lean();
    cache = {};
    all.forEach(r => { if (r.value) cache[r.key] = r.value; });
    cacheAt = Date.now();
  }
  return cache[key] || process.env[envKey(key)] || '';
}

function envKey(key) {
  return key.toUpperCase();
}

function invalidateCache() {
  cacheAt = 0;
}

module.exports = { getConfig, invalidateCache };
