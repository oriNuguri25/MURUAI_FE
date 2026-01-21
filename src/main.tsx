import { createRoot } from "react-dom/client";
import { AppRouterProvider } from "./app/providers/AppRouterProvider";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import "@/app/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <>
    <AppRouterProvider />
    <SpeedInsights />
    <Analytics />
  </>,
);
