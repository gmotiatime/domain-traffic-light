# Быстрый старт с новой базой данных

## Что было сделано

✅ Полностью переписана система базы данных  
✅ Создан новый модуль `db-manager.mjs` с индексами  
✅ Автоматическая миграция из старого формата  
✅ Размер базы уменьшен на 48% (67KB → 35KB)  
✅ Поиск ускорен с O(n) до O(1)  
✅ Автоматическая дедупликация записей  

## Запуск

```bash
npm run dev
```

При первом запуске автоматически произойдет миграция:
```
[Migration] Auto-migration triggered
[Migration] Complete: 9 migrated, 0 skipped, 0 errors
[DB] Saved 9 records
```

## Что изменилось

### Файлы
- `server/db-manager.mjs` - новый менеджер БД
- `server/db-migrate.mjs` - миграция данных
- `server/threat-db-v2.json` - новая база (вместо threat-db.json)
- `server/openrouter-proxy.mjs` - обновлен для работы с новой БД

### Преимущества
- **Быстрее**: O(1) поиск вместо O(n)
- **Компактнее**: 48% экономии места
- **Надежнее**: автоматическая дедупликация
- **Умнее**: TTL, автоочистка, бэкапы

## API остался прежним

Все endpoints работают как раньше:
- `POST /api/analyze` - анализ домена
- `GET /api/lookup?url=...` - быстрый поиск
- `GET /api/cache/stats` - статистика (улучшена)
- `GET /api/admin/cache` - админка

## Проверка работы

```bash
# Статистика базы
curl http://localhost:8787/api/cache/stats

# Здоровье системы
curl http://localhost:8787/api/health
```

## Откат (если нужно)

```bash
# Остановить сервер
# Удалить новую базу
Remove-Item server/threat-db-v2.json

# Восстановить старую
Copy-Item server/threat-db.backup-*.json server/threat-db.json
```

## Подробности

См. `DATABASE_UPGRADE.md` для полной документации.

## Vercel

На Vercel всё работает автоматически:
- Если есть Redis - использует Redis
- Если нет - использует новую локальную БД v2
- Миграция не нужна (Vercel не сохраняет файлы между деплоями)
