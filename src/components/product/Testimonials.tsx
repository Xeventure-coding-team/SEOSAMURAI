"use client";

import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { FreeMode, Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";

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
    subtitle?: string;
    items: Testimonial[];
}

function TestimonialCard({ t }: { t: Testimonial }) {
    const [expanded, setExpanded] = useState(false);

    const isLong = t.quote.length > 320;
    const displayText =
        expanded || !isLong ? t.quote : t.quote.slice(0, 320).trimEnd() + "…";

    return (
        <article className="group relative flex h-full flex-col rounded-2xl border border-border/50 bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 select-none">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white ring-4 ring-black/[0.03]"
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

                    <div className="min-w-0">
                        <h4 className="truncate text-[15px] font-semibold leading-tight text-foreground">
                            {t.name}
                        </h4>
                        {t.role && (
                            <p className="truncate text-[13px] leading-tight text-muted-foreground">
                                {t.role}
                            </p>
                        )}
                    </div>
                </div>

                {t.source === "google" && (
                    <svg
                        className="h-[18px] w-[18px] shrink-0 opacity-90"
                        viewBox="0 0 24 24"
                        aria-label="Google review"
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
            <div className="mt-4 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                        key={idx}
                        strokeWidth={0}
                        className={`h-[15px] w-[15px] ${
                            idx < t.rating ? "fill-amber-400" : "fill-muted"
                        }`}
                    />
                ))}
            </div>

            {/* Quote */}
            <div className="relative mt-4 flex-1">
                <Quote
                    strokeWidth={0}
                    className="absolute -top-1 -left-1 h-7 w-7 fill-primary/[0.06]"
                />
                <p className="relative text-[14.5px] leading-[1.7] text-muted-foreground">
                    {displayText}
                </p>

                {isLong && (
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="mt-2.5 text-[13px] font-medium text-foreground/80 underline-offset-2 transition-colors hover:text-primary hover:underline"
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
    subtitle,
    items,
}: TestimonialsProps) {
    const swiperRef = useRef<SwiperType | null>(null);

    return (
        <section>
            <div className="mb-10 flex items-end justify-between gap-6">
                <div>
                    <h2 className="text-[28px] font-bold tracking-tight text-foreground sm:text-3xl">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>

            
            </div>

            <Swiper
                modules={[FreeMode, Navigation]}
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                loop
                loopAddBlankSlides={false}
                freeMode={{ enabled: true, sticky: false }}
                grabCursor
                spaceBetween={20}
                slidesPerView={1.15}
                breakpoints={{
                    640: { slidesPerView: 2.1 },
                    1024: { slidesPerView: 3.1 },
                    1280: { slidesPerView: 4 },
                }}
                className="!overflow-hidden !py-2"
            >
                {items.map((t, i) => (
                    <SwiperSlide key={i} className="!h-auto">
                        <TestimonialCard t={t} />
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Mobile nav (shown under cards on small screens) */}
            <div className="mt-6 flex justify-center gap-2 md:hidden">
                <button
                    onClick={() => swiperRef.current?.slidePrev()}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70"
                    aria-label="Previous"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    onClick={() => swiperRef.current?.slideNext()}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70"
                    aria-label="Next"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </section>
    );
}