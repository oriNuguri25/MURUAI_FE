import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { env } from "process";

// https://vite.dev/config/
export default defineConfig({
  cacheDir: ".vite",
  build: {
    sourcemap: true,
  },
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
    sentryVitePlugin({
      authToken: env.VITE_SENTRY_AUTH_TOKEN,
      org: "stayready",
      project: "muruai",

      sourcemaps: {
        assets: "./dist/**",
        filesToDeleteAfterUpload: "./dist/**/*.map",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
