





// Mock redis if no real instance
class MockRedis {
  async get(key) {
    await new Promise(resolve => setTimeout(resolve, 10)); // simulate latency
    if (key.includes('v4')) return 'found-key';
    return null;
  }
  async mget(...keys) {
    await new Promise(resolve => setTimeout(resolve, 10));
    return keys.map(k => k.includes('v4') ? 'found-key' : null);
  }
}

const redisCache = new MockRedis();
const legacyCachePrefixes = ['threat-cache:v7', 'threat-cache:v6', 'threat-cache:v5', 'threat-cache:v4'];
const normalized = { host: 'example.com' };

const getCacheHostKey = (host) => `threat-cache:v8:host:${host}`;
const getCacheHostKeyForPrefix = (prefix, host) => `${prefix}:host:${host}`;

async function runCurrent() {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    let key = await redisCache.get(getCacheHostKey(normalized.host));
    if (!key) {
      for (const prefix of legacyCachePrefixes) {
        key = await redisCache.get(getCacheHostKeyForPrefix(prefix, normalized.host));
        if (key) {
          break;
        }
      }
    }
  }
  return performance.now() - start;
}

async function runOptimized() {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    let key = await redisCache.get(getCacheHostKey(normalized.host));
    if (!key && legacyCachePrefixes.length > 0) {
      const keysToFetch = legacyCachePrefixes.map(prefix => getCacheHostKeyForPrefix(prefix, normalized.host));
      const results = await redisCache.mget(...keysToFetch);
      const foundIndex = results.findIndex(result => result !== null);
      if (foundIndex !== -1) {
        key = results[foundIndex];
      }
    }
  }
  return performance.now() - start;
}

async function run() {
  console.log("Running current implementation...");
  const currentMs = await runCurrent();
  console.log(`Current: ${currentMs.toFixed(2)}ms`);

  console.log("Running optimized implementation...");
  const optimizedMs = await runOptimized();
  console.log(`Optimized: ${optimizedMs.toFixed(2)}ms`);
}

run().catch(console.error);
