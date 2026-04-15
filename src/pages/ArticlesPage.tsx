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

function QuizSection() {
  const [quiz, setQuiz] = useState<QuizScenario | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
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
    <div className="mb-16 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Shield className="h-32 w-32" />
      </div>
      <h2 className="text-2xl font-bold mb-6 text-amber-400">Квиз: Не дай себя развести</h2>

      {quizLoading ? (
        <p className="text-white/60 animate-pulse">Генерируем сценарий...</p>
      ) : quiz ? (
        <div className="relative z-10">
          <p className="text-lg mb-6 leading-relaxed">{quiz.scenario}</p>
          <div className="space-y-3">
            {quiz.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const showResult = selectedOption !== null;
              let bgClass = "bg-white/[0.03] hover:bg-white/[0.08] border-white/10";

              if (showResult) {
                if (option.isCorrect) bgClass = "bg-green-500/10 border-green-500/30 text-green-400";
                else if (isSelected) bgClass = "bg-red-500/10 border-red-500/30 text-red-400";
                else bgClass = "bg-white/[0.01] border-white/5 opacity-50";
              }

              return (
                <div key={idx}>
                  <button
                    onClick={() => !showResult && setSelectedOption(idx)}
                    disabled={showResult}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${bgClass} flex items-center justify-between`}
                  >
                    <span>{option.text}</span>
                    {showResult && option.isCorrect && <CheckCircle className="h-5 w-5 text-green-400" />}
                    {showResult && !option.isCorrect && isSelected && <XCircle className="h-5 w-5 text-red-400" />}
                  </button>
                  {showResult && isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 text-sm text-white/70 pl-4 border-l-2 border-white/20"
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
              <Button onClick={loadNewQuiz} className="bg-amber-500 text-black hover:bg-amber-400 font-semibold">
                Следующий сценарий
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-white/60">Не удалось загрузить квиз.</p>
      )}
    </div>
  );
}

function ArticleList({ articles }: { articles: Article[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Опубликованные статьи</h2>
      {articles.length === 0 ? (
        <p className="text-white/50 text-center py-12 border border-white/10 rounded-2xl border-dashed">
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
              className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <button
                className="flex w-full items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] rounded-2xl"
                onClick={() => setExpandedId(isExpanded ? null : article.id)}
                aria-expanded={isExpanded}
                aria-controls={`article-content-${article.id}`}
              >
                <div>
                  <h3 className="text-xl font-semibold text-white/90">{title}</h3>
                  <div className="mt-1 space-y-1 text-xs text-white/40">
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
                  id={`article-content-${article.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-6 pb-6 pt-2 border-t border-white/5 text-white/80"
                >
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-white" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-6 mb-4 text-white" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-white/90" {...props} />,
                      p: ({ node, ...props }) => <p className="leading-relaxed mb-4 text-white/80" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 text-white/80" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-white/80" {...props} />,
                      li: ({ node, ...props }) => <li className="pl-2" {...props} />,
                      a: ({ node, ...props }) => <a className="text-amber-400 hover:text-amber-300 underline underline-offset-2" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                      code: ({ node, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || "");
                        return match ? (
                          <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto border border-white/10 mb-4 mt-2">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-200 font-mono text-sm" {...props}>
                            {children}
                          </code>
                        );
                      },
                      blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-amber-500/50 pl-4 italic text-white/60 mb-4" {...props} />,
                    }}
                  >
                    {article.content}
                  </ReactMarkdown>
                </motion.div>
              )}
            </motion.div>
          );
        })
      )}
    </div>
  );
}

export function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);

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
  }, []);

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

        <QuizSection />
        <ArticleList articles={articles} />
      </div>
    </section>
  );
}
