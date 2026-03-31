#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "server", "threat-db.json");

console.log("🔍 Дедупликация threat-db.json...\n");

if (!fs.existsSync(dbPath)) {
  console.log("❌ Файл threat-db.json не найден");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
const totalBefore = Object.keys(data).length;

console.log(`📊 Записей до дедупликации: ${totalBefore}`);

// Группируем записи по host
const hostToRecords = new Map();
for (const [key, record] of Object.entries(data)) {
  const host = record?.host;
  if (!host) {
    console.log(`⚠️  Запись ${key} без host, пропускаем`);
    continue;
  }
  
  if (!hostToRecords.has(host)) {
    hostToRecords.set(host, []);
  }
  hostToRecords.get(host).push({ key, record });
}

console.log(`🌐 Уникальных хостов: ${hostToRecords.size}`);

// Для каждого хоста оставляем только самую свежую запись
const deduplicatedData = {};
let duplicatesRemoved = 0;

for (const [host, records] of hostToRecords.entries()) {
  if (records.length === 1) {
    deduplicatedData[records[0].key] = records[0].record;
    continue;
  }
  
  // Находим самую свежую запись
  const latest = records.reduce((prev, curr) => {
    const prevTime = Number(prev.record?.updatedAt || prev.record?.createdAt || 0);
    const currTime = Number(curr.record?.updatedAt || curr.record?.createdAt || 0);
    return currTime > prevTime ? curr : prev;
  });
  
  deduplicatedData[latest.key] = latest.record;
  duplicatesRemoved += records.length - 1;
  
  console.log(`🔄 ${host}: ${records.length} записей → 1 (удалено ${records.length - 1})`);
}

const totalAfter = Object.keys(deduplicatedData).length;

console.log(`\n✅ Записей после дедупликации: ${totalAfter}`);
console.log(`🗑️  Удалено дубликатов: ${duplicatesRemoved}`);

// Создаем бэкап
const backupPath = dbPath.replace(".json", `.backup-${Date.now()}.json`);
fs.copyFileSync(dbPath, backupPath);
console.log(`\n💾 Бэкап создан: ${path.basename(backupPath)}`);

// Сохраняем дедуплицированные данные
fs.writeFileSync(dbPath, JSON.stringify(deduplicatedData, null, 2), "utf-8");
console.log(`✨ Дедупликация завершена!\n`);
