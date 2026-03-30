import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Новая оптимизированная структура базы данных
 * 
 * Структура:
 * {
 *   version: 2,
 *   metadata: { created, updated, recordCount },
 *   index: { "host": "recordId", ... },
 *   records: {
 *     "recordId": {
 *       id, host, verdict, score, summary,
 *       createdAt, updatedAt, expiresAt,
 *       reasons: [...], actions: [...],
 *       signals: { threat, network, ai }
 *     }
 *   }
 * }
 */

export class DatabaseManager {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(__dirname, "threat-db-v2.json");
    this.backupPath = options.backupPath || path.join(__dirname, "backups");
    this.ttlMs = options.ttlMs || 7 * 24 * 60 * 60 * 1000; // 7 дней
    this.autoSave = options.autoSave !== false;
    this.saveDebounceMs = options.saveDebounceMs || 2000;
    
    this.data = {
      version: 2,
      metadata: {
        created: Date.now(),
        updated: Date.now(),
        recordCount: 0
      },
      index: {},
      records: {}
    };
    
    this.saveTimer = null;
    this.isDirty = false;
    
    this.load();
  }

  /**
   * Загрузка базы из файла
   */
  load() {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (fs.existsSync(this.dbPath)) {
          const raw = fs.readFileSync(this.dbPath, "utf-8");
          
          if (!raw || raw.trim().length === 0) {
            console.warn(`[DB] Empty database file on attempt ${attempt}/${maxRetries}`);
            if (attempt < maxRetries) continue;
            console.log("[DB] Starting with fresh database");
            return;
          }
          
          const loaded = JSON.parse(raw);
          
          if (!loaded || typeof loaded !== 'object') {
            throw new Error('Invalid database format: not an object');
          }
          
          if (loaded.version === 2) {
            // Валидация структуры
            if (!loaded.metadata || !loaded.index || !loaded.records) {
              throw new Error('Invalid v2 database structure');
            }
            
            this.data = loaded;
            console.log(`[DB] Loaded ${this.data.metadata.recordCount} records from v2 database`);
            return;
          } else {
            console.log("[DB] Old database format detected, starting fresh");
            return;
          }
        } else {
          console.log("[DB] No existing database, starting fresh");
          return;
        }
      } catch (error) {
        lastError = error;
        console.error(`[DB] Load attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          // Небольшая задержка перед повторной попыткой
          const delay = 100 * attempt;
          const start = Date.now();
          while (Date.now() - start < delay) {
            // Синхронная задержка
          }
        }
      }
    }
    
    console.error(`[DB] Failed to load database after ${maxRetries} attempts. Starting fresh.`);
    if (lastError) {
      console.error(`[DB] Last error: ${lastError.message}`);
    }
  }

  /**
   * Сохранение базы в файл
   */
  save(immediate = false) {
    if (!this.autoSave) return;

    if (immediate) {
      this._performSave();
    } else {
      this.isDirty = true;
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this._performSave(), this.saveDebounceMs);
    }
  }

  _performSave() {
    try {
      this.data.metadata.updated = Date.now();
      this.data.metadata.recordCount = Object.keys(this.data.records).length;
      
      const json = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(this.dbPath, json, "utf-8");
      
      this.isDirty = false;
      console.log(`[DB] Saved ${this.data.metadata.recordCount} records`);
    } catch (error) {
      console.error(`[DB] Save error: ${error.message}`);
    }
  }

  /**
   * Создание резервной копии
   */
  backup() {
    try {
      if (!fs.existsSync(this.backupPath)) {
        fs.mkdirSync(this.backupPath, { recursive: true });
      }

      const timestamp = Date.now();
      const backupFile = path.join(this.backupPath, `threat-db-${timestamp}.json`);
      
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, backupFile);
        console.log(`[DB] Backup created: ${backupFile}`);
        
        // Удаляем старые бэкапы (оставляем последние 5)
        this._cleanOldBackups(5);
      }
    } catch (error) {
      console.error(`[DB] Backup error: ${error.message}`);
    }
  }

  _cleanOldBackups(keepCount = 5) {
    try {
      const files = fs.readdirSync(this.backupPath)
        .filter(f => f.startsWith("threat-db-") && f.endsWith(".json"))
        .map(f => ({
          name: f,
          path: path.join(this.backupPath, f),
          time: fs.statSync(path.join(this.backupPath, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);

      files.slice(keepCount).forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`[DB] Deleted old backup: ${file.name}`);
      });
    } catch (error) {
      console.error(`[DB] Cleanup error: ${error.message}`);
    }
  }

  /**
   * Генерация ID записи
   */
  generateId(host) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const payload = `${host}-${timestamp}-${random}`;
    return createHash("sha256").update(payload).digest("hex").slice(0, 16);
  }

  /**
   * Нормализация хоста
   * Убирает www., протокол, путь - оставляет только базовый домен
   */
  normalizeHost(host) {
    let normalized = String(host || "").toLowerCase().trim();
    
    // Убираем протокол если есть
    normalized = normalized.replace(/^https?:\/\//i, '');
    
    // Убираем путь и query параметры
    normalized = normalized.split('/')[0].split('?')[0].split('#')[0];
    
    // Убираем порт если это стандартный порт
    normalized = normalized.replace(/:80$/, '').replace(/:443$/, '');
    
    // Убираем www. префикс
    if (normalized.startsWith('www.')) {
      normalized = normalized.substring(4);
    }
    
    return normalized;
  }

  /**
   * Получение записи по хосту
   */
  getByHost(host) {
    try {
      const normalized = this.normalizeHost(host);
      const recordId = this.data.index[normalized];
      
      if (!recordId) return null;
      
      const record = this.data.records[recordId];
      if (!record) {
        // Индекс сломан, чистим
        console.warn(`[DB] Broken index for host: ${normalized}, cleaning up`);
        delete this.data.index[normalized];
        this.save();
        return null;
      }

      // Проверяем TTL
      if (record.expiresAt && Date.now() > record.expiresAt) {
        console.log(`[DB] Record expired for host: ${normalized}`);
        this.deleteByHost(host);
        return null;
      }

      return record;
    } catch (error) {
      console.error(`[DB] Error in getByHost for ${host}:`, error.message);
      return null;
    }
  }

  /**
   * Получение записи по ID
   */
  getById(id) {
    const record = this.data.records[id];
    
    if (!record) return null;

    // Проверяем TTL
    if (record.expiresAt && Date.now() > record.expiresAt) {
      this.deleteById(id);
      return null;
    }

    return record;
  }

  /**
   * Сохранение/обновление записи
   */
  set(host, data) {
    try {
      const normalized = this.normalizeHost(host);
      const now = Date.now();
      
      // Проверяем, есть ли уже запись для этого хоста
      let recordId = this.data.index[normalized];
      let existingRecord = recordId ? this.data.records[recordId] : null;

      if (!recordId) {
        recordId = this.generateId(normalized);
      }

      const record = {
        id: recordId,
        host: normalized,
        verdict: data.verdict || "low",
        score: Number(data.score) || 0,
        summary: data.summary || "",
        reasons: Array.isArray(data.reasons) ? data.reasons.slice(0, 10) : [],
        actions: Array.isArray(data.actions) ? data.actions.slice(0, 5) : [],
        breakdown: data.breakdown || {},
        signals: {
          threat: data.threatIntel || null,
          urlAbuse: data.urlAbuseIntel || null,
          network: data.networkSignals || null,
          ai: {
            model: data.model || null,
            source: data.source || null,
            latencyMs: data.latencyMs || null
          }
        },
        reports: existingRecord?.reports || [],
        createdAt: existingRecord?.createdAt || now,
        updatedAt: now,
        expiresAt: now + this.ttlMs
      };

      this.data.records[recordId] = record;
      this.data.index[normalized] = recordId;
      
      this.save();
      
      console.log(`[DB] Saved record for host: ${normalized}`);
      return record;
    } catch (error) {
      console.error(`[DB] Error in set for ${host}:`, error.message);
      return null;
    }
  }

  /**
   * Обновление существующей записи
   */
  update(host, updates) {
    const normalized = this.normalizeHost(host);
    const recordId = this.data.index[normalized];
    
    if (!recordId) return null;
    
    const record = this.data.records[recordId];
    if (!record) return null;

    const now = Date.now();
    
    Object.assign(record, {
      ...updates,
      host: normalized,
      moderated: true,
      moderatedAt: now,
      updatedAt: now,
      expiresAt: now + this.ttlMs
    });

    this.save();
    
    return record;
  }

  /**
   * Удаление записи по хосту
   */
  deleteByHost(host) {
    const normalized = this.normalizeHost(host);
    const recordId = this.data.index[normalized];
    
    if (!recordId) return false;

    delete this.data.records[recordId];
    delete this.data.index[normalized];
    
    this.save();
    
    return true;
  }

  /**
   * Удаление записи по ID
   */
  deleteById(id) {
    const record = this.data.records[id];
    
    if (!record) return false;

    delete this.data.index[record.host];
    delete this.data.records[id];
    
    this.save();
    
    return true;
  }

  /**
   * Получение списка последних записей
   */
  getRecent(limit = 20) {
    const records = Object.values(this.data.records)
      .filter(r => !r.expiresAt || Date.now() < r.expiresAt)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);

    return records;
  }

  /**
   * Поиск записей
   */
  search(query) {
    const normalized = query.toLowerCase();
    
    return Object.values(this.data.records)
      .filter(r => {
        if (r.expiresAt && Date.now() > r.expiresAt) return false;
        return r.host.includes(normalized) || r.summary.toLowerCase().includes(normalized);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50);
  }

  /**
   * Очистка устаревших записей
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, record] of Object.entries(this.data.records)) {
      if (record.expiresAt && now > record.expiresAt) {
        delete this.data.records[id];
        delete this.data.index[record.host];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[DB] Cleaned ${cleaned} expired records`);
      this.save(true);
    }

    return cleaned;
  }

  /**
   * Добавление жалобы к записи
   */
  addReport(host, reportData) {
    const normalized = this.normalizeHost(host);
    const recordId = this.data.index[normalized];
    
    if (!recordId) return null;
    
    const record = this.data.records[recordId];
    if (!record) return null;

    const now = Date.now();
    
    if (!Array.isArray(record.reports)) {
      record.reports = [];
    }

    const report = {
      id: this.generateId(`report-${normalized}-${now}`),
      text: String(reportData.text || "").trim().slice(0, 500),
      verdict: reportData.verdict || record.verdict,
      score: reportData.score || record.score,
      createdAt: now,
      resolved: false
    };

    record.reports.push(report);
    record.updatedAt = now;

    this.save();
    
    return record;
  }

  /**
   * Получение всех записей с жалобами
   */
  getRecordsWithReports() {
    const records = Object.values(this.data.records)
      .filter(r => Array.isArray(r.reports) && r.reports.length > 0)
      .sort((a, b) => {
        const aLatest = Math.max(...a.reports.map(rep => rep.createdAt));
        const bLatest = Math.max(...b.reports.map(rep => rep.createdAt));
        return bLatest - aLatest;
      });
    
    return records;
  }

  /**
   * Пометить жалобу как решённую
   */
  resolveReport(host, reportId) {
    const normalized = this.normalizeHost(host);
    const recordId = this.data.index[normalized];
    
    if (!recordId) return null;
    
    const record = this.data.records[recordId];
    if (!record || !Array.isArray(record.reports)) return null;

    const report = record.reports.find(r => r.id === reportId);
    if (!report) return null;

    report.resolved = true;
    report.resolvedAt = Date.now();
    record.updatedAt = Date.now();

    this.save();
    
    return record;
  }

  /**
   * Удалить жалобу
   */
  deleteReport(host, reportId) {
    const normalized = this.normalizeHost(host);
    const recordId = this.data.index[normalized];
    
    if (!recordId) return null;
    
    const record = this.data.records[recordId];
    if (!record || !Array.isArray(record.reports)) return null;

    const reportIndex = record.reports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) return null;

    record.reports.splice(reportIndex, 1);
    record.updatedAt = Date.now();

    this.save();
    
    return record;
  }

  /**
   * Получение статистики
   */
  getStats() {
    const records = Object.values(this.data.records);
    const now = Date.now();
    
    const active = records.filter(r => !r.expiresAt || now < r.expiresAt);
    const expired = records.length - active.length;
    
    const verdictCounts = active.reduce((acc, r) => {
      acc[r.verdict] = (acc[r.verdict] || 0) + 1;
      return acc;
    }, {});

    return {
      total: records.length,
      active: active.length,
      expired,
      verdicts: verdictCounts,
      oldestRecord: active.length > 0 
        ? Math.min(...active.map(r => r.createdAt))
        : null,
      newestRecord: active.length > 0
        ? Math.max(...active.map(r => r.updatedAt))
        : null,
      dbSize: this._getDbSize()
    };
  }

  _getDbSize() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const stats = fs.statSync(this.dbPath);
        return stats.size;
      }
    } catch {
      return 0;
    }
    return 0;
  }

  /**
   * Полная очистка базы
   */
  clear() {
    this.backup();
    
    this.data = {
      version: 2,
      metadata: {
        created: Date.now(),
        updated: Date.now(),
        recordCount: 0
      },
      index: {},
      records: {}
    };

    this.save(true);
    console.log("[DB] Database cleared");
  }

  /**
   * Экспорт данных
   */
  export() {
    return {
      ...this.data,
      exportedAt: Date.now()
    };
  }

  /**
   * Импорт данных
   */
  import(data) {
    if (data.version !== 2) {
      throw new Error("Incompatible database version");
    }

    this.backup();
    this.data = data;
    this.save(true);
    
    console.log(`[DB] Imported ${this.data.metadata.recordCount} records`);
  }
}

// Singleton instance
let dbInstance = null;

export function getDatabase(options = {}) {
  if (!dbInstance) {
    dbInstance = new DatabaseManager(options);
    
    // Автоматическая очистка каждый час
    setInterval(() => {
      dbInstance.cleanup();
    }, 60 * 60 * 1000);
  }
  
  return dbInstance;
}

export default getDatabase;
