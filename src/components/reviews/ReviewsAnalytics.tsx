import React, { useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, MessageSquare, Clock, Smile, Meh, Frown, Zap, Heart } from 'lucide-react';

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

const starVal = (r: string) => ({ FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 }[r] ?? 0);

const EMOTIONS = {
    joy: { label: 'Joy', keywords: ['love', 'happy', 'amazing', 'wonderful', 'fantastic', 'great', 'excellent', 'best', 'enjoy'], color: 'bg-emerald-500' },
    satisfied: { label: 'Satisfied', keywords: ['good', 'nice', 'recommend', 'helpful', 'friendly', 'pleased', 'decent', 'fine'], color: 'bg-blue-500' },
    neutral: { label: 'Neutral', keywords: ['okay', 'average', 'normal', 'alright', 'expected'], color: 'bg-zinc-400' },
    frustrated: { label: 'Frustrated', keywords: ['wait', 'slow', 'long', 'disappointed', 'nothing special'], color: 'bg-amber-500' },
    angry: { label: 'Angry', keywords: ['terrible', 'worst', 'bad', 'poor', 'horrible', 'awful', 'cold'], color: 'bg-red-500' },
} as const;

const EMOTION_ICONS = {
    joy: Heart,
    satisfied: ThumbsUp,
    neutral: Meh,
    frustrated: Zap,
    angry: Frown,
};

const TOPICS = [
    { label: 'Service', keywords: ['service', 'staff', 'friendly', 'helpful'], color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    { label: 'Food', keywords: ['food', 'meal', 'dish', 'taste', 'quality'], color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { label: 'Atmosphere', keywords: ['atmosphere', 'ambiance', 'place', 'location'], color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
    { label: 'Wait time', keywords: ['wait', 'slow', 'long', 'time'], color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    { label: 'Value', keywords: ['value', 'price', 'worth', 'expensive'], color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
    { label: 'Cleanliness', keywords: ['clean', 'dirty', 'hygiene'], color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
];

const RATING_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500'];

export function ReviewsAnalytics({ data }: ReviewsAnalyticsProps) {
    const donutRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const donutInstance = useRef<any>(null);
    const chartInstance = useRef<any>(null);

    const reviews = useMemo(() =>
        Array.isArray(data) ? data : (data?.reviews ?? []), [data]);

    const stats = useMemo(() => {
        if (!reviews.length) return null;
        const total = reviews.length;
        let sum = 0;
        const rc: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let posC = 0, negC = 0, respC = 0, recentC = 0;
        const emoCount: Record<string, number> = { joy: 0, satisfied: 0, neutral: 0, frustrated: 0, angry: 0 };
        const topicCount: Record<string, number> = {};
        TOPICS.forEach(t => topicCount[t.label] = 0);
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
            const txt = (r.comment || '').toLowerCase();
            TOPICS.forEach(t => { if (t.keywords.some(k => txt.includes(k))) topicCount[t.label]++; });

            let matched = false;
            for (const [key, em] of Object.entries(EMOTIONS)) {
                if (em.keywords.some(k => txt.includes(k))) { emoCount[key]++; matched = true; break; }
            }
            if (!matched) emoCount.neutral++;

            const pPos = [...EMOTIONS.joy.keywords, ...EMOTIONS.satisfied.keywords];
            const pNeg = [...EMOTIONS.angry.keywords, ...EMOTIONS.frustrated.keywords];
            let s = 0;
            pPos.forEach(w => { if (txt.includes(w)) s++; });
            pNeg.forEach(w => { if (txt.includes(w)) s--; });
            if (s > 0) posC++; else if (s < 0) negC++;
        });

        const avg = sum / total;
        const posP = Math.round((posC / total) * 100);
        const respP = Math.round((respC / total) * 100);
        const healthScore = Math.round(((avg / 5) * 40) + (posP * 0.4) + ((respP / 100) * 20));

        return { total, avg, rc, posP, respP, recentC, emoCount, topicCount, monthCount, healthScore };
    }, [reviews]);

    useEffect(() => {
        if (!stats || !donutRef.current || !chartRef.current) return;
        const load = async () => {
            if (!(window as any).Chart) {
                await new Promise<void>(res => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
                    s.onload = () => res();
                    document.head.appendChild(s);
                });
            }
            const Chart = (window as any).Chart;
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
            const tickColor = isDark ? '#888780' : '#5F5E5A';

            if (donutInstance.current) donutInstance.current.destroy();
            donutInstance.current = new Chart(donutRef.current, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [stats.healthScore, 100 - stats.healthScore],
                        backgroundColor: ['#10b981', isDark ? '#3f3f46' : '#e4e4e7'],
                        borderWidth: 0,
                        borderRadius: 4,
                    }],
                },
                options: {
                    cutout: '74%',
                    responsive: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                },
            });

            const months = Object.keys(stats.monthCount).sort();
            const monthLabels = months.map(m => {
                const [y, mo] = m.split('-');
                return new Date(+y, +mo - 1).toLocaleString('default', { month: 'short' });
            });

            if (chartInstance.current) chartInstance.current.destroy();
            chartInstance.current = new Chart(chartRef.current, {
                type: 'bar',
                data: {
                    labels: monthLabels,
                    datasets: [{
                        data: months.map(m => stats.monthCount[m]),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4,
                        borderSkipped: false,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => `${c.raw} reviews` } } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: tickColor } },
                        y: { grid: { color: gridColor }, ticks: { stepSize: 1, font: { size: 11 }, color: tickColor }, border: { display: false } },
                    },
                },
            });
        };
        load();
        return () => {
            donutInstance.current?.destroy();
            chartInstance.current?.destroy();
        };
    }, [stats]);

    if (!stats) return (
        <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No reviews yet</CardContent>
        </Card>
    );

    const { total, avg, rc, posP, respP, recentC, emoCount, topicCount, monthCount, healthScore } = stats;
    const maxEmo = Math.max(...Object.values(emoCount));

    return (
        <div className="space-y-3 mb-4">

            {/* Top metrics */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    {
                        label: 'Avg rating', value: avg.toFixed(1),
                        sub: <div className="flex gap-0.5 mt-1">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3 h-3 ${i <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />)}</div>,
                        icon: <Star className="w-4 h-4 text-amber-400" />,
                    },
                    { label: 'Total reviews', value: total, sub: <span className="text-xs text-muted-foreground">{recentC} last 30d</span>, icon: <MessageSquare className="w-4 h-4 text-blue-500" /> },
                    { label: 'Positive', value: `${posP}%`, sub: <span className="text-xs text-muted-foreground">sentiment</span>, icon: <Smile className="w-4 h-4 text-emerald-500" /> },
                    { label: 'Response rate', value: `${respP}%`, sub: <span className="text-xs text-muted-foreground">owner replies</span>, icon: <ThumbsUp className="w-4 h-4 text-purple-500" /> },
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

            {/* Middle row */}
            <div className="grid grid-cols-2 gap-3">

                {/* Emotional breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Emotional breakdown
                        </CardTitle>
                    </CardHeader>
 <CardContent className="space-y-3">
  {(Object.entries(EMOTIONS) as [
    keyof typeof EMOTIONS,
    typeof EMOTIONS[keyof typeof EMOTIONS]
  ][]).map(([key, em]) => {
    const Icon = EMOTION_ICONS[key];
    const count = emoCount[key];
    const pct = maxEmo ? Math.round((count / maxEmo) * 100) : 0;

    const iconColor =
      key === "joy"
        ? "text-emerald-500"
        : key === "satisfied"
        ? "text-blue-500"
        : key === "neutral"
        ? "text-zinc-400"
        : key === "frustrated"
        ? "text-amber-500"
        : "text-red-500";

    return (
      <div key={key} className="flex items-center gap-3">
        <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />

        <span className="w-24 text-sm font-medium">
          {em.label}
        </span>

        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${em.color}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{count}</span>
          <span className="w-8 text-right">{pct}%</span>
        </div>
      </div>
    );
  })}
</CardContent>
                </Card>

                {/* Right column: rating dist + health score */}
                <div className="space-y-3">

                    {/* Rating distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Rating distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {[5, 4, 3, 2, 1].map(n => {
                                const count = rc[n];
                                const pct = total ? Math.round((count / total) * 100) : 0;
                                return (
                                    <div key={n} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-5 text-right">{n}★</span>
                                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                            <div className={`h-full rounded-full ${RATING_COLORS[n]}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Health score */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Sentiment health</CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="relative w-[72px] h-[72px] flex-shrink-0">
                                    <canvas ref={donutRef} width={72} height={72} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-lg font-semibold leading-none">{healthScore}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">score</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    {[
                                        { label: 'Avg rating', val: Math.round((avg / 5) * 40), max: 40, color: 'bg-blue-500' },
                                        { label: 'Positivity', val: Math.round(posP * 0.4), max: 40, color: 'bg-emerald-500' },
                                        { label: 'Responses', val: Math.round((respP / 100) * 20), max: 20, color: 'bg-purple-500' },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{item.label}</span>
                                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.round((item.val / item.max) * 100)}%` }} />
                                            </div>
                                            <span className="text-xs text-muted-foreground w-8 text-right">{item.val}/{item.max}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>



            {/* Monthly volume */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Monthly review volume</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                    <div className="relative w-full h-28">
                        <canvas ref={chartRef} />
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}