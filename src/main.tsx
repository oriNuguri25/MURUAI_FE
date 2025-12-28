import { createRoot } from "react-dom/client";
import { AppRouterProvider } from "./app/providers/AppRouterProvider";
import "@/app/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <>
    <AppRouterProvider />
  </>
);
