import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function HeroTitle() {
  const [currentVerb, setCurrentVerb] = useState(0);
  const [currentWord, setCurrentWord] = useState(0);

  const verbs = ["Проверяй", "Анализируй", "Сканируй", "Изучай", "Оценивай"];
  const words = ["домен", "ссылку", "сервис", "URL", "сайт"];

  useEffect(() => {
    const verbInterval = setInterval(() => {
      setCurrentVerb((prev) => (prev + 1) % verbs.length);
    }, 3000);

    return () => clearInterval(verbInterval);
  }, [verbs.length]);

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 3000);

    return () => clearInterval(wordInterval);
  }, [words.length]);

  return (
    <>
      <span className="relative inline-block">
        <motion.span
          key={currentVerb}
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="inline-block"
        >
          {verbs[currentVerb]}
        </motion.span>
      </span>{" "}
      <span className="relative inline-block">
        <motion.span
          key={currentWord}
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="inline-block bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent"
        >
          {words[currentWord]}
        </motion.span>
      </span>
      <br />
      <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
        до ввода данных
      </span>
    </>
  );
}
