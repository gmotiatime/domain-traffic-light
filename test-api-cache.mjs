// Тест API с реальным сервером
import fetch from 'node:fetch';

const API_URL = 'http://localhost:8787';

async function testAPI() {
  console.log('=== Тест API с кэшированием ===\n');

  try {
    // 1. Проверяем health
    console.log('1. Проверка health endpoint...');
    const healthRes = await fetch(`${API_URL}/api/health`);
    const health = await healthRes.json();
    console.log(`✅ Сервер работает`);
    console.log(`   Cache: ${health.cacheStorage}`);
    console.log(`   Models: ${health.models?.join(', ')}\n`);

    // 2. Проверяем статистику кэша
    console.log('2. Статистика кэша:');
    const statsRes = await fetch(`${API_URL}/api/cache/stats`);
    const stats = await statsRes.json();
    console.log(`   Записей: ${stats.size || stats.total}`);
    console.log(`   Storage: ${stats.storage}\n`);

    // 3. Анализируем домен который УЖЕ есть в БД
    console.log('3. Анализ домена google.com (должен быть в кэше)...');
    const analyzeRes = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: 'google.com',
        telemetryConsent: true,
        localAnalysis: {
          verdict: 'low',
          score: 0,
          summary: 'Test',
          reasons: [],
          actions: []
        }
      })
    });

    const result = await analyzeRes.json();
    
    if (result.cached) {
      console.log(`✅ ДАННЫЕ ИЗ КЭША!`);
      console.log(`   Host: ${result.aiAdjustedResult?.host || result.analysis?.host}`);
      console.log(`   Verdict: ${result.aiAdjustedResult?.verdict || result.analysis?.verdict}`);
      console.log(`   Score: ${result.aiAdjustedResult?.score || result.analysis?.score}`);
      console.log(`   Storage: ${result.cacheStorage}`);
      console.log(`   Cached at: ${result.cachedAt ? new Date(result.cachedAt).toISOString() : 'N/A'}`);
    } else {
      console.log(`❌ ДАННЫЕ НЕ ИЗ КЭША`);
      console.log(`   Это новый анализ через AI`);
      console.log(`   Model: ${result.model}`);
      console.log(`   Source: ${result.source}`);
    }

    // 4. Проверяем lookup endpoint
    console.log('\n4. Проверка lookup endpoint для google.com...');
    const lookupRes = await fetch(`${API_URL}/api/lookup?url=google.com`);
    const lookup = await lookupRes.json();
    
    if (lookup.ok && lookup.cached) {
      console.log(`✅ LOOKUP НАШЕЛ В КЭШЕ!`);
      console.log(`   Host: ${lookup.host}`);
      console.log(`   Verdict: ${lookup.result?.verdict}`);
      console.log(`   Score: ${lookup.result?.score}`);
    } else if (lookup.error) {
      console.log(`❌ LOOKUP НЕ НАШЕЛ: ${lookup.error}`);
    }

    // 5. Проверяем с www
    console.log('\n5. Проверка с www.google.com...');
    const lookupWwwRes = await fetch(`${API_URL}/api/lookup?url=www.google.com`);
    const lookupWww = await lookupWwwRes.json();
    
    if (lookupWww.ok && lookupWww.cached) {
      console.log(`✅ WWW ВАРИАНТ ТОЖЕ НАШЕЛ!`);
      console.log(`   Host: ${lookupWww.host}`);
    } else {
      console.log(`❌ WWW ВАРИАНТ НЕ НАШЕЛ`);
    }

    console.log('\n✅ Тест завершен');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\nУбедитесь что сервер запущен: npm run dev');
  }
}

testAPI();
