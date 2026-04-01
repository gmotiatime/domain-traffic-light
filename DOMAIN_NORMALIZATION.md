# Нормализация доменов

## Проблема

Раньше разные варианты одного домена сохранялись как отдельные записи:
- `youtube.com`
- `www.youtube.com`
- `https://youtube.com`
- `youtube.com/watch?v=123`

Это приводило к:
- ❌ Дублированию данных
- ❌ Лишним запросам к AI
- ❌ Увеличению размера базы
- ❌ Несогласованности результатов

## Решение

Теперь все варианты одного домена нормализуются к единому виду:

```
youtube.com                      -> youtube.com
www.youtube.com                  -> youtube.com
https://youtube.com              -> youtube.com
https://www.youtube.com          -> youtube.com
http://youtube.com               -> youtube.com
youtube.com/                     -> youtube.com
www.youtube.com/watch            -> youtube.com
https://youtube.com/watch?v=123  -> youtube.com
```

## Что делает нормализация

1. **Убирает протокол**: `https://` и `http://`
2. **Убирает www**: `www.youtube.com` → `youtube.com`
3. **Убирает путь**: `/watch?v=123` → только домен
4. **Убирает порт**: `:80` и `:443` (стандартные)
5. **Приводит к lowercase**: `YouTube.COM` → `youtube.com`

## Где применяется

### 1. При сохранении в БД
```javascript
// server/db-manager.mjs
normalizeHost(host) {
  let normalized = String(host || "").toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//i, '');
  normalized = normalized.split('/')[0].split('?')[0];
  if (normalized.startsWith('www.')) {
    normalized = normalized.substring(4);
  }
  return normalized;
}
```

### 2. При поиске в кэше
```javascript
// server/openrouter-proxy.mjs
function sanitizeCacheInput(input, normalized) {
  // Убирает www. для единообразия
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith('www.')) {
    hostname = hostname.substring(4);
  }
  return hostname;
}
```

### 3. В API lookup
```javascript
// api/lookup.mjs
const normalized = normalizeInput(url);
const record = await getRawCacheRecordByHost(normalized.host);
// Автоматически найдет запись независимо от www/протокола
```

## Тестирование

Запустите тест:
```bash
node test-normalization.mjs
```

Результат:
```
=== Тест нормализации доменов ===

Тестируем нормализацию:
  youtube.com                              -> youtube.com
  www.youtube.com                          -> youtube.com
  https://youtube.com                      -> youtube.com
  https://www.youtube.com                  -> youtube.com
  http://youtube.com                       -> youtube.com
  youtube.com/                             -> youtube.com
  www.youtube.com/watch                    -> youtube.com
  https://youtube.com/watch?v=123          -> youtube.com

=== Тест сохранения и поиска ===

Проверяем поиск по разным вариантам:
  youtube.com                              -> ✅ НАЙДЕНО
  www.youtube.com                          -> ✅ НАЙДЕНО
  https://youtube.com                      -> ✅ НАЙДЕНО
  https://www.youtube.com                  -> ✅ НАЙДЕНО
  http://youtube.com                       -> ✅ НАЙДЕНО
  youtube.com/                             -> ✅ НАЙДЕНО
  www.youtube.com/watch                    -> ✅ НАЙДЕНО
  https://youtube.com/watch?v=123          -> ✅ НАЙДЕНО

✅ Тест завершен
```

## Очистка существующих дубликатов

Запустите скрипт очистки:
```bash
node cleanup-duplicates.mjs
```

Результат:
```
=== Очистка дубликатов в базе данных ===

Записей до очистки: 10

Найденные группы дубликатов:

a1.by:
  a1.by                          2026-03-30T17:24:33.965Z ✅ ОСТАВИТЬ
  www.a1.by                      2026-03-30T17:24:33.965Z ❌ УДАЛИТЬ

=== Результат ===
Групп с дубликатами: 1
Удалено записей: 1

Записей после очистки: 9

✅ Очистка завершена
```

## Примеры использования

### На фронтенде
Пользователь может ввести любой вариант:
```
Ввод: https://www.youtube.com/watch?v=123
Результат: Найдет кэш для youtube.com
```

### В API
```bash
# Все эти запросы вернут одну и ту же запись:
curl "http://localhost:8787/api/lookup?url=youtube.com"
curl "http://localhost:8787/api/lookup?url=www.youtube.com"
curl "http://localhost:8787/api/lookup?url=https://youtube.com"
curl "http://localhost:8787/api/lookup?url=https://www.youtube.com/watch"
```

### При анализе
```javascript
// Все эти варианты создадут/обновят одну запись:
POST /api/analyze { input: "youtube.com" }
POST /api/analyze { input: "www.youtube.com" }
POST /api/analyze { input: "https://youtube.com" }
POST /api/analyze { input: "https://www.youtube.com/watch?v=123" }
```

## Преимущества

✅ **Экономия места**: нет дубликатов  
✅ **Экономия AI токенов**: повторный анализ не нужен  
✅ **Согласованность**: один домен = один результат  
✅ **Удобство**: пользователь может вводить любой формат  
✅ **Производительность**: меньше записей = быстрее поиск  

## Обратная совместимость

Старые записи с `www.` автоматически находятся при поиске без `www.` и наоборот.

## Миграция

При первом запуске после обновления:
1. Запустите `node cleanup-duplicates.mjs`
2. Дубликаты будут автоматически удалены
3. Останутся только самые свежие записи

## Важно

Нормализация применяется **только к хосту**, но не к:
- Поддоменам: `mail.google.com` ≠ `google.com`
- TLD: `google.com` ≠ `google.ru`
- Портам (кроме стандартных): `example.com:8080` ≠ `example.com`

## Файлы

- `server/db-manager.mjs` - метод `normalizeHost()`
- `server/openrouter-proxy.mjs` - функции `sanitizeCacheInput()`, `normalizeCacheHostInput()`, `setCachedResponse()`
- `test-normalization.mjs` - тесты
- `cleanup-duplicates.mjs` - очистка дубликатов
