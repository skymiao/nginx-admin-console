const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false,
});

const get = (key) => {
  return cache.get(key);
};

const set = (key, value, ttl) => {
  return cache.set(key, value, ttl);
};

const del = (key) => {
  return cache.del(key);
};

const flushAll = () => {
  return cache.flushAll();
};

const getStats = () => {
  return cache.getStats();
};

const getKeys = () => {
  return cache.keys();
};

const delByPattern = (pattern) => {
  const keys = cache.keys();
  const keysToDelete = keys.filter(key => key.includes(pattern));
  if (keysToDelete.length > 0) {
    cache.del(keysToDelete);
  }
  return keysToDelete.length;
};

module.exports = {
  get,
  set,
  del,
  flushAll,
  getStats,
  getKeys,
  delByPattern,
};
