'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorPage({
    error,
    reset,
}: ErrorPageProps) {
    console.error(error);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 rounded-full bg-destructive/10 p-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>

                    <h1 className="text-4xl font-bold">500</h1>

                    <p className="mt-2 text-lg font-medium">
                        Something went wrong
                    </p>

                    <p className="mt-2 text-sm text-muted-foreground">
                        An unexpected error occurred.
                    </p>

                    <Button
                        onClick={() => reset()}
                        className="mt-6 w-full"
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </div>
            </div>
        </div>
    );
}