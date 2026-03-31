// Background script для расширения Доменный светофор

// Слушаем установку расширения
chrome.runtime.onInstalled.addListener(() => {
  console.log('Доменный светофор установлен');
});

// Можно добавить автоматическую проверку при переходе на новую страницу
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Здесь можно добавить автоматическую проверку
    // Пока оставим только ручную проверку через popup
  }
});
