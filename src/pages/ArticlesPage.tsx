import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";

type Article = {
  id: string;
  title?: string;
  topic?: string;
  content: string;
  createdAt: number;
};

type QuizOption = {
  text: string;
  isCorrect: boolean;
  explanation: string;
};

type QuizScenario = {
  scenario: string;
  options: QuizOption[];
};

export function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<QuizScenario | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    async function loadArticles() {
      try {
        const res = await fetch(getApiUrl("/api/articles"));
        const data = await res.json();
        if (res.ok && data.articles) {
          setArticles(data.articles);
        }
      } catch (err) {
        console.error("Failed to load articles", err);
      }
    }
    loadArticles();
    loadNewQuiz();
  }, []);

  async function loadNewQuiz() {
    setQuizLoading(true);
    setSelectedOption(null);
    setQuiz(null);
    try {
      const res = await fetch(getApiUrl("/api/quiz"));
      const data = await res.json();
      if (res.ok) {
        setQuiz(data);
      }
    } catch (err) {
      console.error("Failed to load quiz", err);
    } finally {
      setQuizLoading(false);
    }
  }

  return (
    <section className="relative min-h-[calc(100vh-6rem)] w-full bg-background px-4 pb-16 pt-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Библиотека безопасности
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Актуальные статьи и разбор новых угроз, созданные ИИ. Ознакомьтесь с материалами, чтобы быть в безопасности в интернете.
          </p>
        </div>

        {/* Quiz Section */}
        <div className="relative mb-16 overflow-hidden rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-6 sm:p-8">
          <div className="absolute right-0 top-0 p-8 opacity-5">
            <Shield className="h-32 w-32" />
          </div>
          <h2 className="mb-6 text-2xl font-bold text-amber-400">Квиз: Не дай себя развести</h2>

          {quizLoading ? (
            <p className="animate-pulse text-white/60">Генерируем сценарий...</p>
          ) : quiz ? (
            <div className="relative z-10">
              <p className="mb-6 text-lg leading-relaxed">{quiz.scenario}</p>
              <div className="space-y-3">
                {quiz.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const showResult = selectedOption !== null;
                  let bgClass = "border-white/10 bg-white/[0.03] hover:bg-white/[0.08]";

                  if (showResult) {
                    if (option.isCorrect) bgClass = "border-green-500/30 bg-green-500/10 text-green-400";
                    else if (isSelected) bgClass = "border-red-500/30 bg-red-500/10 text-red-400";
                    else bgClass = "border-white/5 bg-white/[0.01] opacity-50";
                  }

                  return (
                    <div key={idx}>
                      <button
                        onClick={() => !showResult && setSelectedOption(idx)}
                        disabled={showResult}
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-300 ${bgClass}`}
                      >
                        <span>{option.text}</span>
                        {showResult && option.isCorrect && <CheckCircle className="h-5 w-5 text-green-400" />}
                        {showResult && !option.isCorrect && isSelected && <XCircle className="h-5 w-5 text-red-400" />}
                      </button>
                      {showResult && isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2 border-l-2 border-white/20 pl-4 text-sm text-white/70"
                        >
                          {option.explanation}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="mt-8">
                  <Button onClick={loadNewQuiz} className="bg-amber-500 font-semibold text-black hover:bg-amber-400">
                    Следующий сценарий
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-white/60">Не удалось загрузить квиз.</p>
          )}
        </div>

        {/* Articles List */}
        <div className="space-y-6">
          <h2 className="mb-6 text-2xl font-bold">Опубликованные статьи</h2>
          {articles.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-white/50">
              Пока нет опубликованных статей.
            </p>
          ) : (
            articles.map((article) => {
              const isExpanded = expandedId === article.id;
              const title = article.title?.trim() || article.topic?.trim() || "Без названия";
              const topic = article.topic?.trim() || "";
              return (
                <motion.div
                  key={article.id}
                  layout
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
                >
                  <button
                    className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-white/[0.02]"
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  >
                    <div>
                      <h3 className="text-xl font-semibold text-white/90">{title}</h3>
                      <div className="mt-1 space-y-1 text-xs text-white/40">
                        {topic && topic !== title ? <p>Тема: {topic}</p> : null}
                        <p>{new Date(article.createdAt).toLocaleDateString("ru-RU")}</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-white/50" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-white/50" />
                    )}
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="article-markdown border-t border-white/5 px-6 pb-6 pt-2 text-white/80"
                    >
                      <ReactMarkdown>{article.content}</ReactMarkdown>
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
