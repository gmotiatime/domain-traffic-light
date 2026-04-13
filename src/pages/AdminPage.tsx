import { useEffect, useMemo, useState } from "react";

import { Database, KeyRound, RefreshCw, Save, Search, ShieldAlert, Trash2, Flag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";

type AdminCacheReason = {
  title: string;
  detail: string;
  scoreDelta: number;
  tone: "positive" | "warning" | "critical";
};

type AdminCacheData = {
  analysis?: {
    verdict?: "low" | "medium" | "high";
    score?: number;
    summary?: string;
    reasons?: AdminCacheReason[];
    actions?: string[];
  };
  aiAdjustedResult?: {
    verdict?: "low" | "medium" | "high";
    score?: number;
    summary?: string;
    reasons?: AdminCacheReason[];
    actions?: string[];
  };
  moderation?: {
    moderated?: boolean;
    updatedAt?: string;
    note?: string | null;
  };
};

type AdminCacheEntry = {
  key: string | null;
  host: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  model: string | null;
  moderated: boolean;
  moderation: AdminCacheData["moderation"] | null;
  data: AdminCacheData;
  reports?: Array<{
    id: string;
    text: string;
    verdict: string;
    score: number;
    createdAt: number;
    resolved: boolean;
    resolvedAt?: number;
  }>;
  preview: {
    verdict: "low" | "medium" | "high" | null;
    score: number | null;
    summary: string;
  } | null;
};

const TOKEN_STORAGE_KEY = "domain-traffic-light:admin-token";

function formatTimestamp(value: number | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ru-BY");
  } catch {
    return "—";
  }
}

function serializeJson(value: unknown) {
  return JSON.stringify(value ?? [], null, 2);
}

type CacheStats = {
  size?: number;
  total?: number;
  active?: number;
  expired?: number;
  verdicts?: Record<string, number>;
  storage?: string;
  dbSize?: number;
  oldestRecord?: string | null;
  newestRecord?: string | null;
};

type PublishedArticle = {
  id: string;
  title: string;
  topic: string;
  content: string;
  createdAt: number;
};

export function AdminPage() {
  const [token, setToken] = useState("");
  const [draftToken, setDraftToken] = useState("");
  const [searchHost, setSearchHost] = useState("");
  const [entry, setEntry] = useState<AdminCacheEntry | null>(null);
  const [recent, setRecent] = useState<AdminCacheEntry[]>([]);
  const [allRecent, setAllRecent] = useState<AdminCacheEntry[]>([]);
  const [verdictFilter, setVerdictFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [sortOrder, setSortOrder] = useState<"date" | "score">("date");
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [status, setStatus] = useState("Введите пароль администратора.");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportsWithComplaints, setReportsWithComplaints] = useState<AdminCacheEntry[]>([]);
  const [form, setForm] = useState({
    verdict: "medium" as "low" | "medium" | "high",
    score: "50",
    summary: "",
    reasonsJson: "[]",
    actionsJson: "[]",
    note: "",
  });

  const [activeTab, setActiveTab] = useState<"cache" | "content">("cache");
  const [articleTopic, setArticleTopic] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [isPublishingArticle, setIsPublishingArticle] = useState(false);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [articleStatus, setArticleStatus] = useState("");

  async function handleGenerateArticle() {
    if (!articleTopic) return;
    setArticleTitle("");
    setArticleContent("");
    setIsGeneratingArticle(true);
    setArticleStatus("Генерация...");
    try {
      const response = await fetch(getApiUrl(`/api/articles?action=generate`), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ topic: articleTopic }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ошибка генерации");
      setArticleTitle(data.title || articleTopic);
      setArticleContent(data.content || "");
      setArticleStatus("Сгенерировано успешно.");
    } catch (err: any) {
      setArticleStatus(err.message);
    } finally {
      setIsGeneratingArticle(false);
    }
  }

  async function loadArticles() {
    if (!token) return;
    setIsLoadingArticles(true);
    try {
      const response = await fetch(getApiUrl(`/api/articles`), {
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ошибка загрузки статей");
      const nextArticles = Array.isArray(data.articles) ? data.articles : [];
      setArticles([...nextArticles].sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)));
    } catch (err: any) {
      setArticleStatus(err.message);
    } finally {
      setIsLoadingArticles(false);
    }
  }

  async function handleDeleteArticle(articleId: string) {
    if (!token) return;
    setDeletingArticleId(articleId);
    setArticleStatus("Удаляем статью...");
    try {
      const response = await fetch(getApiUrl(`/api/articles?id=${encodeURIComponent(articleId)}`), {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ошибка удаления статьи");
      await loadArticles();
      setArticleStatus("Статья удалена.");
    } catch (err: any) {
      setArticleStatus(err.message);
    } finally {
      setDeletingArticleId(null);
    }
  }

  async function handlePublishArticle() {
    if (!articleTopic || !articleContent) return;
    setIsPublishingArticle(true);
    setArticleStatus("Публикация...");
    try {
      const response = await fetch(getApiUrl(`/api/articles`), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          topic: articleTopic,
          title: articleTitle.trim() || articleTopic.trim(),
          content: articleContent,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ошибка публикации");
      setArticleStatus("Опубликовано успешно!");
      setArticleTopic("");
      setArticleTitle("");
      setArticleContent("");
      await loadArticles();
    } catch (err: any) {
      setArticleStatus(err.message);
    } finally {
      setIsPublishingArticle(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    if (saved) {
      setToken(saved);
      setDraftToken(saved);
    }
  }, []);

  useEffect(() => {
    let filtered = allRecent;
    if (verdictFilter !== "all") {
      filtered = allRecent.filter((item) => item.preview?.verdict === verdictFilter);
    }

    // Create a copy to sort
    const sorted = [...filtered];
    if (sortOrder === "date") {
      sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortOrder === "score") {
      sorted.sort((a, b) => (b.preview?.score || 0) - (a.preview?.score || 0));
    }

    setRecent(sorted);
  }, [verdictFilter, sortOrder, allRecent]);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-admin-token": token,
    }),
    [token],
  );

  useEffect(() => {
    if (token && activeTab === "content") {
      void loadArticles();
    }
  }, [activeTab, token]);

  function syncForm(nextEntry: AdminCacheEntry | null) {
    if (!nextEntry) {
      setForm({
        verdict: "medium",
        score: "50",
        summary: "",
        reasonsJson: "[]",
        actionsJson: "[]",
        note: "",
      });
      return;
    }

    const current = nextEntry.data.aiAdjustedResult || nextEntry.data.analysis;
    setForm({
      verdict: current?.verdict || "medium",
      score: String(current?.score ?? 50),
      summary: current?.summary || "",
      reasonsJson: serializeJson(current?.reasons || []),
      actionsJson: serializeJson(current?.actions || []),
      note: nextEntry.moderation?.note || "",
    });
  }

  async function loadRecent() {
    if (!token) return;
    const response = await fetch(getApiUrl("/api/admin-cache?limit=20"), {
      headers: authHeaders,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Не удалось загрузить кэш.");
    }
    const recentData = Array.isArray(payload?.recent) ? payload.recent : [];
    setAllRecent(recentData);
    setRecent(recentData);
    
    // Фильтруем записи с жалобами
    const withReports = recentData.filter((item: AdminCacheEntry) => 
      Array.isArray(item.reports) && item.reports.length > 0
    );
    setReportsWithComplaints(withReports);
    
    // Загружаем статистику
    await loadStats();
  }

  async function loadStats() {
    try {
      const response = await fetch(getApiUrl("/api/cache-stats"));
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  }

  async function loadEntry(host: string) {
    if (!token || !host.trim()) return;
    setIsLoading(true);
    setStatus("Загружаем запись из базы…");
    try {
      const response = await fetch(
        getApiUrl(`/api/admin-cache?host=${encodeURIComponent(host.trim())}&limit=20`),
        { headers: authHeaders },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось загрузить запись.");
      }
      const recentData = Array.isArray(payload?.recent) ? payload.recent : [];
      setAllRecent(recentData);
      setRecent(recentData);
      setEntry(payload?.entry || null);
      syncForm(payload?.entry || null);
      setStatus(payload?.entry ? "Запись загружена." : "Запись по этому хосту не найдена.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка загрузки.";
      if (/прав/i.test(message)) {
        setToken("");
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      setStatus(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin() {
    const nextToken = draftToken.trim();
    if (!nextToken) return;
    setToken(nextToken);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    try {
      const response = await fetch(getApiUrl("/api/admin-cache?limit=20"), {
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": nextToken,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Пароль не подошёл.");
      }
      const recentData = Array.isArray(payload?.recent) ? payload.recent : [];
      setAllRecent(recentData);
      setRecent(recentData);
      setStatus("Админка открыта.");
      await loadStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка входа.";
      setToken("");
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      setStatus(message);
    }
  }

  async function handleSave() {
    if (!entry?.host || !token) return;
    setIsSaving(true);
    setStatus("Сохраняем правки…");
    try {
      const reasons = JSON.parse(form.reasonsJson);
      const actions = JSON.parse(form.actionsJson);
      const response = await fetch(getApiUrl("/api/admin-cache"), {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          host: entry.host,
          edits: {
            verdict: form.verdict,
            score: Number(form.score),
            summary: form.summary,
            reasons,
            actions,
            note: form.note,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось сохранить правки.");
      }
      setEntry(payload?.entry || null);
      syncForm(payload?.entry || null);
      await loadRecent();
      setStatus("Правки сохранены в базе.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка сохранения.";
      setStatus(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry?.host || !token) return;
    setIsSaving(true);
    setStatus("Удаляем запись…");
    try {
      const response = await fetch(
        getApiUrl(`/api/admin-cache?host=${encodeURIComponent(entry.host)}`),
        {
          method: "DELETE",
          headers: authHeaders,
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось удалить запись.");
      }
      setEntry(null);
      syncForm(null);
      await loadRecent();
      setStatus("Запись удалена.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка удаления.";
      setStatus(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteReport(reportId: string) {
    if (!entry?.host || !token) return;
    setIsSaving(true);
    setStatus("Удаляем жалобу…");
    try {
      const response = await fetch(
        getApiUrl(`/api/report?host=${encodeURIComponent(entry.host)}&reportId=${encodeURIComponent(reportId)}`),
        {
          method: "DELETE",
          headers: authHeaders,
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Не удалось удалить жалобу.");
      }
      // Перезагружаем запись
      await loadEntry(entry.host);
      await loadRecent();
      setStatus("Жалоба удалена.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка удаления жалобы.";
      setStatus(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="relative min-h-[calc(100vh-6rem)] w-full bg-background px-4 pb-16 pt-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl sm:p-6">
          <div className="flex gap-4 border-b border-white/10 mb-6 pb-2">
            <button
              className={`px-4 py-2 font-medium transition-colors ${activeTab === "cache" ? "border-b-2 border-white text-white" : "text-white/50 hover:text-white"}`}
              onClick={() => setActiveTab("cache")}
            >
              Управление кэшем
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${activeTab === "content" ? "border-b-2 border-white text-white" : "text-white/50 hover:text-white"}`}
              onClick={() => setActiveTab("content")}
            >
              Управление контентом
            </button>
          </div>

          <div className={`transition-opacity duration-300 ${activeTab === "cache" ? "block" : "hidden"}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/60">
                  <Database className="h-3.5 w-3.5" />
                  Админка кэша
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  Просмотр и ручная правка общей базы
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
                  Здесь можно найти запись по домену, посмотреть сохранённый AI-ответ и вручную исправить verdict, summary, reasons и actions.
                </p>
              </div>

            {!token ? (
              <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                  <KeyRound className="h-3.5 w-3.5" />
                  Пароль администратора
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={draftToken}
                    onChange={(e) => setDraftToken(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                    placeholder="Введите пароль"
                  />
                  <Button type="button" onClick={handleLogin}>Войти</Button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-xl rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                  <Search className="h-3.5 w-3.5" />
                  Поиск по host (любой вариант)
                </label>
                <div className="mb-2 text-xs text-white/40">
                  Примеры: youtube.com, www.youtube.com, https://youtube.com/watch
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={searchHost}
                    onChange={(e) => setSearchHost(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                    placeholder="например, riblox.com.ru"
                  />
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => loadEntry(searchHost)} disabled={isLoading}>
                      {isLoading ? "Ищем…" : "Открыть"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => loadRecent()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Обновить
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => setShowReportsModal(true)}
                      className="relative"
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      Жалобы
                      {reportsWithComplaints.length > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {reportsWithComplaints.length}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/65">
            {status}
          </div>

          {/* Статистика Б�� */}
          {token && stats && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Database className="h-24 w-24 text-white" />
                </div>
                <div className="text-sm font-medium uppercase tracking-widest text-white/40 mb-2">Всего записей в кэше</div>
                <div className="mt-1 text-4xl font-bold text-white">{stats.total || stats.size || 0}</div>
                {stats.active && stats.active !== stats.total ? (
                  <div className="mt-2 text-sm text-emerald-400/80 font-medium">{stats.active} активных</div>
                ) : null}
              </div>
              
              <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-transparent p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Flag className="h-24 w-24 text-rose-500" />
                </div>
                <div className="text-sm font-medium uppercase tracking-widest text-rose-400/60 mb-2">Жалобы пользователей</div>
                <div className="mt-1 text-4xl font-bold text-rose-400">
                  {reportsWithComplaints.reduce((acc, curr) => acc + (curr.reports?.length || 0), 0)}
                </div>
                <div className="mt-2 text-sm text-rose-400/60 font-medium">отмечено на {reportsWithComplaints.length} доменах</div>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <KeyRound className="h-24 w-24 text-blue-500" />
                </div>
                <div className="text-sm font-medium uppercase tracking-widest text-blue-400/60 mb-2">Объем хранилища</div>
                <div className="mt-1 text-4xl font-bold text-blue-400">
                  {stats.dbSize ? `${(stats.dbSize / 1024).toFixed(1)}` : '—'} <span className="text-2xl">KB</span>
                </div>
                <div className="mt-2 text-sm text-blue-400/60 font-medium">{stats.storage || 'local-db'}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                <div className="text-sm font-medium uppercase tracking-widest text-white/40 mb-4">Вердикты</div>
                <div className="space-y-3 text-sm font-medium">
                  {stats.verdicts ? (
                    <>
                      <div className="flex justify-between items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-emerald-400">
                        <span>Low (Безопасно):</span>
                        <span className="text-lg">{stats.verdicts.low || 0}</span>
                      </div>
                      <div className="flex justify-between items-center rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-amber-400">
                        <span>Medium (Риск):</span>
                        <span className="text-lg">{stats.verdicts.medium || 0}</span>
                      </div>
                      <div className="flex justify-between items-center rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-rose-400">
                        <span>High (Опасно):</span>
                        <span className="text-lg">{stats.verdicts.high || 0}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-white/40">—</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Временные метки</div>
                <div className="mt-2 text-xs text-white/60 leading-relaxed">
                  {stats.oldestRecord ? (
                    <>
                      <div className="mb-1">Старейшая:</div>
                      <div className="text-white/40 mb-2">{new Date(stats.oldestRecord).toLocaleDateString('ru-RU')}</div>
                    </>
                  ) : null}
                  {stats.newestRecord ? (
                    <>
                      <div className="mb-1">Новейшая:</div>
                      <div className="text-white/40">{new Date(stats.newestRecord).toLocaleDateString('ru-RU')}</div>
                    </>
                  ) : null}
                  {!stats.oldestRecord && !stats.newestRecord && <div className="text-white/40">—</div>}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Нормализация</div>
                <div className="mt-2 text-xs text-white/60 leading-relaxed">
                  <div className="mb-1">✓ Убирается www</div>
                  <div className="mb-1">✓ Убирается протокол</div>
                  <div>✓ Убирается путь</div>
                </div>
              </div>
            </div>
          )}

          {/* Подозрительные паттерны */}
          {token && reportsWithComplaints.filter(item => item.preview?.verdict === "low" && (item.reports?.length || 0) >= 3).length > 0 && (
            <div className="mt-6 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-400">Подозрительные паттерны</h3>
                  <p className="text-sm text-amber-400/60">Домены с вердиктом "Безопасно" и множеством жалоб (&gt;= 3). Требуется пересмотр ruleset.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reportsWithComplaints
                  .filter(item => item.preview?.verdict === "low" && (item.reports?.length || 0) >= 3)
                  .map(item => {
                    const hostParts = item.host?.split('.') || [];
                    const tld = hostParts.length > 1 ? `.${hostParts.slice(-1)[0]}` : "—";
                    return (
                      <div key={`pattern-${item.host}`} className="rounded-xl border border-amber-500/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white">{item.host}</span>
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">{item.reports?.length} жалоб</span>
                        </div>
                        <div className="text-xs text-white/50">
                          <span className="mr-3">TLD: <span className="text-white/80">{tld}</span></span>
                          <span>Score: {item.preview?.score || 0}</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-3 w-full border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          onClick={() => loadEntry(item.host || "")}
                        >
                          Изучить запись
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {token && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
            <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                <Database className="h-3.5 w-3.5" />
                Последние записи
              </div>
              
              {/* Сортировка */}
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setSortOrder("date")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    sortOrder === "date"
                      ? "bg-white/10 text-white"
                      : "bg-white/[0.02] text-white/50 hover:bg-white/[0.05]"
                  }`}
                >
                  По дате
                </button>
                <button
                  onClick={() => setSortOrder("score")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    sortOrder === "score"
                      ? "bg-white/10 text-white"
                      : "bg-white/[0.02] text-white/50 hover:bg-white/[0.05]"
                  }`}
                >
                  По скору
                </button>
              </div>

              {/* Фильтр по вердиктам */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setVerdictFilter("all")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    verdictFilter === "all"
                      ? "bg-white/10 text-white"
                      : "bg-white/[0.02] text-white/50 hover:bg-white/[0.05]"
                  }`}
                >
                  Все
                </button>
                <button
                  onClick={() => setVerdictFilter("low")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    verdictFilter === "low"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/[0.02] text-white/50 hover:bg-green-500/10"
                  }`}
                >
                  Low
                </button>
                <button
                  onClick={() => setVerdictFilter("medium")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    verdictFilter === "medium"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-white/[0.02] text-white/50 hover:bg-yellow-500/10"
                  }`}
                >
                  Med
                </button>
                <button
                  onClick={() => setVerdictFilter("high")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    verdictFilter === "high"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-white/[0.02] text-white/50 hover:bg-red-500/10"
                  }`}
                >
                  High
                </button>
              </div>

              <div className="space-y-2">
                {recent.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/40">
                    {verdictFilter === "all" ? "База пока пустая." : `Нет записей с вердиктом "${verdictFilter}".`}
                  </div>
                ) : (
                  recent.map((item) => (
                    <button
                      key={`${item.host}-${item.key}`}
                      type="button"
                      onClick={() => {
                        setSearchHost(item.host || "");
                        void loadEntry(item.host || "");
                      }}
                      className="w-full rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-white">{item.host || "—"}</span>
                        <span className="text-xs text-white/45">{item.preview?.score ?? "—"}</span>
                      </div>
                      <div className="mt-1 text-xs text-white/45">
                        {item.preview?.verdict || "—"} · {item.model || "AI"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-2xl sm:p-5">
              {entry ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">Host</div>
                      <div className="mt-2 text-lg font-semibold">{entry.host}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">Создано</div>
                      <div className="mt-2 text-sm text-white/80">{formatTimestamp(entry.createdAt)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">Обновлено</div>
                      <div className="mt-2 text-sm text-white/80">{formatTimestamp(entry.updatedAt || entry.createdAt)}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Verdict</span>
                      <select
                        value={form.verdict}
                        onChange={(e) => setForm((prev) => ({ ...prev, verdict: e.target.value as "low" | "medium" | "high" }))}
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Score</span>
                      <input
                        value={form.score}
                        onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                        placeholder="0-100"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Summary</span>
                    <textarea
                      value={form.summary}
                      onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                      className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>

                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Reasons JSON</span>
                      <textarea
                        value={form.reasonsJson}
                        onChange={(e) => setForm((prev) => ({ ...prev, reasonsJson: e.target.value }))}
                        className="min-h-[280px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-white outline-none"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Actions JSON</span>
                      <textarea
                        value={form.actionsJson}
                        onChange={(e) => setForm((prev) => ({ ...prev, actionsJson: e.target.value }))}
                        className="min-h-[280px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-white outline-none"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Комментарий модерации</span>
                    <textarea
                      value={form.note}
                      onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                      className="min-h-[90px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>

                  {/* Жалобы пользователей */}
                  {entry.reports && entry.reports.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-400">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Жалобы пользователей ({entry.reports.length})
                      </div>
                      <div className="space-y-3">
                        {entry.reports.map((report) => (
                          <div
                            key={report.id}
                            className={`rounded-xl border px-4 py-3 ${
                              report.resolved
                                ? "border-white/10 bg-white/[0.02] opacity-60"
                                : "border-amber-500/20 bg-amber-500/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-sm text-white/80">{report.text}</p>
                                <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                                  <span>Вердикт: {report.verdict}</span>
                                  <span>Скор: {report.score}</span>
                                  <span>{formatTimestamp(report.createdAt)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {report.resolved ? (
                                  <span className="shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs text-green-400">
                                    Решено
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                                    Новая
                                  </span>
                                )}
                                <button
                                  onClick={() => handleDeleteReport(report.id)}
                                  aria-label="Удалить жалобу"
                                  disabled={isSaving}
                                  className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button type="button" onClick={handleSave} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Сохраняем…" : "Сохранить"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleDelete} disabled={isSaving}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить запись
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-black/10">
                  <div className="max-w-md px-6 text-center">
                    <ShieldAlert className="mx-auto h-10 w-10 text-white/35" />
                    <div className="mt-4 text-lg font-medium">Запись не выбрана</div>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">
                      Введи host сверху или выбери одну из последних записей слева.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
          </div>

          <div className={`transition-opacity duration-300 mt-4 ${activeTab === "content" ? "block" : "hidden"}`}>
            {token && (
              <div className="flex flex-col gap-6">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60 mb-4 flex justify-between items-center max-w-xl">
                  <span>Активный провайдер ИИ: <span className="font-semibold text-white/80">OpenRouter AI</span></span>
                  <span className="text-xs uppercase tracking-widest px-2 py-1 bg-white/[0.05] rounded-lg">DeepSeek V3</span>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-2">Генерация ИИ-статей</h2>
                  <p className="text-sm text-white/60 mb-4">
                    Введите тему статьи. OpenRouter AI сгенерирует черновик с заголовком и Markdown-текстом.
                  </p>
                  <div className="grid gap-3 max-w-xl">
                    <input
                      value={articleTopic}
                      onChange={(e) => setArticleTopic(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      placeholder="Тема статьи, например: Опасность публичных Wi-Fi"
                    />
                    <input
                      value={articleTitle}
                      onChange={(e) => setArticleTitle(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                      placeholder="Заголовок статьи (можно отредактировать)"
                    />
                    <Button type="button" onClick={handleGenerateArticle} disabled={isGeneratingArticle || !articleTopic}>
                      {isGeneratingArticle ? "Генерируем..." : "Сгенерировать"}
                    </Button>
                  </div>
                  {articleStatus && <p className="mt-2 text-sm text-amber-400">{articleStatus}</p>}
                </div>

                {articleContent && (
                  <div className="mt-4 grid gap-4">
                    <label className="block">
                      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Заголовок</span>
                      <input
                        value={articleTitle}
                        onChange={(e) => setArticleTitle(e.target.value)}
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                        placeholder="Короткий и цепляющий заголовок"
                      />
                    </label>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Предпросмотр и редактирование</h3>
                      <textarea
                        value={articleContent}
                        onChange={(e) => setArticleContent(e.target.value)}
                        className="h-[400px] w-full rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none font-mono"
                      />
                    </div>
                    <div className="mt-2">
                      <Button type="button" onClick={handlePublishArticle} disabled={isPublishingArticle}>
                        <Save className="mr-2 h-4 w-4" />
                        {isPublishingArticle ? "Публикация..." : "Опубликовать"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white/90">Опубликованные статьи</h3>
                      <p className="text-sm text-white/50">Здесь можно удалить неудачные публикации из Redis.</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => loadArticles()} disabled={isLoadingArticles}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingArticles ? "animate-spin" : ""}`} />
                      {isLoadingArticles ? "Обновляем..." : "Обновить список"}
                    </Button>
                  </div>

                  {isLoadingArticles ? (
                    <p className="text-sm text-white/50">Загружаем статьи...</p>
                  ) : articles.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-sm text-white/50">
                      Пока нет опубликованных статей.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {articles.map((article) => {
                        const title = article.title || article.topic || "Без названия";
                        const topic = article.topic || "";
                        return (
                          <div key={article.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h4 className="truncate text-base font-semibold text-white">{title}</h4>
                                <div className="mt-1 space-y-1 text-xs text-white/45">
                                  {topic && topic !== title ? <p>Тема: {topic}</p> : null}
                                  <p>{formatTimestamp(article.createdAt)}</p>
                                </div>
                                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/60">
                                  {article.content.slice(0, 220)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => handleDeleteArticle(article.id)}
                                disabled={deletingArticleId === article.id}
                                className="shrink-0 border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingArticleId === article.id ? "Удаляем..." : "Удалить"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

      </div>

      {/* ══════════ REPORTS MODAL ══════════ */}
      {showReportsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={() => setShowReportsModal(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[80vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowReportsModal(false)}
              aria-label="Закрыть"
              className="absolute right-4 top-4 rounded-lg p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10">
                <Flag className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Жалобы пользователей</h3>
                <p className="text-sm text-white/50">Всего записей с жалобами: {reportsWithComplaints.length}</p>
              </div>
            </div>

            {reportsWithComplaints.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-white/40">
                Нет жалоб от пользователей
              </div>
            ) : (
              <div className="space-y-4">
                {reportsWithComplaints.map((item) => (
                  <div
                    key={item.host}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-white">{item.host}</h4>
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${
                            item.preview?.verdict === "high"
                              ? "border-red-500/20 bg-red-500/10 text-red-400"
                              : item.preview?.verdict === "medium"
                              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                              : "border-green-500/20 bg-green-500/10 text-green-400"
                          }`}>
                            {item.preview?.verdict || "—"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-white/50">
                          Скор: {item.preview?.score ?? "—"} · Жалоб: {item.reports?.length || 0}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSearchHost(item.host || "");
                          void loadEntry(item.host || "");
                          setShowReportsModal(false);
                        }}
                      >
                        Открыть
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {item.reports?.map((report) => (
                        <div
                          key={report.id}
                          className={`rounded-xl border px-4 py-3 ${
                            report.resolved
                              ? "border-white/10 bg-white/[0.02] opacity-60"
                              : "border-amber-500/20 bg-amber-500/10"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm text-white/80">{report.text}</p>
                              <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                                <span>{formatTimestamp(report.createdAt)}</span>
                              </div>
                            </div>
                            {report.resolved ? (
                              <span className="shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs text-green-400">
                                Решено
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                                Новая
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
