import * as Sentry from "@sentry/react";

declare const __SENTRY_RELEASE__: string | null | undefined;

export const initSentry = () => {
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
  const release =
    typeof __SENTRY_RELEASE__ === "string" && __SENTRY_RELEASE__.length > 0
      ? __SENTRY_RELEASE__
      : undefined;

  Sentry.init({
    dsn: SENTRY_DSN,
    release,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],

    enableLogs: true,

    tracesSampleRate: 0.6,
    tracePropagationTargets: ["https://muru.ai/"],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
};
