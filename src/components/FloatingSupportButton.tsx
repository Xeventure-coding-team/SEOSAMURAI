"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, X, Headphones, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingSupportButton() {
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);

    // Delay the button appearance slightly on mount for a smooth entry
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 400);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            className={cn(
                "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 transition-all duration-500",
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
        >
            {/* Popover card */}
            <div
                className={cn(
                    "w-72 rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 overflow-hidden",
                    "transition-all duration-300 origin-bottom-right",
                    open
                        ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 scale-95 translate-y-2 pointer-events-none"
                )}
            >
                {/* Card header */}
                <div className="relative bg-primary px-5 py-4 overflow-hidden">
                    {/* Subtle radial glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_70%)]" />
                    <div className="relative flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                            <Headphones className="h-4.5 w-4.5 text-primary-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-primary-foreground">Support team</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <p className="text-[11px] text-primary-foreground/70">Online · typically replies in minutes</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card body */}
                <div className="px-5 py-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Having trouble or need help? Our team is here for you.
                    </p>

                    <Link
                        href="/app/contact-support"
                        onClick={() => setOpen(false)}
                        className={cn(
                            "mt-4 flex items-center justify-between w-full",
                            "rounded-xl border border-border bg-muted/50 hover:bg-muted",
                            "px-4 py-3 transition-colors group"
                        )}
                    >
                        <div className="flex items-center gap-2.5">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Contact support</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </Link>
                </div>
            </div>

            {/* FAB */}
            <button
                onClick={() => setOpen((p) => !p)}
                aria-label={open ? "Close support" : "Open support"}
                className={cn(
                    "relative h-14 w-14 rounded-2xl shadow-lg shadow-primary/25",
                    "bg-primary text-primary-foreground",
                    "flex items-center justify-center",
                    "transition-all duration-300 hover:scale-105 active:scale-95",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                )}
            >
                <span className="relative transition-transform duration-300">
                    {open
                        ? <X className="h-5 w-5" />
                        : <MessageCircle className="h-5 w-5" />
                    }
                </span>
            </button>
        </div>
    );
}