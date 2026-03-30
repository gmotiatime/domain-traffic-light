# API Documentation

## Base URL
- Production: `https://www.gmotia.tech`
- Alternative: `https://gmotia.tech`

## Endpoints

### 1. Health Check
**GET** `/api/health`

Проверка состояния сервиса.

**Response:**
```json
{
  "ok": true,
  "aiConfigured": true,
  "provider": "groq",
  "models": ["llama-3.3-70b-versatile"],
  "openPhishEnabled": true,
  "urlAbuseEnabled": false,
  "cacheEnabled": true,
  "cacheStorage": "vercel-redis",
  "uptime": 12345
}
```

---

### 2. Analyze Domain (POST)
**POST** `/api/analyze`

Выполняет полный анализ домена с использованием локального анализатора, threat feeds и ИИ.

**Request Body:**
```json
{
  "input": "example.com",
  "telemetryConsent": true,
  "skipCache": false
}
```

**Parameters:**
- `input` (string, required) - URL или домен для анализа
- `telemetryConsent` (boolean, optional) - Согласие на сохранение в кэш (default: false)
- `skipCache` (boolean, optional) - Пропустить проверку кэша (default: false)

**Response (200 OK):**
```json
{
  "analysis": {
    "host": "example.com",
    "score": 13,
    "verdict": "medium",
    "verdictLabel": "Нужна перепроверка",
    "summary": "Сайт недоступен...",
    "reasons": [...],
    "actions": [...],
    "breakdown": {
      "subdomain": "",
      "registrableDomain": "example.com",
      "tld": "com"
    }
  },
  "aiAdjustedResult": {...},
  "model": "llama-3.3-70b-versatile",
  "source": "groq",
  "threatIntel": {...},
  "urlAbuseIntel": {...},
  "networkSignals": {...},
  "enrichedLocalResult": {...},
  "latencyMs": 2500
}
```

**Example:**
```bash
curl -X POST "https://www.gmotia.tech/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"input":"google.com","telemetryConsent":true}'
```

---

### 3. Lookup Cached Result (GET) ⭐ NEW
**GET** `/api/lookup`

Быстрое получение кэшированных результатов анализа без повторного запроса к ИИ.

**Query Parameters:**
- `url` или `link` (string, required) - URL или домен для поиска

**Response (200 OK):**
```json
{
  "ok": true,
  "host": "google.com",
  "cached": true,
  "cachedAt": 1774888110263,
  "updatedAt": 1774888110263,
  "result": {
    "verdict": "low",
    "score": 0,
    "verdictLabel": "Низкий риск",
    "summary": "Сильных тревожных признаков не найдено...",
    "reasons": [...],
    "actions": [...],
    "breakdown": {...},
    "analyzedAt": "2026-03-30T14:23:01.307Z"
  },
  "model": "llama-3.3-70b-versatile",
  "source": "groq"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Данные для этого домена не найдены в кэше.",
  "host": "unknown-domain.com",
  "suggestion": "Выполните анализ через /api/analyze для получения данных."
}
```

**Examples:**
```bash
# По домену
curl "https://www.gmotia.tech/api/lookup?url=google.com"

# По полной ссылке
curl "https://www.gmotia.tech/api/lookup?link=https://github.com/user/repo"

# С кодированием URL
curl "https://www.gmotia.tech/api/lookup?url=$(echo 'https://example.com' | jq -sRr @uri)"
```

---

### 4. Cache Statistics
**GET** `/api/cache/stats`

Получить статистику кэша.

**Response:**
```json
{
  "size": 150,
  "enabled": true,
  "storage": "vercel-redis",
  "persistent": true
}
```

---

## Verdict Types

| Verdict | Score Range | Label | Description |
|---------|-------------|-------|-------------|
| `low` | 0-11 | Низкий риск | Сильных признаков угрозы не найдено |
| `medium` | 12-41 | Нужна перепроверка | Есть настораживающие признаки |
| `high` | 42-100 | Высокий риск | Обнаружены серьёзные признаки угрозы |

---

## Reason Tones

- `positive` - Положительный сигнал (снижает риск)
- `warning` - Предупреждение (повышает риск)
- `critical` - Критический сигнал (сильно повышает риск)

---

## Rate Limiting

- **Window:** 60 секунд
- **Max requests:** 30 запросов на IP
- **Response (429):**
```json
{
  "error": "Слишком много запросов. Подождите минуту.",
  "retryAfterMs": 45000
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Введите домен или ссылку."
}
```

### 405 Method Not Allowed
```json
{
  "error": "Method Not Allowed"
}
```

### 429 Too Many Requests
```json
{
  "error": "Слишком много запросов. Подождите минуту.",
  "retryAfterMs": 30000
}
```

### 503 Service Unavailable
```json
{
  "error": "GROQ_API_KEY не настроен.",
  "detail": "AI backend поднят, но без ключа Groq."
}
```

---

## Use Cases

### 1. Browser Extension
```javascript
// Проверка URL перед переходом
async function checkUrl(url) {
  // Сначала пробуем lookup (быстро)
  const lookupResponse = await fetch(
    `https://www.gmotia.tech/api/lookup?url=${encodeURIComponent(url)}`
  );
  
  if (lookupResponse.ok) {
    const data = await lookupResponse.json();
    return data.result;
  }
  
  // Если не в кэше - делаем полный анализ
  const analyzeResponse = await fetch('https://www.gmotia.tech/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: url, telemetryConsent: true })
  });
  
  const result = await analyzeResponse.json();
  return result.aiAdjustedResult || result.analysis;
}
```

### 2. Batch Checking
```javascript
// Проверка списка доменов
async function checkDomains(domains) {
  const results = await Promise.all(
    domains.map(async (domain) => {
      const response = await fetch(
        `https://www.gmotia.tech/api/lookup?url=${encodeURIComponent(domain)}`
      );
      
      if (response.ok) {
        return await response.json();
      }
      
      return { domain, cached: false };
    })
  );
  
  return results;
}
```

### 3. Real-time Link Scanner
```javascript
// Сканирование ссылок на странице
document.addEventListener('DOMContentLoaded', async () => {
  const links = document.querySelectorAll('a[href]');
  
  for (const link of links) {
    const url = link.href;
    const response = await fetch(
      `https://www.gmotia.tech/api/lookup?url=${encodeURIComponent(url)}`
    );
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.result.verdict === 'high') {
        link.style.border = '2px solid red';
        link.title = `⚠️ ${data.result.summary}`;
      }
    }
  }
});
```

---

## Best Practices

1. **Используйте lookup для частых проверок** - он быстрее и не расходует AI квоту
2. **Кэшируйте результаты на клиенте** - не делайте повторные запросы для одного домена
3. **Обрабатывайте 404 ответы** - если домена нет в кэше, используйте `/api/analyze`
4. **Уважайте rate limits** - не превышайте 30 запросов в минуту
5. **Используйте telemetryConsent: true** - это помогает улучшить базу данных угроз

---

## Support

- GitHub: [Ваш репозиторий]
- Email: support@gmotia.tech
- Documentation: https://www.gmotia.tech/method
