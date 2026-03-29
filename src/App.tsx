import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { normalizeHashRoute, routeHref, type SitePath } from "@/lib/site-router";
import { AnalyzerPage } from "@/pages/AnalyzerPage";
import { HomePage } from "@/pages/HomePage";
import { MethodPage } from "@/pages/MethodPage";
import { SafetyPage } from "@/pages/SafetyPage";

function readRoute() {
  if (typeof window === "undefined") {
    return "/" as SitePath;
  }

  return normalizeHashRoute(window.location.hash);
}

function renderPage(path: SitePath) {
  switch (path) {
    case "/analyzer":
      return <AnalyzerPage />;
    case "/method":
      return <MethodPage />;
    case "/safety":
      return <SafetyPage />;
    case "/":
    default:
      return <HomePage />;
  }
}

export default function App() {
  const [path, setPath] = useState<SitePath>(readRoute);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = routeHref("/");
    }

    const handleHashChange = () => {
      setPath(readRoute());
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <SiteHeader activePath={path} />
      <AnimatePresence mode="wait">
        <motion.main
          className={path === "/" ? "relative z-10" : "relative z-10 pt-24"}
          key={path}
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          exit={{ opacity: 0, y: -12 }}
        >
          {renderPage(path)}
        </motion.main>
      </AnimatePresence>
      <SiteFooter />
    </div>
  );
}
