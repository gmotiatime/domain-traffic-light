// Popup script для расширения Доменный светофор
const API_URL = 'https://www.gmotia.tech/api/analyze';

let currentDomain = '';

// Получить текущий домен
async function getCurrentDomain() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const url = new URL(tab.url);
      return url.hostname;
    }
  } catch (error) {
    console.error('Error getting current domain:', error);
  }
  return null;
}

// Отобразить текущий домен
async function displayCurrentDomain() {
  const urlElement = document.getElementById('currentUrl');
  currentDomain = await getCurrentDomain();
  
  if (currentDomain) {
    urlElement.textContent = currentDomain;
  } else {
    urlElement.textContent = 'Не удалось определить';
    document.getElementById('checkButton').disabled = true;
  }
}

// Проверить домен через API
async function checkDomain(domain) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: domain,
      localAnalysis: {
        verdict: 'low',
        score: 0
      },
      telemetryConsent: true // Данные идут в БД для улучшения AI
    })
  });

  if (!response.ok) {
    throw new Error('Ошибка при проверке домена');
  }

  return await response.json();
}

// Отобразить результат
function displayResult(data) {
  const result = data.aiAdjustedResult || data.analysis;
  const verdict = result.verdict;
  const score = result.score;
  const summary = result.summary;
  const verdictLabel = result.verdictLabel;

  // Иконки и цвета для разных вердиктов
  const verdictConfig = {
    low: { icon: '✅', title: 'Низкий риск', class: 'low' },
    medium: { icon: '⚠️', title: 'Средний риск', class: 'medium' },
    high: { icon: '🚨', title: 'Высокий риск', class: 'high' }
  };

  const config = verdictConfig[verdict] || verdictConfig.low;

  document.getElementById('resultIcon').textContent = config.icon;
  document.getElementById('resultTitle').textContent = config.title;
  document.getElementById('resultLabel').textContent = verdictLabel;
  document.getElementById('resultScore').textContent = `Score: ${score}`;
  document.getElementById('resultScore').className = `result-score ${config.class}`;
  document.getElementById('resultSummary').textContent = summary;

  // Показать результат
  document.getElementById('result').classList.add('show');
}

// Показать ошибку
function showError(message) {
  const errorElement = document.getElementById('error');
  errorElement.textContent = message;
  errorElement.classList.add('show');
}

// Скрыть ошибку
function hideError() {
  document.getElementById('error').classList.remove('show');
}

// Показать загрузку
function showLoading() {
  document.getElementById('loading').classList.add('show');
  document.getElementById('checkButton').disabled = true;
  document.getElementById('result').classList.remove('show');
  hideError();
}

// Скрыть загрузку
function hideLoading() {
  document.getElementById('loading').classList.remove('show');
  document.getElementById('checkButton').disabled = false;
}

// Обработчик кнопки проверки
document.getElementById('checkButton').addEventListener('click', async () => {
  if (!currentDomain) return;

  showLoading();

  try {
    const data = await checkDomain(currentDomain);
    displayResult(data);
  } catch (error) {
    console.error('Check error:', error);
    showError('Не удалось проверить домен. Попробуйте позже.');
  } finally {
    hideLoading();
  }
});

// Обработчик кнопки "Подробный отчёт"
document.getElementById('viewDetails').addEventListener('click', () => {
  chrome.tabs.create({
    url: `https://www.gmotia.tech/#/analyzer?prefill=${encodeURIComponent(currentDomain)}`
  });
});

// Инициализация при открытии popup
displayCurrentDomain();
