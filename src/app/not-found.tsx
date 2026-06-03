import Link from 'next/link';
import { Home, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 rounded-full bg-muted p-4">
                        <SearchX className="h-10 w-10 text-muted-foreground" />
                    </div>

                    <h1 className="text-5xl font-bold tracking-tight">
                        404
                    </h1>

                    <p className="mt-3 text-xl font-semibold">
                        Page Not Found
                    </p>

                    <p className="mt-2 text-sm text-muted-foreground">
                        The page you are looking for does not exist.
                    </p>

                    <Button asChild className="mt-6 w-full">
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}