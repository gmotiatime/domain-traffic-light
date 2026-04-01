import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

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

async function checkStructure() {
  console.log("=== Checking Redis Structure ===\n");
  
  // Проверяем host ключ для test.com
  const hostKey = `${cacheHostPrefix}:test.com`;
  console.log(`Checking host key: ${hostKey}`);
  
  const hostRecord = await redis.get(hostKey);
  console.log("\nHost record:");
  console.log(JSON.stringify(hostRecord, null, 2));
  
  // Проверяем record ключ
  const cacheIndexKey = `${cachePrefix}:keys`;
  const keys = await redis.smembers(cacheIndexKey);
  
  const testComKeys = keys.filter(k => k.includes('test.com') || k.includes('91da579927d6f301'));
  console.log(`\nRecord keys for test.com: ${testComKeys.length}`);
  
  for (const key of testComKeys) {
    console.log(`\nChecking record key: ${key}`);
    const record = await redis.get(key);
    console.log(`Reports: ${record?.reports?.length || 0}`);
    if (record?.reports && record.reports.length > 0) {
      console.log("Reports:", JSON.stringify(record.reports, null, 2));
    }
  }
}

checkStructure().catch(console.error);
