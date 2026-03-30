import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabase } from "./db-manager.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Миграция старой базы данных в новый формат
 */
export function migrateOldDatabase() {
  const oldDbPath = path.join(__dirname, "threat-db.json");
  
  if (!fs.existsSync(oldDbPath)) {
    console.log("[Migration] No old database found, skipping migration");
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  console.log("[Migration] Starting migration from v1 to v2...");
  
  const db = getDatabase();
  const stats = { migrated: 0, skipped: 0, errors: 0 };

  try {
    const raw = fs.readFileSync(oldDbPath, "utf-8");
    const oldData = JSON.parse(raw);

    // Группируем записи по хосту и берем только самую свежую
    const hostToRecords = new Map();

    for (const [key, record] of Object.entries(oldData)) {
      if (!record?.data) {
        stats.skipped++;
        continue;
      }

      const host = 
        record.host ||
        record.data?.aiAdjustedResult?.host ||
        record.data?.enrichedLocalResult?.host ||
        record.data?.analysis?.host;

      if (!host) {
        stats.skipped++;
        continue;
      }

      if (!hostToRecords.has(host)) {
        hostToRecords.set(host, []);
      }

      hostToRecords.get(host).push({ key, record });
    }

    // Для каждого хоста берем самую свежую запись
    for (const [host, records] of hostToRecords.entries()) {
      try {
        const latest = records.reduce((prev, curr) => {
          const prevTime = Number(prev.record?.updatedAt || prev.record?.createdAt || 0);
          const currTime = Number(curr.record?.updatedAt || curr.record?.createdAt || 0);
          return currTime > prevTime ? curr : prev;
        });

        const oldRecord = latest.record;
        const data = oldRecord.data;

        // Извлекаем финальный результат
        const result = 
          data.aiAdjustedResult ||
          data.enrichedLocalResult ||
          data.analysis;

        if (!result) {
          stats.skipped++;
          continue;
        }

        // Создаем новую запись
        db.set(host, {
          verdict: result.verdict || "low",
          score: Number(result.score) || 0,
          summary: result.summary || "",
          reasons: result.reasons || [],
          actions: result.actions || [],
          breakdown: result.breakdown || {},
          threatIntel: data.threatIntel || null,
          urlAbuseIntel: data.urlAbuseIntel || null,
          networkSignals: data.networkSignals || null,
          model: data.model || null,
          source: data.source || null,
          latencyMs: data.latencyMs || null
        });

        stats.migrated++;
      } catch (error) {
        console.error(`[Migration] Error migrating ${host}: ${error.message}`);
        stats.errors++;
      }
    }

    // Создаем бэкап старой базы
    const backupPath = path.join(__dirname, `threat-db.backup-${Date.now()}.json`);
    fs.copyFileSync(oldDbPath, backupPath);
    console.log(`[Migration] Old database backed up to: ${backupPath}`);

    console.log(`[Migration] Complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.errors} errors`);
  } catch (error) {
    console.error(`[Migration] Fatal error: ${error.message}`);
    stats.errors++;
  }

  return stats;
}

/**
 * Запуск миграции если нужно
 */
export function autoMigrate() {
  const oldDbPath = path.join(__dirname, "threat-db.json");
  const newDbPath = path.join(__dirname, "threat-db-v2.json");

  // Если есть старая база, но нет новой - мигрируем
  if (fs.existsSync(oldDbPath) && !fs.existsSync(newDbPath)) {
    console.log("[Migration] Auto-migration triggered");
    return migrateOldDatabase();
  }

  return null;
}

// Если запущен напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running database migration...");
  const stats = migrateOldDatabase();
  console.log("Migration stats:", stats);
  process.exit(0);
}
