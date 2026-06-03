'use client';

import { AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="flex min-h-screen items-center justify-center bg-background px-4">
                    <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                            <AlertOctagon className="h-8 w-8 text-destructive" />
                        </div>

                        <h1 className="text-4xl font-bold">
                            Critical Error
                        </h1>

                        <p className="mt-3 text-muted-foreground">
                            Something went seriously wrong.
                        </p>

                        <Button
                            onClick={() => reset()}
                            className="mt-6 w-full"
                        >
                            Reload Application
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    );
}