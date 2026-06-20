'use client';

import { AlertTriangle, RefreshCcw, Home, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

function getErrorType(error: Error) {
    if (error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('fetch')) return 'network';
    if (error.message?.toLowerCase().includes('timeout')) return 'timeout';
    if (error.message?.toLowerCase().includes('auth') ||
        error.message?.toLowerCase().includes('unauthorized')) return 'auth';
    return 'unknown';
}

function getErrorInfo(error: Error) {
    const type = getErrorType(error);
    switch (type) {
        case 'network':
            return {
                title: 'Connection Error',
                description: 'Unable to reach our servers. Please check your internet connection.',
            };
        case 'timeout':
            return {
                title: 'Request Timeout',
                description: 'The server is taking too long to respond. Please try again.',
            };
        case 'auth':
            return {
                title: 'Session Expired',
                description: 'Your session may have expired. Please sign in again.',
            };
        default:
            return {
                title: 'Something went wrong',
                description: 'We encountered an unexpected error. Our team has been notified.',
            };
    }
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    const router = useRouter();
    const [isRetrying, setIsRetrying] = useState(false);

useEffect(() => {
    try {
        Sentry.withScope((scope) => {
            scope.setTag('component', 'ErrorPage');
            scope.setTag('error_type', getErrorType(error));
            scope.setExtra('digest', error.digest);
            scope.setExtra('url', window.location.href);
            if (error.digest) {
                scope.setFingerprint([error.digest]);
            }
            Sentry.captureException(error);
        });
    } catch (sentryError) {
        console.error('[Sentry] Failed to capture exception:', sentryError);
        console.error('[Original Error]', {
            message: error.message,
            digest: error.digest,
            url: window.location.href,
        });
    }
}, [error]);

    const handleRetry = async () => {
        setIsRetrying(true);
        try {
            Sentry.addBreadcrumb({
                category: 'user_action',
                message: 'User attempted to retry',
                level: 'info',
            });
            reset();
        } finally {
            setIsRetrying(false);
        }
    };

    const handleGoHome = () => {
        Sentry.addBreadcrumb({
            category: 'navigation',
            message: 'User navigated to home',
            level: 'info',
        });
        router.push('/');
    };

    const handleContactSupport = () => {
        Sentry.captureMessage('User requested support', {
            level: 'info',
            tags: { action: 'contact_support' },
        });

        const subject = encodeURIComponent(`Error Report - ${error.digest || '500'}`);
        const body = encodeURIComponent(
            `Error: ${error.message || 'Unknown error'}\n` +
            `Digest: ${error.digest || 'N/A'}\n` +
            `URL: ${window.location.href}\n` +
            `Time: ${new Date().toISOString()}\n\n` +
            `Please describe what you were doing:\n`
        );
        window.location.href = `mailto:${process.env.NEXT_PUBLIC_APP_MAIL}?subject=${subject}&body=${body}`;
    };

    const errorInfo = getErrorInfo(error);
    const supportEmail = process.env.NEXT_PUBLIC_APP_MAIL || 'support@example.com';

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-8">
            <div className="w-full max-w-lg">
                <div className="rounded-xl border bg-card p-8 shadow-sm">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 rounded-full bg-destructive/10 p-4">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-5xl font-bold tracking-tight">500</span>
                            <span className="rounded bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                Error
                            </span>
                        </div>

                        <h1 className="mt-4 text-xl font-semibold">{errorInfo.title}</h1>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm">
                            {errorInfo.description}
                        </p>

                        {error.digest && (
                            <p className="mt-2 text-xs text-muted-foreground/60 font-mono">
                                Ref: {error.digest.slice(0, 8)}
                            </p>
                        )}

                        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
                            <Button onClick={handleRetry} disabled={isRetrying} className="flex-1">
                                <RefreshCcw className={cn("mr-2 h-4 w-4", isRetrying && "animate-spin")} />
                                {isRetrying ? 'Retrying...' : 'Try Again'}
                            </Button>
                            <Button variant="outline" onClick={handleGoHome} className="flex-1">
                                <Home className="mr-2 h-4 w-4" />
                                Home
                            </Button>
                        </div>

                        <div className="relative my-6 w-full">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-card px-3 text-xs text-muted-foreground">
                                    Need help?
                                </span>
                            </div>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:flex-row">
                            <Button variant="outline" onClick={handleContactSupport} className="flex-1 gap-2">
                                <Mail className="h-4 w-4" />
                                <span>Email Support</span>
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => window.open('https://status.rankerly.app', '_blank')}
                                className="flex-1 gap-2"
                            >
                                <ExternalLink className="h-4 w-4" />
                                <span>Status</span>
                            </Button>
                        </div>

                        <p className="mt-3 text-xs text-muted-foreground/70">{supportEmail}</p>
                    </div>
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground/50">
                    We automatically track errors to improve your experience.
                </p>
            </div>
        </div>
    );
}