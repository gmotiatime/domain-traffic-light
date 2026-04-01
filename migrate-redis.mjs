import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const redisRestUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisRestToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisRestUrl || !redisRestToken) {
  console.error("Redis credentials not found in env.");
  process.exit(1);
}

const redis = new Redis({
  url: redisRestUrl,
  token: redisRestToken,
});

async function migrate() {
  const cacheVersion = String(process.env.THREAT_CACHE_VERSION || "stable").trim();
  const configuredCachePrefix = String(process.env.THREAT_CACHE_PREFIX || "").trim();
  const cachePrefix = configuredCachePrefix || `threat-cache:${cacheVersion}`;
  const cacheHostPrefix = `${cachePrefix}:host`;
  
  console.log(`Scanning keys matching ${cacheHostPrefix}:*`);
  
  let totalMigrated = 0;
  let totalChecked = 0;
  
  // Получаем все ключи хостов
  let cursor = 0;
  do {
    const res = await redis.scan(cursor, { match: `${cacheHostPrefix}:*`, count: 100 });
    cursor = res[0];
    const keys = res[1];
    
    for (const key of keys) {
      totalChecked++;
      const data = await redis.get(key);
      
      if (data && typeof data === 'object') {
        // Найден старый формат, где хост указывает прямо на объект
        const recordKey = data.key;
        if (recordKey) {
          console.log(`Migrating ${key} to format host->key (${recordKey})`);
          
          // Сохраняем полную запись по ключу-указателю
          const fullRecordKey = `${cachePrefix}:record:${recordKey}`;
          await redis.set(fullRecordKey, data);
          
          // Добавляем в Set ключей
          await redis.sadd(`${cachePrefix}:keys`, fullRecordKey);
          
          // Обновляем ключ хоста, чтобы он указывал только на recordKey
          await redis.set(key, recordKey);
          totalMigrated++;
        }
      }
    }
  } while (cursor !== 0 && cursor !== "0");
  
  console.log(`Migration completed. Checked: ${totalChecked}, Migrated: ${totalMigrated}`);
}

migrate().catch(console.error);
