'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Cell,
    RadialBarChart,
    RadialBar,
    PolarAngleAxis,
} from 'recharts';
import { Star, ThumbsUp, MessageSquare, Smile, Meh, Frown, Zap, Heart } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Review {
    reviewId: string;
    comment?: string;
    createTime: string;
    starRating: 'FIVE' | 'FOUR' | 'THREE' | 'TWO' | 'ONE';
    reviewReply?: { comment: string };
}

interface ReviewsAnalyticsProps {
    data: Review[] | { reviews: Review[] };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const starVal = (r: string) => ({ FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 }[r] ?? 0);

/**
 * Sentiment classification — star rating is the primary signal (reliable),
 * text keywords act as a secondary refinement within that tier.
 *
 * Star tiers:
 *   5★ → joy (strong positive) or satisfied (mild positive keywords absent)
 *   4★ → satisfied (positive) or neutral (no positive keywords)
 *   3★ → neutral, unless strong negative keywords push to frustrated
 *   2★ → frustrated, unless strong negative keywords push to angry
 *   1★ → angry
 *
 * This makes "Positive %" (joy + satisfied) accurately reflect star ratings.
 */
const EMOTION_DEFS = [
    {
        key: 'joy' as const,
        label: 'Joy',
        keywords: ['love', 'happy', 'amazing', 'wonderful', 'fantastic', 'excellent', 'best', 'awesome', 'incredible', 'outstanding', 'perfect'],
        color: '#10b981',
        trackColor: '#d1fae5',
        Icon: Heart,
        iconClass: 'text-emerald-500',
    },
    {
        key: 'satisfied' as const,
        label: 'Satisfied',
        keywords: ['good', 'great', 'nice', 'recommend', 'helpful', 'friendly', 'pleased', 'decent', 'enjoy', 'satisfied'],
        color: '#3b82f6',
        trackColor: '#dbeafe',
        Icon: ThumbsUp,
        iconClass: 'text-blue-500',
    },
    {
        key: 'neutral' as const,
        label: 'Neutral',
        keywords: ['okay', 'ok', 'average', 'normal', 'alright', 'expected', 'fine'],
        color: '#a1a1aa',
        trackColor: '#f4f4f5',
        Icon: Meh,
        iconClass: 'text-zinc-400',
    },
    {
        key: 'frustrated' as const,
        label: 'Frustrated',
        keywords: ['wait', 'slow', 'long', 'disappointing', 'nothing special', 'could be better', 'mediocre'],
        color: '#f59e0b',
        trackColor: '#fef3c7',
        Icon: Zap,
        iconClass: 'text-amber-500',
    },
    {
        key: 'angry' as const,
        label: 'Angry',
        keywords: ['terrible', 'worst', 'bad', 'poor', 'horrible', 'awful', 'rude', 'disgusting', 'never again', 'waste'],
        color: '#ef4444',
        trackColor: '#fee2e2',
        Icon: Frown,
        iconClass: 'text-red-500',
    },
] as const;

const RATING_COLORS: Record<number, string> = {
    5: '#10b981',
    4: '#84cc16',
    3: '#f59e0b',
    2: '#f97316',
    1: '#ef4444',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JOY_KEYWORDS = new Set(['love', 'amazing', 'wonderful', 'fantastic', 'excellent', 'awesome', 'incredible', 'outstanding', 'perfect', 'brilliant']);
const POSITIVE_KEYWORDS = new Set(['good', 'great', 'nice', 'recommend', 'helpful', 'friendly', 'pleased', 'enjoy', 'satisfied', 'happy', 'best', 'decent']);
const NEGATIVE_KEYWORDS = new Set(['wait', 'slow', 'disappointing', 'mediocre', 'nothing special', 'could be better']);
const ANGRY_KEYWORDS = new Set(['terrible', 'worst', 'bad', 'poor', 'horrible', 'awful', 'rude', 'disgusting', 'never again', 'waste']);

/**
 * Star-rating-aware classifier.
 * Stars are the ground truth; text keywords refine within that tier.
 */
function classifyEmotion(
    text: string,
    stars: number,
): typeof EMOTION_DEFS[number]['key'] {
    const words = text.toLowerCase().split(/\W+/);
    const hasJoy = words.some(w => JOY_KEYWORDS.has(w));
    const hasPositive = words.some(w => POSITIVE_KEYWORDS.has(w));
    const hasNegative = words.some(w => NEGATIVE_KEYWORDS.has(w));
    const hasAngry = words.some(w => ANGRY_KEYWORDS.has(w));

    if (stars >= 5) return hasJoy ? 'joy' : 'satisfied';
    if (stars === 4) return hasAngry ? 'frustrated' : hasPositive || hasJoy ? 'satisfied' : 'satisfied';
    if (stars === 3) return hasAngry ? 'frustrated' : hasNegative ? 'frustrated' : 'neutral';
    if (stars === 2) return hasAngry ? 'angry' : 'frustrated';
    // 1★
    return 'angry';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReviewsAnalytics({ data }: ReviewsAnalyticsProps) {
    const reviews = useMemo(
        () => (Array.isArray(data) ? data : (data?.reviews ?? [])),
        [data],
    );

    const stats = useMemo(() => {
        if (!reviews.length) return null;

        const total = reviews.length;
        let sum = 0;
        const rc: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let posC = 0, negC = 0, respC = 0, recentC = 0;
        const emoCount: Record<typeof EMOTION_DEFS[number]['key'], number> = {
            joy: 0, satisfied: 0, neutral: 0, frustrated: 0, angry: 0,
        };
        const monthCount: Record<string, number> = {};
        const ago = new Date();
        ago.setDate(ago.getDate() - 30);

        reviews.forEach(r => {
            const v = starVal(r.starRating);
            sum += v;
            rc[v]++;
            if (r.reviewReply?.comment) respC++;
            if (new Date(r.createTime) > ago) recentC++;

            const mon = r.createTime.slice(0, 7);
            monthCount[mon] = (monthCount[mon] || 0) + 1;

            const txt = r.comment || '';
            const emotion = classifyEmotion(txt, v);
            emoCount[emotion]++;

            if (emotion === 'joy' || emotion === 'satisfied') posC++;
            else if (emotion === 'angry' || emotion === 'frustrated') negC++;
        });

        const avg = sum / total;
        const posP = Math.round((posC / total) * 100);
        const respP = Math.round((respC / total) * 100);
        // Health score: avg rating (0–40) + positivity (0–40) + response rate (0–20)
        const healthScore = Math.min(
            100,
            Math.round(((avg / 5) * 40) + (posP * 0.4) + ((respP / 100) * 20)),
        );

        return { total, avg, rc, posP, negP: Math.round((negC / total) * 100), respP, recentC, emoCount, monthCount, healthScore };
    }, [reviews]);

    if (!stats) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    No reviews yet
                </CardContent>
            </Card>
        );
    }

    const { total, avg, rc, posP, respP, recentC, emoCount, monthCount, healthScore } = stats;

    // ── Monthly chart data ──
    const monthKeys = Object.keys(monthCount).sort();
    let lastYear = '';
    const monthlyData = monthKeys.map(m => {
        const [y, mo] = m.split('-');
        const monthName = new Date(+y, +mo - 1).toLocaleString('default', { month: 'short' });
        let label: string;
        if (y !== lastYear) { lastYear = y; label = `${monthName} '${y.slice(2)}`; }
        else label = monthName;
        return { label, fullLabel: new Date(+y, +mo - 1).toLocaleString('default', { month: 'long', year: 'numeric' }), count: monthCount[m] };
    });

    // ── Rating dist data ──
    const ratingData = [5, 4, 3, 2, 1].map(n => ({
        star: `${n}★`,
        count: rc[n],
        pct: total ? Math.round((rc[n] / total) * 100) : 0,
        color: RATING_COLORS[n],
    }));

    // ── Health radial data ──
    const healthPct = healthScore; // already 0–100
    const radialData = [{ name: 'health', value: healthPct, fill: '#10b981' }];

    // ── Health breakdown bars ──
    const avgRatingScore = Math.round((avg / 5) * 40);
    const positivityScore = Math.round(posP * 0.4);
    const responseScore = Math.round((respP / 100) * 20);

    return (
        <div className="space-y-3 mb-4">

            {/* ── Top KPIs ── */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    {
                        label: 'Avg rating',
                        value: avg.toFixed(1),
                        sub: (
                            <div className="flex gap-0.5 mt-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Star key={i} className={`w-3 h-3 ${i <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                                ))}
                            </div>
                        ),
                        icon: <Star className="w-4 h-4 text-amber-400" />,
                    },
                    {
                        label: 'Total reviews',
                        value: total,
                        sub: <span className="text-xs text-muted-foreground">{recentC} last 30d</span>,
                        icon: <MessageSquare className="w-4 h-4 text-blue-500" />,
                    },
                    {
                        label: 'Positive',
                        value: `${posP}%`,
                        sub: <span className="text-xs text-muted-foreground">sentiment</span>,
                        icon: <Smile className="w-4 h-4 text-emerald-500" />,
                    },
                    {
                        label: 'Response rate',
                        value: `${respP}%`,
                        sub: <span className="text-xs text-muted-foreground">owner replies</span>,
                        icon: <ThumbsUp className="w-4 h-4 text-purple-500" />,
                    },
                ].map(({ label, value, sub, icon }) => (
                    <Card key={label}>
                        <CardContent>
                            <div className="flex items-start justify-between mb-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
                                {icon}
                            </div>
                            <div className="text-2xl font-semibold">{value}</div>
                            <div>{sub}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Middle row ── */}
            <div className="grid grid-cols-2 gap-3">


                {/* Right column */}
                <div className="space-y-3">

                    {/* Rating distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Rating distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer
                                config={{
                                    count: { label: 'Reviews' },
                                }}
                                className="h-[120px] w-full"
                            >
                                <BarChart
                                    data={ratingData}
                                    layout="vertical"
                                    margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
                                    barCategoryGap="20%"
                                >
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="star"
                                        width={24}
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value) => [`${value} reviews`, '']}
                                                hideLabel
                                            />
                                        }
                                    />
                                    <Bar dataKey="count" radius={3} label={{ position: 'right', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}>
                                        {ratingData.map((entry) => (
                                            <Cell key={entry.star} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                </div>
                <div className="space-y-3">

                    {/* Sentiment health */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Sentiment health
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-4">
                            <div className="flex items-center gap-4">
                                {/* Radial gauge */}
                                <div className="relative flex-shrink-0 w-[72px] h-[72px]">
                                    <ChartContainer
                                        config={{ health: { label: 'Score', color: '#10b981' } }}
                                        className="w-[72px] h-[72px]"
                                    >
                                        <RadialBarChart
                                            width={72}
                                            height={72}
                                            data={radialData}
                                            innerRadius={28}
                                            outerRadius={36}
                                            startAngle={90}
                                            endAngle={-270}
                                            barSize={8}
                                        >
                                            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                            <RadialBar dataKey="value" background={{ fill: 'hsl(var(--muted))' }} cornerRadius={4} />
                                        </RadialBarChart>
                                    </ChartContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-lg font-semibold leading-none">{healthScore}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">score</span>
                                    </div>
                                </div>

                                {/* Sub-bars */}
                                <div className="flex-1 space-y-2">
                                    {[
                                        { label: 'Avg rating', val: avgRatingScore, max: 40, color: '#3b82f6' },
                                        { label: 'Positivity', val: positivityScore, max: 40, color: '#10b981' },
                                        { label: 'Responses', val: responseScore, max: 20, color: '#a855f7' },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{item.label}</span>
                                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.round((item.val / item.max) * 100)}%`,
                                                        backgroundColor: item.color,
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground w-10 text-right">
                                                {item.val}/{item.max}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Monthly volume ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Monthly review volume
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                    <ChartContainer
                        config={{
                            count: { label: 'Reviews', color: '#3b82f6' },
                        }}
                        className="h-28 w-full"
                    >
                        <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%">
                            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="" strokeOpacity={0.5} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        labelKey="fullLabel"
                                        formatter={(value) => [`${value} reviews`, '']}
                                        hideLabel={false}
                                    />
                                }
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

        </div>
    );
}