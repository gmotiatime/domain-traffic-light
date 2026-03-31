import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { normalizeHashRoute, routeHref, type SitePath } from "@/lib/site-router";
import { AdminPage } from "@/pages/AdminPage";
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

const routeTitles: Record<SitePath, string> = {
  "/": "Доменный светофор.AI",
  "/analyzer": "Анализ риска | Доменный светофор",
  "/method": "Методика | Доменный светофор",
  "/safety": "Безопасность | Доменный светофор",
  "/admin": "Админка кэша | Доменный светофор",
};

function renderPage(path: SitePath) {
  switch (path) {
    case "/analyzer":
      return <AnalyzerPage />;
    case "/method":
      return <MethodPage />;
    case "/safety":
      return <SafetyPage />;
    case "/admin":
      return <AdminPage />;
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
    } else {
      document.title = routeTitles[readRoute()] || "Доменный светофор.AI";
    }

    const handleHashChange = () => {
      const newPath = readRoute();
      setPath(newPath);
      document.title = routeTitles[newPath] || "Доменный светофор.AI";
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Redirect to analyzer if we aren't there
        if (window.location.hash !== routeHref("/analyzer")) {
          window.location.hash = routeHref("/analyzer");
        }
        // Force the input to focus inside AnalyzerPage across tick
        setTimeout(() => window.dispatchEvent(new CustomEvent("focus-analyzer-input")), 50);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("keydown", handleKeyDown);
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
