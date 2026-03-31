import { useEffect, useState } from "react";

export type VerdictColor = "low" | "medium" | "high";

export interface HistoryItem {
  id: string;
  domain: string;
  verdict: VerdictColor;
  timestamp: number;
}

const HISTORY_KEY = "domain-traffic-light:history";
const MAX_HISTORY = 6;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors from corrupted storage
    }
  }, []);

  const addHistory = (domain: string, verdict: VerdictColor) => {
    setHistory((prev) => {
      // Don't duplicate if it was literally just checked (or move it to top)
      const filtered = prev.filter((item) => item.domain !== domain);
      
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        domain,
        verdict,
        timestamp: Date.now(),
      };
      
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
      
      try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Safe check for quota limits
      }
      
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    window.localStorage.removeItem(HISTORY_KEY);
  };

  return { history, addHistory, clearHistory };
}
