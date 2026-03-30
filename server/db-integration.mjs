// Добавляем импорт нового DB manager в начало файла
import { getDatabase } from "./db-manager.mjs";
import { autoMigrate } from "./db-migrate.mjs";

// Инициализация новой базы данных
const db = getDatabase({
  ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 дней
  autoSave: true,
  saveDebounceMs: 2000
});

// Автоматическая миграция при старте
if (!isVercelRuntime) {
  setTimeout(() => {
    autoMigrate();
  }, 1000);
}
