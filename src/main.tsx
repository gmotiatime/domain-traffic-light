import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import App from "./App";
import "./index.css";

// Искусственная задержка монтирования для плавного эффекта появления (Splash Screen)
setTimeout(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
      <Analytics />
      <SpeedInsights />
    </React.StrictMode>,
  );
}, 800);
