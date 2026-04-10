import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { normalizeHashRoute, routeHref, type SitePath } from "@/lib/site-router";
import { AdminPage } from "@/pages/AdminPage";
import { AnalyzerPage } from "@/pages/AnalyzerPage";
import { BrandKitPage } from "@/pages/BrandKitPage";
import { ChangelogPage } from "@/pages/ChangelogPage";
import { HomePage } from "@/pages/HomePage";
import { MethodPage } from "@/pages/MethodPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PresentationPage } from "@/pages/PresentationPage";
import { SafetyPage } from "@/pages/SafetyPage";

function readRoute(): SitePath | "404" {
  if (typeof window === "undefined") {
    return "/" as SitePath;
  }

  const hash = window.location.hash.replace(/^#/, "") || "/";
  const sitePaths = ["/", "/analyzer", "/method", "/safety", "/admin", "/brand", "/changelog", "/presentation"];
  if (sitePaths.includes(hash)) {
    return hash as SitePath;
  }
  return hash === "/" ? "/" as SitePath : "404";
}

const routeTitles: Record<SitePath | "404", string> = {
  "/": "Доменный светофор.AI",
  "/analyzer": "Анализ риска | Доменный светофор",
  "/method": "Методика | Доменный светофор",
  "/safety": "Безопасность | Доменный светофор",
  "/admin": "Админка кэша | Доменный светофор",
  "/brand": "Бренд-кит | Доменный светофор",
  "/changelog": "Что нового | Доменный светофор",
  "/presentation": "Презентация | Доменный светофор",
  "404": "Красный свет | Тупик",
  "/404": "Красный свет | Тупик",
};

function renderPage(path: SitePath | "404") {
  switch (path) {
    case "/analyzer":
      return <AnalyzerPage />;
    case "/method":
      return <MethodPage />;
    case "/safety":
      return <SafetyPage />;
    case "/admin":
      return <AdminPage />;
    case "/brand":
      return <BrandKitPage />;
    case "/changelog":
      return <ChangelogPage />;
    case "/presentation":
      return <PresentationPage />;
    case "404":
      return <NotFoundPage />;
    case "/":
    default:
      return <HomePage />;
  }
}

export default function App() {
  const [path, setPath] = useState<SitePath | "404">(readRoute);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = routeHref("/");
    } else {
      document.title = routeTitles[readRoute() as SitePath] || "Доменный светофор.AI";
    }

    const handleHashChange = () => {
      const newPath = readRoute();
      setPath(newPath);
      document.title = routeTitles[newPath as SitePath] || "Доменный светофор.AI";
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

  const isPresentation = path === "/presentation";

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {!isPresentation && <SiteHeader activePath={path === "404" ? "/" : path} />}
      <AnimatePresence mode="wait">
        <motion.main
          className={isPresentation ? "relative z-10" : path === "/" ? "relative z-10" : "relative z-10 pt-24"}
          key={path}
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          exit={{ opacity: 0, y: -12 }}
        >
          {renderPage(path)}
        </motion.main>
      </AnimatePresence>
      {!isPresentation && <SiteFooter />}
    </div>
  );
}
