import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.vercel" });
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

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
const cacheIndexKey = `${cachePrefix}:keys`;
const cacheHostPrefix = `${cachePrefix}:host`;

async function checkRedisData() {
  console.log("=== Checking Redis Data ===\n");
  
  // Проверяем индекс
  const keys = await redis.smembers(cacheIndexKey);
  console.log(`Total keys in index: ${keys.length}`);
  
  if (keys.length > 0) {
    console.log(`\nFirst 5 keys:`);
    const firstKeys = keys.slice(0, 5);
    
    for (const key of firstKeys) {
      console.log(`\n--- Key: ${key} ---`);
      const record = await redis.get(key);
      
      if (record) {
        console.log(`Host: ${record.host}`);
        console.log(`Created: ${record.createdAt ? new Date(record.createdAt).toISOString() : 'N/A'}`);
        console.log(`Updated: ${record.updatedAt ? new Date(record.updatedAt).toISOString() : 'N/A'}`);
        console.log(`Reports: ${record.reports ? record.reports.length : 0}`);
        
        if (record.reports && record.reports.length > 0) {
          console.log(`\nReports for ${record.host}:`);
          record.reports.forEach((report, idx) => {
            console.log(`  ${idx + 1}. ${report.text} (${report.verdict}, score: ${report.score})`);
          });
        }
        
        if (record.data) {
          const result = record.data.aiAdjustedResult || record.data.enrichedLocalResult || record.data.analysis;
          if (result) {
            console.log(`Verdict: ${result.verdict}, Score: ${result.score}`);
          }
        }
      }
    }
  }
  
  // Проверяем записи с жалобами
  console.log(`\n\n=== Checking for records with reports ===`);
  let recordsWithReports = 0;
  
  for (const key of keys.slice(0, 50)) {
    const record = await redis.get(key);
    if (record && record.reports && record.reports.length > 0) {
      recordsWithReports++;
      console.log(`\n${record.host}: ${record.reports.length} reports`);
      record.reports.forEach((report, idx) => {
        console.log(`  ${idx + 1}. "${report.text}" - ${report.verdict} (${new Date(report.createdAt).toLocaleString()})`);
      });
    }
  }
  
  console.log(`\n\nTotal records with reports: ${recordsWithReports}`);
  
  // Проверяем статистику
  console.log(`\n\n=== Cache Stats ===`);
  const allRecords = await redis.mget(...keys.slice(0, 100));
  const validRecords = allRecords.filter(r => r && r.data);
  
  const verdicts = validRecords.reduce((acc, r) => {
    const verdict = r.data?.aiAdjustedResult?.verdict || r.data?.enrichedLocalResult?.verdict || r.data?.analysis?.verdict || 'low';
    acc[verdict] = (acc[verdict] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`Total valid records: ${validRecords.length}`);
  console.log(`Verdicts:`, verdicts);
}

checkRedisData().catch(console.error);
