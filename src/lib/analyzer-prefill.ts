const ANALYZER_PREFILL_KEY = "domain-traffic-light:analyzer-prefill";

export function writeAnalyzerPrefill(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = value.trim();

  if (!normalized) {
    window.sessionStorage.removeItem(ANALYZER_PREFILL_KEY);
    return;
  }

  window.sessionStorage.setItem(ANALYZER_PREFILL_KEY, normalized);
}

export function consumeAnalyzerPrefill() {
  if (typeof window === "undefined") {
    return "";
  }

  // Сначала проверяем URL параметр в hash
  const hash = window.location.hash;
  const hashParts = hash.split('?');
  if (hashParts.length > 1) {
    const urlParams = new URLSearchParams(hashParts[1]);
    const urlPrefill = urlParams.get('prefill');
    if (urlPrefill) {
      // Очищаем URL от параметра
      const newUrl = window.location.pathname + window.location.search + hashParts[0];
      window.history.replaceState({}, '', newUrl);
      return urlPrefill.trim();
    }
  }

  // Затем проверяем sessionStorage
  const value = window.sessionStorage.getItem(ANALYZER_PREFILL_KEY) || "";
  window.sessionStorage.removeItem(ANALYZER_PREFILL_KEY);
  return value;
}
