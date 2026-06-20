import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: "https://f8a1d124cb9ccb74fb9bb3a9f23edbc1@o4511573171896320.ingest.de.sentry.io/4511573175042128",
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
    tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 1.0,
    debug: true,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    _experiments: {
        enableLogs: true,
    },
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
        }),
    ],
});