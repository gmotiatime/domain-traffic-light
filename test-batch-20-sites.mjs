#!/usr/bin/env node

/**
 * Тест анализатора: отправка 20 сайтов через API
 * Использует production API: https://www.gmotia.tech
 */

const API_BASE = 'https://www.gmotia.tech';

// 20 тестовых доменов (микс известных, подозрительных и нейтральных)
const TEST_DOMAINS = [
  'google.com',
  'github.com',
  'stackoverflow.com',
  'wikipedia.org',
  'amazon.com',
  'microsoft.com',
  'apple.com',
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'reddit.com',
  'youtube.com',
  'netflix.com',
  'spotify.com',
  'dropbox.com',
  'zoom.us',
  'slack.com',
  'notion.so',
  'figma.com',
  'vercel.com'
];

async function analyzeDomain(domain) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: domain,
        telemetryConsent: true,
        skipCache: false
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
    
    return {
      domain,
      success: true,
      status: response.status,
      verdict: data.aiAdjustedResult?.verdict || data.analysis?.verdict,
      score: data.aiAdjustedResult?.score || data.analysis?.score,
      verdictLabel: data.aiAdjustedResult?.verdictLabel || data.analysis?.verdictLabel,
      summary: data.aiAdjustedResult?.summary || data.analysis?.summary,
      model: data.model,
      source: data.source,
      cached: data.cached || false,
      elapsed,
      latencyMs: data.latencyMs
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

async function runBatchTest() {
  console.log('🚀 Запуск теста анализатора');
  console.log(`📊 Количество доменов: ${TEST_DOMAINS.length}`);
  console.log(`🌐 API: ${API_BASE}`);
  console.log('─'.repeat(80));
  console.log('');

  const results = [];
  let successCount = 0;
  let failCount = 0;
  let totalElapsed = 0;

  // Анализируем домены последовательно (чтобы не превысить rate limit)
  for (let i = 0; i < TEST_DOMAINS.length; i++) {
    const domain = TEST_DOMAINS[i];
    console.log(`[${i + 1}/${TEST_DOMAINS.length}] Анализ: ${domain}...`);
    
    const result = await analyzeDomain(domain);
    results.push(result);
    totalElapsed += result.elapsed;

    if (result.success) {
      successCount++;
      const cacheIcon = result.cached ? '⚡' : '🔍';
      console.log(`  ${cacheIcon} ${result.verdict} (${result.score}) - ${result.verdictLabel}`);
      console.log(`  ⏱️  ${result.elapsed}ms`);
    } else {
      failCount++;
      console.log(`  ❌ Ошибка: ${result.error || result.status}`);
    }
    
    console.log('');

    // Небольшая задержка между запросами (чтобы не превысить rate limit)
    if (i < TEST_DOMAINS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Итоговая статистика
  console.log('─'.repeat(80));
  console.log('📈 РЕЗУЛЬТАТЫ ТЕСТА');
  console.log('─'.repeat(80));
  console.log(`✅ Успешно: ${successCount}/${TEST_DOMAINS.length}`);
  console.log(`❌ Ошибок: ${failCount}/${TEST_DOMAINS.length}`);
  console.log(`⏱️  Среднее время: ${Math.round(totalElapsed / TEST_DOMAINS.length)}ms`);
  console.log(`⏱️  Общее время: ${Math.round(totalElapsed / 1000)}s`);
  console.log('');

  // Распределение по verdict
  const verdictCounts = results.reduce((acc, r) => {
    if (r.success && r.verdict) {
      acc[r.verdict] = (acc[r.verdict] || 0) + 1;
    }
    return acc;
  }, {});

  console.log('🎯 Распределение по verdict:');
  Object.entries(verdictCounts).forEach(([verdict, count]) => {
    const percentage = Math.round((count / successCount) * 100);
    console.log(`  ${verdict}: ${count} (${percentage}%)`);
  });
  console.log('');

  // Топ-5 самых быстрых
  const fastest = results
    .filter(r => r.success)
    .sort((a, b) => a.elapsed - b.elapsed)
    .slice(0, 5);

  console.log('⚡ Топ-5 самых быстрых:');
  fastest.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.domain} - ${r.elapsed}ms`);
  });
  console.log('');

  // Топ-5 самых медленных
  const slowest = results
    .filter(r => r.success)
    .sort((a, b) => b.elapsed - a.elapsed)
    .slice(0, 5);

  console.log('🐌 Топ-5 самых медленных:');
  slowest.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.domain} - ${r.elapsed}ms`);
  });
  console.log('');

  // Сохраняем детальные результаты в JSON
  const reportPath = './test-batch-results.json';
  const report = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    totalDomains: TEST_DOMAINS.length,
    successCount,
    failCount,
    avgElapsedMs: Math.round(totalElapsed / TEST_DOMAINS.length),
    totalElapsedMs: totalElapsed,
    verdictDistribution: verdictCounts,
    results
  };

  await import('fs').then(fs => {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  });

  console.log(`💾 Детальный отчёт сохранён: ${reportPath}`);
  console.log('─'.repeat(80));
}

// Запуск
runBatchTest().catch(console.error);
