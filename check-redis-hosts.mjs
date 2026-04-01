import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.vercel" });

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const cacheVersion = "stable";
const cachePrefix = `threat-cache:${cacheVersion}`;
const cacheHostPrefix = `${cachePrefix}:host`;

async function checkHost(host) {
  console.log(`\n=== Checking ${host} ===`);
  
  const hostKey = `${cacheHostPrefix}:${host}`;
  console.log(`Host key: ${hostKey}`);
  
  const record = await redis.get(hostKey);
  console.log(`Record exists: ${!!record}`);
  console.log(`Record type: ${typeof record}`);
  
  if (record) {
    console.log(`Record keys:`, Object.keys(record));
    console.log(`Record.key:`, record.key);
    console.log(`Record.host:`, record.host);
    console.log(`Record.reports:`, record.reports?.length || 0);
  }
}

async function main() {
  await checkHost("hypixel.com");
  await checkHost("zoom-meetings.co");
  await checkHost("faceb00k-security.net");
}

main().catch(console.error);
