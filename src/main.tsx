import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import App from "./App";
import "./index.css";
import "./white-theme.css";
import { ThemeProvider } from "./hooks/useTheme";

// Искусственная задержка монтирования для плавного эффекта появления (Splash Screen)
setTimeout(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="dtl-theme">
        <App />
      </ThemeProvider>
      <Analytics />
      <SpeedInsights />
    </React.StrictMode>,
  );
}, 800);
