import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  verdict: "low" | "medium" | "high";
  score: number;
}

export function ReportModal({ isOpen, onClose, host, verdict, score }: ReportModalProps) {
  const [reportText, setReportText] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  async function handleReportSubmit() {
    if (!reportText.trim() || !host || host === "—") {
      setReportStatus("Введите текст жалобы.");
      return;
    }

    setIsSubmittingReport(true);
    setReportStatus("Отправляем жалобу...");

    try {
      const response = await fetch(getApiUrl("/api/report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          verdict,
          score,
          reportText: reportText.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Не удалось отправить жалобу.");
      }

      setReportStatus("Жалоба отправлена в надёжные лапы! Спасибо за обратную связь 🐾");
      setTimeout(() => {
        onClose();
        setReportText("");
        setReportStatus("");
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка отправки.";
      setReportStatus(message);
    } finally {
      setIsSubmittingReport(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg rounded-3xl border border-foreground/10 bg-[#0a0a0a] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="absolute right-4 top-4 rounded-lg p-2 text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10">
                <Flag className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Пожаловаться на результат</h3>
                <p className="text-sm text-foreground/50">Домен: {host}</p>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="reportText" className="mb-2 block text-sm text-foreground/60">
                Опишите проблему с результатом анализа:
              </label>
              <textarea
                id="reportText"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Например: нейрокот ошибся, этот домен точно безопасный..."
                className="min-h-[120px] w-full rounded-2xl border border-foreground/10 bg-background/40 px-4 py-3 text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-foreground/20"
                disabled={isSubmittingReport}
              />
            </div>

            {reportStatus && (
              <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                reportStatus.includes("отправлена")
                  ? "border-green-500/20 bg-green-500/10 text-green-400"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-400"
              }`}>
                {reportStatus}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleReportSubmit}
                disabled={isSubmittingReport || !reportText.trim()}
                className="flex-1"
              >
                {isSubmittingReport ? "Отправка..." : "Отправить"}
              </Button>
              <Button
                onClick={onClose}
                variant="secondary"
                disabled={isSubmittingReport}
              >
                Отмена
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
