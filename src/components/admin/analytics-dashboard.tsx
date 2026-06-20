"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  MousePointerClick,
  RefreshCw,
  Globe,
  Monitor,
  Activity,
  Target,
  Eye,
  Flame,
  AlertTriangle,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BreakdownRow {
  label: string;
  sessions: number;
  users: number;
  countryCode?: string;
}

interface ChartRow {
  label: string;
  sessions: number;
  users: number;
}

interface AnalyticsTotals {
  sessions: number;
  users: number;
  botSessions: number;
  pagesPerSession: number;
  avgScrollDepth: number;
  activeTimePercent: number;
  deadClickPct: number;
  rageClickPct: number;
  quickbackPct: number;
}

interface AnalyticsData {
  totals: AnalyticsTotals;
  chartRows: ChartRow[];   // device breakdown for chart
  byCountry: BreakdownRow[];
  byDevice: BreakdownRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const countryCodeMap: Record<string, string> = {
  "United States": "US", USA: "US", "United Kingdom": "GB", UK: "GB",
  Canada: "CA", Australia: "AU", Germany: "DE", France: "FR",
  Japan: "JP", China: "CN", India: "IN", Brazil: "BR",
  Mexico: "MX", Spain: "ES", Italy: "IT", Netherlands: "NL",
  Sweden: "SE", Norway: "NO", Denmark: "DK", Finland: "FI",
  Poland: "PL", Russia: "RU", "South Korea": "KR", Singapore: "SG",
  "South Africa": "ZA", Israel: "IL", Turkey: "TR", UAE: "AE",
  "Saudi Arabia": "SA", Egypt: "EG", Nigeria: "NG", Kenya: "KE",
};

const flagEmojis: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪", FR: "🇫🇷",
  JP: "🇯🇵", CN: "🇨🇳", IN: "🇮🇳", BR: "🇧🇷", MX: "🇲🇽", ES: "🇪🇸",
  IT: "🇮🇹", NL: "🇳🇱", SE: "🇸🇪", NO: "🇳🇴", DK: "🇩🇰", FI: "🇫🇮",
  PL: "🇵🇱", RU: "🇷🇺", KR: "🇰🇷", SG: "🇸🇬", ZA: "🇿🇦", IL: "🇮🇱",
  TR: "🇹🇷", AE: "🇦🇪", SA: "🇸🇦", EG: "🇪🇬", NG: "🇳🇬", KE: "🇰🇪",
};

function getCountryCode(name: string): string {
  return countryCodeMap[name] ?? "UN";
}

function getDeviceIcon(device: string): string {
  const d = device.toLowerCase();
  if (d.includes("mobile") || d.includes("phone")) return "📱";
  if (d.includes("tablet") || d.includes("ipad")) return "📟";
  if (d === "pc" || d.includes("desktop") || d.includes("laptop")) return "💻";
  return "🖥️";
}

const safeNumber = (value: unknown, def = 0): number => {
  const n = Number(value);
  return isNaN(n) ? def : n;
};

const safeString = (value: unknown, def = "Unknown"): string =>
  value == null ? def : String(value);

/**
 * Extract rows from a Clarity metric array.
 * dimensionKey: the field name on each row that holds the label (e.g. "Country", "Device")
 * We use distinctUserCount as the user metric and totalSessionCount as sessions.
 * NOTE: Clarity returns these as strings — safeNumber handles that.
 */
function extractBreakdown(
  metricArray: unknown,
  dimensionKey: string,
  isCountry = false
): BreakdownRow[] {
  if (!Array.isArray(metricArray)) return [];

  const trafficMetric = metricArray.find(
    (m: unknown) => (m as any)?.metricName === "Traffic"
  ) as any;

  const rows: any[] = trafficMetric?.information ?? [];

  return rows
    .map((row) => ({
      label: safeString((row as any)?.[dimensionKey]),
      sessions: safeNumber((row as any)?.totalSessionCount),
      users: safeNumber((row as any)?.distinctUserCount),
      countryCode: isCountry
        ? getCountryCode(safeString((row as any)?.[dimensionKey]))
        : undefined,
    }))
    // Include rows with either sessions or users > 0
    .filter((r) => r.sessions > 0 || r.users > 0)
    .sort((a, b) => b.users - a.users || b.sessions - a.sessions)
    .slice(0, 6);
}

function parseClarity(response: unknown): AnalyticsData | null {
  if (!response || typeof response !== "object") return null;
  const raw = response as Record<string, unknown>;

  const findMetric = (arr: unknown, name: string): any => {
    if (!Array.isArray(arr)) return null;
    return arr.find((m: unknown) => (m as any)?.metricName === name) ?? null;
  };

  // ── Totals from traffic (browser) dimension ────────────────────────────────
  const trafficRows: any[] =
    findMetric(raw.traffic, "Traffic")?.information ?? [];

  let sessions = 0, users = 0, bots = 0, ppsSum = 0;
  for (const r of trafficRows) {
    sessions += safeNumber(r?.totalSessionCount);
    users += safeNumber(r?.distinctUserCount);
    bots += safeNumber(r?.totalBotSessionCount);
    ppsSum += safeNumber(r?.pagesPerSessionPercentage);
  }

  // Engagement time
  const engRows: any[] =
    findMetric(raw.traffic, "EngagementTime")?.information ?? [];
  let totalTime = 0, activeTime = 0;
  for (const r of engRows) {
    totalTime += safeNumber(r?.totalTime);
    activeTime += safeNumber(r?.activeTime);
  }

  // Scroll depth
  const scrollRows: any[] =
    findMetric(raw.traffic, "ScrollDepth")?.information ?? [];
  const avgScroll =
    scrollRows.length > 0
      ? scrollRows.reduce((s, r) => s + safeNumber(r?.averageScrollDepth), 0) /
      scrollRows.length
      : 0;

  const rowCount = Math.max(1, trafficRows.length);

  // UX signals — percentage of sessions with the event
  const deadClickPct = safeNumber(
    findMetric(raw.traffic, "DeadClickCount")?.information?.[0]
      ?.sessionsWithMetricPercentage
  );
  const rageClickPct = safeNumber(
    findMetric(raw.traffic, "RageClickCount")?.information?.[0]
      ?.sessionsWithMetricPercentage
  );
  const quickbackPct = safeNumber(
    findMetric(raw.traffic, "QuickbackClick")?.information?.[0]
      ?.sessionsWithMetricPercentage
  );

  // ── Breakdowns ─────────────────────────────────────────────────────────────
  const byCountry = extractBreakdown(raw.byCountry, "Country", true);
  const byDevice = extractBreakdown(raw.byDevice, "Device", false);

  // Use byDevice for the chart (it has labeled rows); fall back to byCountry
  const chartSource = byDevice.length ? byDevice : byCountry;
  const chartRows: ChartRow[] = chartSource.map((r) => ({
    label: r.label,
    sessions: r.sessions,
    users: r.users,
  }));

  // If totals are still 0 (all sessions are "0"), aggregate from byCountry/byDevice
  if (users === 0) {
    const allCountryRows: any[] =
      findMetric(raw.byCountry, "Traffic")?.information ?? [];
    for (const r of allCountryRows) {
      users += safeNumber(r?.distinctUserCount);
      sessions += safeNumber(r?.totalSessionCount);
    }
  }

  return {
    totals: {
      sessions,
      users,
      botSessions: bots,
      pagesPerSession: ppsSum / rowCount,
      avgScrollDepth: avgScroll,
      activeTimePercent: totalTime > 0 ? (activeTime / totalTime) * 100 : 0,
      deadClickPct,
      rageClickPct,
      quickbackPct,
    },
    chartRows,
    byCountry,
    byDevice,
  };
}

function fmt(n: number): string {
  const v = safeNumber(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(Math.round(v));
}

function fmtPct(v: number): string {
  return `${safeNumber(v).toFixed(1)}%`;
}

// ── Chart colors (resolved from CSS vars at runtime) ──────────────────────────

const CHART_VAR_NAMES = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
] as const;

const CHART_FALLBACKS = [
  "oklch(0.35 0.215 262.9)",
  "oklch(0.55 0.215 262.9)",
  "oklch(0.75 0.18 262.9)",
  "oklch(0.9 0.15 262.9)",
  "oklch(0.99 0.11 262.9)",
];

function useChartColors(): string[] {
  const [colors, setColors] = useState<string[]>(CHART_FALLBACKS);
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setColors(
      CHART_VAR_NAMES.map(
        (v, i) => style.getPropertyValue(v).trim() || CHART_FALLBACKS[i]
      )
    );
  }, []);
  return colors;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="overflow-hidden transition-colors hover:bg-muted/30">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold tracking-tight">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Breakdown Chart ───────────────────────────────────────────────────────────

function BreakdownChart({
  rows,
  title,
  subtitle,
}: {
  rows: ChartRow[];
  title: string;
  subtitle: string;
}) {
  const chartColors = useChartColors();

  if (!rows.length) return null;

  const chartConfig = {
    sessions: {
      label: "Sessions",
      color: chartColors[0],
    },
    users: {
      label: "Users",
      color: chartColors[2],
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart
            accessibilityLayer
            data={rows}
            margin={{ top: 4, right: 4, left: -20 }}
            barCategoryGap="28%"
            barGap={4}
          >
            <CartesianGrid vertical={false} />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 12 }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={fmt}
              tick={{ fontSize: 12 }}
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {fmt(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />

            <Bar
              dataKey="sessions"
              fill="var(--color-sessions)"
              radius={[8, 8, 0, 0]}
              maxBarSize={48}
            />

            <Bar
              dataKey="users"
              fill="var(--color-users)"
              radius={[8, 8, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ── UX Signals ────────────────────────────────────────────────────────────────

function UXSignals({ data }: { data: AnalyticsTotals }) {
  const signals = [
    {
      label: "Dead clicks",
      value: data.deadClickPct,
      description: "Clicks with no result",
    },
    {
      label: "Rage clicks",
      value: data.rageClickPct,
      description: "Repeated rapid clicking",
    },
    {
      label: "Quick backs",
      value: data.quickbackPct,
      description: "Exit within 5 seconds",
    },
  ];

  const hasData = signals.some((s) => s.value > 0);
  if (!hasData) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>UX signals</CardTitle>
          <Badge variant="outline">Monitor</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Friction indicators</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {signals.map((s) => (
            <div key={s.label} className="space-y-1">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p
                className={`text-2xl font-bold tabular-nums ${s.value > 5 ? "text-destructive" : ""
                  }`}
              >
                {fmtPct(s.value)}
              </p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active engagement</span>
            <span className="font-medium tabular-nums">
              {fmtPct(data.activeTimePercent)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(data.activeTimePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Share of session time with active engagement
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Breakdown Card ────────────────────────────────────────────────────────────
function BreakdownCard({
  title,
  description,
  rows,
  icon: Icon,
  emptyMessage = "No data available",
  showFlags = false,
}: {
  title: string;
  description?: string;
  rows: BreakdownRow[];
  icon: React.ElementType;
  emptyMessage?: string;
  showFlags?: boolean;
}) {
  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.users), 1) : 1;

  return (
    <Card className="transition-colors hover:bg-muted/20">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        {!rows.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {rows.map((row) => (
              <div key={row.label} className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {showFlags ? (
                      <span className="text-base">
                        {flagEmojis[row.countryCode ?? ""] ?? "🌍"}
                      </span>
                    ) : (
                      <span className="text-base">
                        {getDeviceIcon(row.label)}
                      </span>
                    )}

                    <span className="truncate text-sm font-medium">
                      {row.label}
                    </span>
                  </div>

                  <span className="shrink-0 text-sm font-mono text-muted-foreground tabular-nums">
                    {fmt(row.users)}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: `${(row.users / max) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Refresh Timer ──────────────────────────────────────────────────────────────

const REFRESH_SECS = 5 * 60 * 60;

function RefreshTimer({
  lastFetch,
  onRefresh,
}: {
  lastFetch: Date | null;
  onRefresh: () => void;
}) {
  const [secs, setSecs] = useState(REFRESH_SECS);

  // Reset countdown whenever a fetch completes
  useEffect(() => {
    setSecs(REFRESH_SECS);
  }, [lastFetch]);

  useEffect(() => {
    const t = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          onRefresh();
          return REFRESH_SECS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onRefresh]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default select-none">
            <Timer className="h-3 w-3" />
            <span className="tabular-nums">
              {h}h {m}m {String(s).padStart(2, "0")}s
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">Auto-refreshes every 5 hours</p>
          {lastFetch && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastFetch.toLocaleTimeString()}
            </p>
          )}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-20 mb-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
      <div className="rounded-full bg-muted p-4">
        <Activity className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">No data yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Analytics will appear once users visit your site.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </Button>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(parseClarity(json));
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, REFRESH_SECS * 1000);
    return () => clearInterval(t);
  }, [fetchData]);

  if (loading) return <LoadingSkeleton />;

  const hasData =
    data &&
    (data.totals.users > 0 ||
      data.byCountry.length > 0 ||
      data.byDevice.length > 0);

  if (!hasData) return <EmptyState onRefresh={fetchData} />;

  const { totals, chartRows, byCountry, byDevice } = data!;

  const chartTitle = byDevice.length ? "Sessions by device" : "Sessions by country";
  const chartSubtitle = "Last 3 days";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last 3 days · real-time user behavior
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users" value={fmt(totals.users)} icon={Users} />
        <StatCard label="Sessions" value={fmt(totals.sessions)} icon={MousePointerClick} />
        <StatCard
          label="Pages / session"
          value={totals.pagesPerSession > 0 ? totals.pagesPerSession.toFixed(1) : "—"}
          icon={Eye}
        />
        <StatCard
          label="Avg. scroll depth"
          value={totals.avgScrollDepth > 0 ? `${Math.round(totals.avgScrollDepth)}%` : "—"}
          icon={Target}
        />
      </div>

      {/* Chart */}
      <BreakdownChart
        rows={chartRows}
        title={chartTitle}
        subtitle={chartSubtitle}
      />

      {/* UX Signals + Breakdowns */}
      <div className="flex flex-col lg:flex-row gap-4">

        <div className={`
    grid grid-cols-1 sm:grid-cols-2 gap-4
    ${!totals || Object.values(totals).every(v => v === 0) ? 'lg:w-full' : 'lg:w-2/3'}
  `}>
          <BreakdownCard
            title="Top countries"
            description="Users by geography"
            rows={byCountry}
            icon={Globe}
            emptyMessage="No country data"
            showFlags
          />
          <BreakdownCard
            title="Devices"
            description="Users by device type"
            rows={byDevice}
            icon={Monitor}
            emptyMessage="No device data"
          />
        </div>

        <div className={`
    ${!totals || Object.values(totals).every(v => v === 0) ? 'hidden' : 'lg:w-1/3'}
  `}>
          <UXSignals data={totals} />
        </div>

      </div>

      {/* Footer */}
      <div className="border-t pt-4 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <RefreshCcw className="h-3.5 w-3.5" />
          <span>
            Auto-refreshes every 5 hours
            {lastFetch && (
              <>
                {" · "}
                Last updated {lastFetch.toLocaleString()}
              </>
            )}
          </span>
        </div>
      </div>

    </div>
  );
}