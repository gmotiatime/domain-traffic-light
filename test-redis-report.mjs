import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import { createHash } from "crypto";

dotenv.config({ path: ".env.vercel" });

const redisRestUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const redisRestToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

if (!redisRestUrl || !redisRestToken) {
  console.error("Redis credentials not found");
  process.exit(1);
}

const redis = new Redis({
  url: redisRestUrl,
  token: redisRestToken,
});

const cacheVersion = String(process.env.THREAT_CACHE_VERSION || "stable").trim();
const configuredCachePrefix = String(process.env.THREAT_CACHE_PREFIX || "").trim();
const cachePrefix = configuredCachePrefix || `threat-cache:${cacheVersion}`;
const cacheHostPrefix = `${cachePrefix}:host`;

function normalizeHost(host) {
  let normalized = String(host || "").toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//i, '');
  normalized = normalized.split('/')[0].split('?')[0].split('#')[0];
  normalized = normalized.replace(/:80$/, '').replace(/:443$/, '');
  if (normalized.startsWith('www.')) {
    normalized = normalized.substring(4);
  }
  return normalized;
}

function generateId(host) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const payload = `${host}-${timestamp}-${random}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

async function testAddReport() {
  console.log("=== Testing Add Report to Redis ===\n");
  
  // Выбираем первый домен из Redis
  const cacheIndexKey = `${cachePrefix}:keys`;
  const keys = await redis.smembers(cacheIndexKey);
  
  if (keys.length === 0) {
    console.log("No records in Redis to test with");
    return;
  }
  
  const firstKey = keys[0];
  const record = await redis.get(firstKey);
  
  if (!record || !record.host) {
    console.log("Invalid record structure");
    return;
  }
  
  const host = record.host;
  console.log(`Testing with host: ${host}`);
  console.log(`Current reports: ${record.reports?.length || 0}`);
  
  // Добавляем тестовую жалобу
  const now = Date.now();
  const report = {
    id: generateId(`report-${host}-${now}`),
    text: "Test report from script",
    verdict: "high",
    score: 80,
    createdAt: now,
    resolved: false
  };
  
  const hostKey = `${cacheHostPrefix}:${host}`;
  
  // Lua скрипт для атомарного добавления
  const luaScript = `
    local hostKey = KEYS[1]
    local reportJson = ARGV[1]
    local now = ARGV[2]
    
    local record = redis.call('GET', hostKey)
    if not record then
      return nil
    end
    
    local recordData = cjson.decode(record)
    if not recordData.reports then
      recordData.reports = {}
    end
    
    local newReport = cjson.decode(reportJson)
    table.insert(recordData.reports, newReport)
    recordData.updatedAt = tonumber(now)
    
    redis.call('SET', hostKey, cjson.encode(recordData))
    return #recordData.reports
  `;
  
  try {
    const reportsCount = await redis.eval(
      luaScript,
      [hostKey],
      [JSON.stringify(report), now.toString()]
    );
    
    console.log(`\n✓ Report added successfully!`);
    console.log(`Total reports now: ${reportsCount}`);
    
    // Проверяем результат
    const updatedRecord = await redis.get(hostKey);
    console.log(`\nVerification:`);
    console.log(`- Host: ${updatedRecord.host}`);
    console.log(`- Reports count: ${updatedRecord.reports?.length || 0}`);
    
    if (updatedRecord.reports && updatedRecord.reports.length > 0) {
      console.log(`\nLatest report:`);
      const latest = updatedRecord.reports[updatedRecord.reports.length - 1];
      console.log(`  ID: ${latest.id}`);
      console.log(`  Text: ${latest.text}`);
      console.log(`  Verdict: ${latest.verdict}`);
      console.log(`  Score: ${latest.score}`);
    }
    
  } catch (error) {
    console.error("Error adding report:", error);
  }
}

testAddReport().catch(console.error);
