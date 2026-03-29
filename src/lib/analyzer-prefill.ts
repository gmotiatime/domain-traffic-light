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

  const value = window.sessionStorage.getItem(ANALYZER_PREFILL_KEY) || "";
  window.sessionStorage.removeItem(ANALYZER_PREFILL_KEY);
  return value;
}
