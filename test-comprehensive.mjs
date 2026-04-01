#!/usr/bin/env node

/**
 * Комплексный тест анализатора через API
 * - Проверка разных типов сайтов (легитимные, подозрительные, фишинговые)
 * - Проверка сохранения в БД (telemetryConsent: true)
 * - Проверка чтения из кэша (повторный запрос)
 * - Проверка lookup API
 */

const API_BASE = 'https://www.gmotia.tech';

// Тестовые домены разных категорий
const TEST_DOMAINS = {
  legitimate: [
    { domain: 'google.com', expectedVerdict: 'low', description: 'Популярный легитимный сайт' },
    { domain: 'github.com', expectedVerdict: 'low', description: 'Известная платформа разработки' },
    { domain: 'microsoft.com', expectedVerdict: 'low', description: 'Крупная IT компания' }
  ],
  suspicious: [
    { domain: 'free-discord-nitro.xyz', expectedVerdict: 'high', description: 'Подозрительные слова + рискованный TLD' },
    { domain: 'secure-login-verify.top', expectedVerdict: 'high', description: 'Множество слов-ловушек' },
    { domain: 'claim-reward-now.site', expectedVerdict: 'high', description: 'Фишинговые префиксы' }
  ],
  neutral: [
    { domain: 'example.com', expectedVerdict: 'low', description: 'Тестовый домен' },
    { domain: 'test.example', expectedVerdict: 'low', description: 'Учебная зона' }
  ]
};

async function analyzeDomain(domain, skipCache = false) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: domain,
        telemetryConsent: true, // Сохраняем в БД
        skipCache: skipCache
      })
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        domain,
        success: false,
        status: response.status,
        error: errorText,
        elapsed
      };
    }

    const data = await response.json();
    const result = data.aiAdjustedResult || data.analysis;
    
    return {
      domain,
      success: true,
      status: response.status,
      verdict: result.verdict,
      score: result.score,
      verdictLabel: result.verdictLabel,
      summary: result.summary,
      model: data.model,
      source: data.source,
      cached: data.cached || false,
      elapsed,
      latencyMs: data.latencyMs,
      reasons: result.reasons || []
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    return {
      domain,
      success: false,
      error: error.message,
      elapsed
    };
  }
}

async function lookupDomain(domain) {
  try {
    const response = await fetch(`${API_BASE}/api/lookup?url=${encodeURIComponent(domain)}`);
    
    if (!response.ok) {
      return {
        domain,
        found: false,
        status: response.status
      };
    }

    const data = await response.json();
    
    return {
      domain,
      found: true,
      cached: data.cached,
      verdict: data.result?.verdict,
      score: data.result?.score,
      cachedAt: data.cachedAt,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    return {
      domain,
      found: false,
      error: error.message
    };
  }
}

async function testCategory(categoryName, domains) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📂 Категория: ${categoryName.toUpperCase()}`);
  console.log('='.repeat(80));

  const results = [];

  for (const testCase of domains) {
    console.log(`\n🔍 Тест: ${testCase.domain}`);
    console.log(`   Описание: ${testCase.description}`);
    console.log(`   Ожидаемый verdict: ${testCase.expectedVerdict}`);
    
    // Шаг 1: Первый анализ (с сохранением в БД)
    console.log(`\n   [1/3] Первый анализ (skipCache=true)...`);
    const firstAnalysis = await analyzeDomain(testCase.domain, true);
    
    if (!firstAnalysis.success) {
      console.log(`   ❌ Ошибка: ${firstAnalysis.error}`);
      results.push({ ...testCase, passed: false, error: firstAnalysis.error });
      continue;
    }

    console.log(`   ✓ Verdict: ${firstAnalysis.verdict} (${firstAnalysis.score})`);
    console.log(`   ✓ Время: ${firstAnalysis.elapsed}ms`);
    console.log(`   ✓ Модель: ${firstAnalysis.model}`);
    console.log(`   ✓ Cached: ${firstAnalysis.cached ? 'Да' : 'Нет'}`);

    // Задержка перед следующим запросом
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Шаг 2: Проверка через lookup API
    console.log(`\n   [2/3] Проверка через lookup API...`);
    const lookupResult = await lookupDomain(testCase.domain);
    
    if (!lookupResult.found) {
      console.log(`   ⚠️  Не найдено в кэше (статус: ${lookupResult.status})`);
    } else {
      console.log(`   ✓ Найдено в кэше`);
      console.log(`   ✓ Verdict: ${lookupResult.verdict} (${lookupResult.score})`);
      console.log(`   ✓ Cached at: ${new Date(lookupResult.cachedAt).toISOString()}`);
    }

    // Задержка перед следующим запросом
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Шаг 3: Повторный анализ (должен взять из кэша)
    console.log(`\n   [3/3] Повторный анализ (должен взять из кэша)...`);
    const secondAnalysis = await analyzeDomain(testCase.domain, false);
    
    if (!secondAnalysis.success) {
      console.log(`   ❌ Ошибка: ${secondAnalysis.error}`);
    } else {
      console.log(`   ✓ Verdict: ${secondAnalysis.verdict} (${secondAnalysis.score})`);
      console.log(`   ✓ Время: ${secondAnalysis.elapsed}ms`);
      console.log(`   ✓ Cached: ${secondAnalysis.cached ? 'Да ⚡' : 'Нет'}`);
      
      if (secondAnalysis.cached) {
        console.log(`   ✅ Кэш работает! Время уменьшилось с ${firstAnalysis.elapsed}ms до ${secondAnalysis.elapsed}ms`);
      } else {
        console.log(`   ⚠️  Кэш не сработал`);
      }
    }

    // Проверка соответствия ожиданиям
    const verdictMatches = firstAnalysis.verdict === testCase.expectedVerdict;
    const passed = verdictMatches || 
                   (testCase.expectedVerdict === 'low' && firstAnalysis.verdict === 'medium') ||
                   (testCase.expectedVerdict === 'high' && firstAnalysis.verdict === 'medium');

    if (passed) {
      console.log(`\n   ✅ PASS`);
    } else {
      console.log(`\n   ❌ FAIL: Ожидался ${testCase.expectedVerdict}, получен ${firstAnalysis.verdict}`);
    }

    results.push({
      ...testCase,
      passed,
      firstAnalysis,
      lookupResult,
      secondAnalysis
    });

    // Задержка между доменами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

async function runFullTest() {
  console.log('🚀 КОМПЛЕКСНЫЙ ТЕСТ АНАЛИЗАТОРА');
  console.log(`🌐 API: ${API_BASE}`);
  console.log(`⏰ Время: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  const allResults = {};

  // Тестируем каждую категорию
  for (const [categoryName, domains] of Object.entries(TEST_DOMAINS)) {
    allResults[categoryName] = await testCategory(categoryName, domains);
  }

  // Итоговая статистика
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('='.repeat(80));

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const [categoryName, results] of Object.entries(allResults)) {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    totalTests += results.length;
    totalPassed += passed;
    totalFailed += failed;

    console.log(`\n${categoryName.toUpperCase()}:`);
    console.log(`  ✅ Пройдено: ${passed}/${results.length}`);
    console.log(`  ❌ Провалено: ${failed}/${results.length}`);
  }

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`ВСЕГО:`);
  console.log(`  ✅ Пройдено: ${totalPassed}/${totalTests}`);
  console.log(`  ❌ Провалено: ${totalFailed}/${totalTests}`);
  console.log(`  📈 Процент успеха: ${Math.round((totalPassed / totalTests) * 100)}%`);

  // Сохраняем детальный отчёт
  const report = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      successRate: Math.round((totalPassed / totalTests) * 100)
    },
    results: allResults
  };

  await import('fs').then(fs => {
    fs.writeFileSync('./test-comprehensive-results.json', JSON.stringify(report, null, 2));
  });

  console.log(`\n💾 Детальный отчёт сохранён: test-comprehensive-results.json`);
  console.log('='.repeat(80));

  if (totalFailed === 0) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!');
  } else {
    console.log(`\n⚠️  ${totalFailed} тест(ов) провалено. Требуется проверка.`);
  }
}

runFullTest().catch(console.error);
