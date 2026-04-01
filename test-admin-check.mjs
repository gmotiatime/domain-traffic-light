#!/usr/bin/env node

/**
 * Тест проверки данных в админке
 * Проверяем, что данные реально сохраняются и доступны через admin API
 */

const API_BASE = 'https://www.gmotia.tech';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

if (!ADMIN_TOKEN) {
  console.error('❌ ADMIN_TOKEN не установлен в переменных окружения');
  console.error('Установите: export ADMIN_TOKEN=your_token');
  process.exit(1);
}

// Тестовые домены для проверки
const TEST_DOMAINS = [
  'google.com',
  'github.com',
  'linkedin.com',
  'free-discord-nitro.xyz',
  'secure-login-verify.top'
];

async function analyzeDomain(domain) {
  console.log(`\n📝 Анализируем: ${domain}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: domain,
        telemetryConsent: true, // ВАЖНО: сохраняем в БД
        skipCache: true // Свежий анализ
      })
    });

    if (!response.ok) {
      console.log(`   ❌ Ошибка анализа: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = data.aiAdjustedResult || data.analysis;
    
    console.log(`   ✓ Verdict: ${result.verdict} (${result.score})`);
    console.log(`   ✓ Model: ${data.model}`);
    console.log(`   ✓ Cached: ${data.cached ? 'Да' : 'Нет'}`);
    
    return {
      domain,
      verdict: result.verdict,
      score: result.score,
      model: data.model
    };
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return null;
  }
}

async function checkAdminCache(domain) {
  console.log(`\n🔍 Проверяем в админке: ${domain}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        action: 'get',
        host: domain
      })
    });

    if (!response.ok) {
      console.log(`   ❌ Ошибка доступа к админке: ${response.status}`);
      const text = await response.text();
      console.log(`   Ответ: ${text}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.ok || !data.record) {
      console.log(`   ⚠️  Запись не найдена в админке`);
      return null;
    }

    console.log(`   ✅ Найдено в админке!`);
    console.log(`   ✓ Verdict: ${data.record.verdict} (${data.record.score})`);
    console.log(`   ✓ Model: ${data.record.model || 'N/A'}`);
    console.log(`   ✓ Cached at: ${new Date(data.record.cachedAt).toISOString()}`);
    console.log(`   ✓ Updated at: ${new Date(data.record.updatedAt).toISOString()}`);
    
    return data.record;
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return null;
  }
}

async function getCacheStats() {
  console.log(`\n📊 Получаем статистику кэша...`);
  
  try {
    const response = await fetch(`${API_BASE}/api/cache/stats`);
    
    if (!response.ok) {
      console.log(`   ❌ Ошибка: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    console.log(`   ✓ Размер кэша: ${data.size} записей`);
    console.log(`   ✓ Хранилище: ${data.storage}`);
    console.log(`   ✓ Persistent: ${data.persistent ? 'Да' : 'Нет'}`);
    
    return data;
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`);
    return null;
  }
}

async function runAdminTest() {
  console.log('🔐 ТЕСТ СОХРАНЕНИЯ В PRODUCTION БД И АДМИНКЕ');
  console.log(`🌐 API: ${API_BASE}`);
  console.log(`⏰ Время: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Шаг 1: Получаем статистику кэша
  await getCacheStats();

  console.log(`\n${'='.repeat(80)}`);
  console.log('📝 ШАГ 1: АНАЛИЗ И СОХРАНЕНИЕ ДОМЕНОВ');
  console.log('='.repeat(80));

  const analyzed = [];
  
  for (const domain of TEST_DOMAINS) {
    const result = await analyzeDomain(domain);
    if (result) {
      analyzed.push(result);
    }
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('🔍 ШАГ 2: ПРОВЕРКА В АДМИНКЕ');
  console.log('='.repeat(80));

  let foundInAdmin = 0;
  let notFoundInAdmin = 0;

  for (const item of analyzed) {
    const adminRecord = await checkAdminCache(item.domain);
    
    if (adminRecord) {
      foundInAdmin++;
      
      // Проверяем соответствие данных
      if (adminRecord.verdict === item.verdict && adminRecord.score === item.score) {
        console.log(`   ✅ Данные совпадают с анализом`);
      } else {
        console.log(`   ⚠️  Данные отличаются от анализа`);
        console.log(`      Анализ: ${item.verdict} (${item.score})`);
        console.log(`      Админка: ${adminRecord.verdict} (${adminRecord.score})`);
      }
    } else {
      notFoundInAdmin++;
    }
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Итоговая статистика
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('='.repeat(80));
  console.log(`Проанализировано доменов: ${analyzed.length}`);
  console.log(`Найдено в админке: ${foundInAdmin}/${analyzed.length}`);
  console.log(`Не найдено в админке: ${notFoundInAdmin}/${analyzed.length}`);
  
  if (notFoundInAdmin === 0) {
    console.log(`\n✅ ВСЕ ДАННЫЕ СОХРАНЕНЫ И ДОСТУПНЫ В АДМИНКЕ!`);
  } else {
    console.log(`\n⚠️  ${notFoundInAdmin} записей не найдено в админке`);
    console.log(`Возможные причины:`);
    console.log(`  - Данные не сохраняются в production БД`);
    console.log(`  - Проблема с telemetryConsent`);
    console.log(`  - Проблема с нормализацией ключей кэша`);
  }

  // Финальная проверка статистики
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 ФИНАЛЬНАЯ СТАТИСТИКА КЭША');
  console.log('='.repeat(80));
  await getCacheStats();
}

runAdminTest().catch(console.error);
