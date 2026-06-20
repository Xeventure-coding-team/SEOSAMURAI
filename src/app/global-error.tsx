'use client';

import { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.withScope((scope) => {
            if (error.digest) {
                scope.setFingerprint([error.digest]);
            }
            Sentry.captureException(error);
        });
    }, [error]);

    return (
        <html>
            <head>
                <style>{`
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { 
                        font-family: sans-serif;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #0a0a0a;
                        color: #fff;
                        padding: 1rem;
                    }
                    .card {
                        max-width: 420px;
                        width: 100%;
                        border: 1px solid #1f1f1f;
                        border-radius: 16px;
                        padding: 2rem;
                        text-align: center;
                        background: #111;
                    }
                    .icon {
                        width: 56px; height: 56px;
                        border-radius: 50%;
                        background: rgba(239,68,68,0.1);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 1rem;
                        font-size: 24px;
                    }
                    h1 { font-size: 1.5rem; font-weight: 700; }
                    p { margin-top: 0.5rem; color: #888; font-size: 0.9rem; }
                    .ref { margin-top: 0.5rem; color: #555; font-size: 0.75rem; font-family: monospace; }
                    button {
                        margin-top: 1.5rem;
                        width: 100%;
                        padding: 0.65rem 1rem;
                        border-radius: 8px;
                        border: none;
                        background: #fff;
                        color: #000;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 0.9rem;
                    }
                    button:hover { background: #e5e5e5; }
                `}</style>
            </head>
            <body>
                <div className="card">
                    <div className="icon">⚠️</div>
                    <h1>Critical Error</h1>
                    <p>Something went seriously wrong.</p>
                    {error.digest && (
                        <p className="ref">Ref: {error.digest.slice(0, 8)}</p>
                    )}
                    <button onClick={reset}>Reload Application</button>
                </div>
            </body>
        </html>
    );
}