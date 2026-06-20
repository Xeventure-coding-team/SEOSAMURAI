'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, SearchX, ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
    const router = useRouter();

    return (
        <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4">
            {/* Background decorative elements */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
                </div>
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            </div>

            <div className="w-full max-w-lg space-y-10">
                {/* 404 Section */}
                <div className="relative flex flex-col items-center">
                    {/* Glow ring */}
                    <div className="absolute -top-10 h-40 w-40 rounded-full border border-primary/10 animate-pulse" />
                    <div className="absolute -top-6 h-32 w-32 rounded-full border border-primary/5 animate-pulse delay-150" />
                    
                    {/* Icon */}
                    <div className="relative mb-6">
                        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 backdrop-blur-sm ring-1 ring-primary/10">
                            <Compass className="h-14 w-14 text-primary" strokeWidth={1.5} />
                        </div>
                        <div className="absolute -right-2 -top-2 rounded-full bg-destructive/10 p-2 ring-1 ring-destructive/20">
                            <SearchX className="h-4 w-4 text-destructive" />
                        </div>
                    </div>

                    {/* 404 Number */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-9xl font-black tracking-tighter text-primary/5 select-none">
                                404
                            </span>
                        </div>
                        <h1 className="relative text-8xl font-black tracking-tighter bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
                            404
                        </h1>
                    </div>

                    {/* Decorative line */}
                    <div className="mt-4 flex items-center gap-3">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/20" />
                        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                            Lost in space
                        </span>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/20" />
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-3 text-center">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Page not found
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        The page you're looking for doesn't exist or has been moved. 
                        Let's get you back on track.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button asChild className="flex-1 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]">
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Back to home
                        </Link>
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        className="flex-1 transition-all hover:bg-muted/50 hover:scale-[1.02]"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go back
                    </Button>
                </div>

                {/* Quick links */}
                <div className="flex items-center justify-center gap-6 pt-4">
                    <Link 
                        href="/" 
                        className="text-xs text-muted-foreground/60 transition-colors hover:text-foreground hover:underline underline-offset-4"
                    >
                        Home
                    </Link>
                    <span className="h-3 w-px bg-border" />
                    <Link 
                        href="/support" 
                        className="text-xs text-muted-foreground/60 transition-colors hover:text-foreground hover:underline underline-offset-4"
                    >
                        Support
                    </Link>
                </div>
            </div>
        </div>
    );
}