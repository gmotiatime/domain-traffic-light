#!/usr/bin/env node

/**
 * Тест исправления: проверка www редиректов
 * Проверяем, что apex -> www больше не считается TLS-несоответствием
 */

const API_BASE = 'https://www.gmotia.tech';

// Домены с типичными apex -> www редиректами
const TEST_CASES = [
  { domain: 'linkedin.com', expected: 'Не должно быть TLS-несоответствия' },
  { domain: 'github.com', expected: 'Не должно быть TLS-несоответствия' },
  { domain: 'stackoverflow.com', expected: 'Не должно быть TLS-несоответствия' },
  { domain: 'amazon.com', expected: 'Не должно быть TLS-несоответствия' },
  { domain: 'wikipedia.org', expected: 'Не должно быть TLS-несоответствия' }
];

async function testDomain(domain) {
  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: domain,
        telemetryConsent: false,
        skipCache: true // Пропускаем кэш для свежего анализа
      })
    });

    if (!response.ok) {
      return {
        domain,
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    const result = data.aiAdjustedResult || data.analysis;
    
    // Проверяем наличие TLS-несоответствия в причинах
    const hasTlsMismatch = result.reasons?.some(r => 
      r.title?.toLowerCase().includes('tls') && 
      (r.title?.toLowerCase().includes('несоответств') || 
       r.detail?.toLowerCase().includes('выдан на www'))
    );

    return {
      domain,
      success: true,
      verdict: result.verdict,
      score: result.score,
      hasTlsMismatch,
      tlsReasons: result.reasons?.filter(r => 
        r.title?.toLowerCase().includes('tls')
      ) || [],
      summary: result.summary
    };
  } catch (error) {
    return {
      domain,
      success: false,
      error: error.message
    };
  }
}

async function runTest() {
  console.log('🧪 Тест исправления TLS-проверки для www редиректов');
  console.log('─'.repeat(80));
  console.log('');

  let passCount = 0;
  let failCount = 0;

  for (const testCase of TEST_CASES) {
    console.log(`Тестируем: ${testCase.domain}`);
    
    const result = await testDomain(testCase.domain);
    
    if (!result.success) {
      console.log(`  ❌ ОШИБКА: ${result.error}`);
      failCount++;
    } else {
      if (result.hasTlsMismatch) {
        console.log(`  ❌ FAIL: Обнаружено TLS-несоответствие`);
        console.log(`  Причины TLS:`);
        result.tlsReasons.forEach(r => {
          console.log(`    - ${r.title}: ${r.detail}`);
        });
        failCount++;
      } else {
        console.log(`  ✅ PASS: TLS-несоответствие отсутствует`);
        console.log(`  Verdict: ${result.verdict} (${result.score})`);
        passCount++;
      }
    }
    
    console.log('');
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('─'.repeat(80));
  console.log('📊 РЕЗУЛЬТАТЫ');
  console.log('─'.repeat(80));
  console.log(`✅ Пройдено: ${passCount}/${TEST_CASES.length}`);
  console.log(`❌ Провалено: ${failCount}/${TEST_CASES.length}`);
  console.log('');

  if (failCount === 0) {
    console.log('🎉 Все тесты пройдены! Исправление работает корректно.');
  } else {
    console.log('⚠️  Некоторые тесты провалены. Требуется дополнительная проверка.');
  }
}

runTest().catch(console.error);
