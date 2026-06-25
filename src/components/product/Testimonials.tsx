"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
    name: string;
    role?: string;
    quote: string;
    rating: number;
    avatarColor?: string;
    source?: "google" | "default";
}

interface TestimonialsProps {
    title?: string;
    items: Testimonial[];
}

function TestimonialCard({ t }: { t: Testimonial }) {
    const [expanded, setExpanded] = useState(false);

    const isLong = t.quote.length > 350;
    const displayText =
        expanded || !isLong
            ? t.quote
            : t.quote.slice(0, 350) + "...";

    return (
        <article className="group flex h-full flex-col rounded-3xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1 select-none">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
                        style={{
                            backgroundColor: t.avatarColor ?? "#6366f1",
                        }}
                    >
                        {t.name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")}
                    </div>

                    <div>
                        <h4 className="font-semibold text-foreground">
                            {t.name}
                        </h4>

                        {t.role && (
                            <p className="text-sm text-muted-foreground">
                                {t.role}
                            </p>
                        )}
                    </div>
                </div>

                {t.source === "google" && (
                    <svg
                        className="h-5 w-5 shrink-0 opacity-80"
                        viewBox="0 0 24 24"
                    >
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                )}
            </div>

            {/* Rating */}
            <div className="mt-5 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                        key={idx}
                        className={`h-4 w-4 ${
                            idx < t.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted"
                        }`}
                    />
                ))}
            </div>

            {/* Quote */}
            <div className="relative mt-5 flex-1">
                <Quote className="absolute -top-1 left-0 h-8 w-8 text-primary/10" />

                <p className="relative pl-1 text-[15px] leading-7 text-muted-foreground">
                    {displayText}
                </p>

                {isLong && (
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="mt-3 text-sm font-medium text-primary transition-colors hover:underline"
                    >
                        {expanded ? "Show less" : "Read full review"}
                    </button>
                )}
            </div>

         
        </article>
    );
}

export default function Testimonials({
    title = "Genuine experiences from real users",
    items,
}: TestimonialsProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: "start",
        loop: true,
        dragFree: true,
        containScroll: "trimSnaps",
    });

    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(true);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setCanScrollPrev(emblaApi.canScrollPrev());
        setCanScrollNext(emblaApi.canScrollNext());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
    }, [emblaApi, onSelect]);

    return (
        <section className="my-24">
            <div className="mb-10 flex items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                <div className="hidden gap-2 md:flex">
                    <button
                        onClick={() => emblaApi?.scrollPrev()}
                        disabled={!canScrollPrev}
                        className="flex h-9 w-9 items-center justify-center rounded-full border bg-card hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Previous"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => emblaApi?.scrollNext()}
                        disabled={!canScrollNext}
                        className="flex h-9 w-9 items-center justify-center rounded-full border bg-card hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Next"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="relative -mx-6 px-6">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />

                <div ref={emblaRef} className="overflow-hidden">
                    <div className="flex gap-5">
                        {items.map((t, i) => (
                            <div key={i} className="min-w-0 shrink-0 basis-[320px]">
                                <TestimonialCard t={t} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}