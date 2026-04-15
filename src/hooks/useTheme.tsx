import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("domain-traffic-light:theme");
      if (stored === "light" || stored === "dark") {
        return stored;
      }
    }
    return "dark"; // Default is dark
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("white-theme");
    } else {
      root.classList.remove("white-theme");
    }
    window.localStorage.setItem("domain-traffic-light:theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
}
