import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import { createHash } from "crypto";

dotenv.config({ path: ".env.vercel" });

const redisRestUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const redisRestToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

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

async function testSyncReport() {
  console.log("=== Testing Synced Report Add ===\n");
  
  const host = "test.com";
  const normalized = normalizeHost(host);
  const hostKey = `${cacheHostPrefix}:${normalized}`;
  
  // Получаем текущую запись
  const hostRecord = await redis.get(hostKey);
  
  if (!hostRecord) {
    console.log("No record found for test.com");
    return;
  }
  
  console.log(`Host: ${hostRecord.host}`);
  console.log(`Record key: ${hostRecord.key}`);
  console.log(`Current reports: ${hostRecord.reports?.length || 0}`);
  
  const recordKey = hostRecord.key ? `${cachePrefix}:record:${hostRecord.key}` : "";
  
  // Добавляем жалобу
  const now = Date.now();
  const report = {
    id: generateId(`report-${normalized}-${now}`),
    text: "Synced test report",
    verdict: "medium",
    score: 50,
    createdAt: now,
    resolved: false
  };
  
  const luaScript = `
    local hostKey = KEYS[1]
    local recordKey = KEYS[2]
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
    
    -- Обновляем оба ключа
    redis.call('SET', hostKey, cjson.encode(recordData))
    if recordKey ~= "" then
      redis.call('SET', recordKey, cjson.encode(recordData))
    end
    
    return #recordData.reports
  `;
  
  try {
    const reportsCount = await redis.eval(
      luaScript,
      [hostKey, recordKey],
      [JSON.stringify(report), now.toString()]
    );
    
    console.log(`\n✓ Report added and synced!`);
    console.log(`Total reports: ${reportsCount}`);
    
    // Проверяем оба ключа
    console.log(`\n=== Verification ===`);
    
    const updatedHost = await redis.get(hostKey);
    console.log(`\nHost key (${hostKey}):`);
    console.log(`  Reports: ${updatedHost.reports?.length || 0}`);
    
    if (recordKey) {
      const updatedRecord = await redis.get(recordKey);
      console.log(`\nRecord key (${recordKey}):`);
      console.log(`  Reports: ${updatedRecord?.reports?.length || 0}`);
      
      if (updatedRecord?.reports && updatedRecord.reports.length > 0) {
        console.log(`\n  Latest report:`);
        const latest = updatedRecord.reports[updatedRecord.reports.length - 1];
        console.log(`    Text: ${latest.text}`);
        console.log(`    Verdict: ${latest.verdict}`);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testSyncReport().catch(console.error);
