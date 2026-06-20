'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function SentryInit() {
    useEffect(() => {
        if (Sentry.isInitialized()) return;
        
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
            environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
            tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 1.0,
            replaysOnErrorSampleRate: 1.0,
            replaysSessionSampleRate: 0.1,
            integrations: [
                Sentry.replayIntegration({
                    maskAllText: true,
                    blockAllMedia: true,
                }),
            ],
        });
    }, []);

    return null;
}