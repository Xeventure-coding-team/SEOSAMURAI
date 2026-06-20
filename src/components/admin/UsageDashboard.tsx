'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';
import {
  CalendarIcon,
  DownloadIcon,
  TrendingUpIcon,
  UsersIcon,
  ActivityIcon,
  BarChartIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrownIcon,
  MedalIcon,
  MailIcon,
  CalendarRangeIcon,
  SparklesIcon,
  ZapIcon,
  LayersIcon,
  ClockIcon,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '../ui/progress';

// ─── Types ────────────────────────────────────────────────────────────────────

type UsageMetricKey =
  | 'postsUsed'
  | 'aiPostersUsed'
  | 'aiReviewRepliesUsed'
  | 'scheduledPostsUsed'
  | 'geoGridScansUsed'
  | 'reviewPostersUsed'
  | 'keywordTrackingUsed'
  | 'aiImageUsed';

interface UsageMetric {
  postsUsed: number;
  aiPostersUsed: number;
  aiReviewRepliesUsed: number;
  scheduledPostsUsed: number;
  geoGridScansUsed: number;
  reviewPostersUsed: number;
  keywordTrackingUsed: number;
  aiImageUsed: number;
}

interface UserWiseRecord {
  stackUserId: string;
  subscriptionIds: string[];
  totalUsage: UsageMetric;
  totalOperations: number;
  latestPeriodStart: string;
  latestPeriodEnd: string;
  lastUpdated: string;
  displayName: string | null;
  email: string | null;
  profileImage: string | null;
}

interface DateWiseData {
  date: string;
  totalUsers: number;
  totalOperations: number;
  metrics: UsageMetric;
}

interface TopUsageItem {
  stackUserId: string;
  subscriptionId: string;
  usageCount: number;
  displayName: string | null;
  email: string | null;
  profileImage: string | null;
  periodStart: string;
  periodEnd: string;
}

interface TopUsageData {
  metric: string;
  data: TopUsageItem[];
  limit: number;
}

interface SummaryData {
  period: { startDate: string; endDate: string };
  summary: {
    totalUsers: number;
    postsUsed: number;
    aiPostersUsed: number;
    aiReviewRepliesUsed: number;
    scheduledPostsUsed: number;
    geoGridScansUsed: number;
    reviewPostersUsed: number;
    keywordTrackingUsed: number;
    aiImageUsed: number;
  };
  averagePerUser: Record<string, number>;
}

interface TrendData {
  month: string;
  totalOperations: number;
  activeUsers: number;
  metrics: UsageMetric;
}

interface GrowthRate {
  operationsGrowth: string;
  usersGrowth: string | null;
  period: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<UsageMetricKey, string> = {
  postsUsed: 'Posts Used',
  aiPostersUsed: 'AI Posters Used',
  aiReviewRepliesUsed: 'AI Review Replies',
  scheduledPostsUsed: 'Scheduled Posts',
  geoGridScansUsed: 'Geo Grid Scans',
  reviewPostersUsed: 'Review Posters',
  keywordTrackingUsed: 'Keyword Tracking',
  aiImageUsed: 'AI Images',
};

// ─── Helper Components ─────────────────────────────────────────────────────────

const MessageSquareIcon = (props: any) => <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const StarIcon = (props: any) => <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
const SearchIcon = (props: any) => <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="10" cy="10" r="7" /><path d="M21 21l-6-6" /></svg>;
const ImageIcon = (props: any) => <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2" /><circle cx="8.5" cy="8.5" r="2.5" /><path d="M21 15l-5-4-3 3-4-4-5 5" /></svg>;


const METRIC_ICONS: Record<UsageMetricKey, React.ReactNode> = {
  postsUsed: <ZapIcon className="h-4 w-4" />,
  aiPostersUsed: <SparklesIcon className="h-4 w-4" />,
  aiReviewRepliesUsed: <MessageSquareIcon className="h-4 w-4" />,
  scheduledPostsUsed: <ClockIcon className="h-4 w-4" />,
  geoGridScansUsed: <LayersIcon className="h-4 w-4" />,
  reviewPostersUsed: <StarIcon className="h-4 w-4" />,
  keywordTrackingUsed: <SearchIcon className="h-4 w-4" />,
  aiImageUsed: <ImageIcon className="h-4 w-4" />,
};

const SUMMARY_METRIC_LABELS: Record<string, string> = {
  postsUsed: 'Posts',
  aiPostersUsed: 'AI Posters',
  aiReviewRepliesUsed: 'AI Reviews',
  scheduledPostsUsed: 'Scheduled',
  geoGridScansUsed: 'Geo Scans',
  reviewPostersUsed: 'Review Posters',
  keywordTrackingUsed: 'Keywords',
  aiImageUsed: 'AI Images',
};

// ─── Chart Configurations ─────────────────────────────────────────────────────

// Pie chart config
const pieChartConfig = {
  postsUsed: { label: 'Posts', color: 'var(--chart-1)' },
  aiPostersUsed: { label: 'AI Posters', color: 'var(--chart-2)' },
  aiReviewRepliesUsed: { label: 'AI Reviews', color: 'var(--chart-3)' },
  scheduledPostsUsed: { label: 'Scheduled', color: 'var(--chart-4)' },
  geoGridScansUsed: { label: 'Geo Scans', color: 'var(--chart-5)' },
  reviewPostersUsed: { label: 'Review Posters', color: 'var(--chart-1)' },
  keywordTrackingUsed: { label: 'Keywords', color: 'var(--chart-2)' },
  aiImageUsed: { label: 'AI Images', color: 'var(--chart-3)' },
} satisfies ChartConfig;

// Bar chart config
const barChartConfig = {
  value: { label: 'Usage Count', color: 'var(--chart-1)' },
} satisfies ChartConfig;

// Date wise line chart config
const dateWiseChartConfig = {
  operations: { label: 'Operations', color: 'var(--chart-1)' },
  users: { label: 'Active Users', color: 'var(--chart-2)' },
} satisfies ChartConfig;

// Trends chart config
const trendsChartConfig = {
  totalOperations: { label: 'Total Operations', color: 'var(--chart-1)' },
  activeUsers: { label: 'Active Users', color: 'var(--chart-2)' },
} satisfies ChartConfig;

// Feature trends chart config
const featureTrendsChartConfig = {
  postsUsed: { label: 'Posts', color: 'var(--chart-1)' },
  aiPostersUsed: { label: 'AI Posters', color: 'var(--chart-2)' },
  aiReviewRepliesUsed: { label: 'AI Reviews', color: 'var(--chart-3)' },
  scheduledPostsUsed: { label: 'Scheduled', color: 'var(--chart-4)' },
} satisfies ChartConfig;


function getUserInitials(name: string | null, email: string | null): string {
  if (name && name !== 'N/A') {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'U';
}

function formatDateParam(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function shortId(id: string) {
  return `${id.slice(0, 8)}…`;
}

function growthColor(value: string | null) {
  if (value === null) return 'text-muted-foreground';
  return parseFloat(value) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Loading Skeleton Components
const OverviewSkeleton = () => (
  <>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardHeader><div className="h-5 w-32 bg-muted animate-pulse rounded" /><div className="h-3 w-48 bg-muted animate-pulse rounded mt-1" /></CardHeader><CardContent><div className="h-[360px] w-full bg-muted/20 animate-pulse rounded" /></CardContent></Card>
      <Card><CardHeader><div className="h-5 w-32 bg-muted animate-pulse rounded" /><div className="h-3 w-48 bg-muted animate-pulse rounded mt-1" /></CardHeader><CardContent><div className="h-[400px] w-full bg-muted/20 animate-pulse rounded" /></CardContent></Card>
    </div>
  </>
);

const UserWiseSkeleton = () => (
  <Card>
    <CardHeader><div className="h-5 w-40 bg-muted animate-pulse rounded" /><div className="h-3 w-64 bg-muted animate-pulse rounded mt-1" /></CardHeader>
    <CardContent>
      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>{[1, 2, 3, 4, 5, 6, 7].map(i => <TableHead key={i}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableHead>)}</TableRow></TableHeader>
          <TableBody>{[1, 2, 3, 4, 5].map(i => <TableRow key={i}><TableCell colSpan={7}><div className="h-16 w-full bg-muted/20 animate-pulse rounded" /></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

const DateWiseSkeleton = () => (
  <>
    <Card><CardHeader><div className="h-5 w-40 bg-muted animate-pulse rounded" /><div className="h-3 w-64 bg-muted animate-pulse rounded mt-1" /></CardHeader><CardContent><div className="h-[400px] w-full bg-muted/20 animate-pulse rounded" /></CardContent></Card>
    <Card><CardHeader><div className="h-5 w-32 bg-muted animate-pulse rounded" /><div className="h-3 w-48 bg-muted animate-pulse rounded mt-1" /></CardHeader><CardContent><div className="h-[300px] w-full bg-muted/20 animate-pulse rounded" /></CardContent></Card>
  </>
);

const TopUsageSkeleton = () => (
  <Card>
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <div><div className="h-5 w-40 bg-muted animate-pulse rounded" /><div className="h-3 w-64 bg-muted animate-pulse rounded mt-1" /></div>
        <div className="h-9 w-[180px] bg-muted animate-pulse rounded" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[72px] w-full bg-muted/20 animate-pulse rounded" />)}
    </CardContent>
  </Card>
);

const TrendsSkeleton = () => (
  <>
    <Card><CardHeader><div className="h-5 w-40 bg-muted animate-pulse rounded" /><div className="h-3 w-64 bg-muted animate-pulse rounded mt-1" /></CardHeader><CardContent><div className="h-[320px] w-full bg-muted/20 animate-pulse rounded" /></CardContent></Card>
    <Card><CardHeader><div className="h-5 w-40 bg-muted animate-pulse rounded" /><div className="h-3 w-64 bg-muted animate-pulse rounded mt-1" /></CardHeader><CardContent><div className="h-[320px] w-full bg-muted/20 animate-pulse rounded" /></CardContent></Card>
    <Card><CardHeader><div className="h-5 w-32 bg-muted animate-pulse rounded" /><div className="h-3 w-48 bg-muted animate-pulse rounded mt-1" /></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-2"><div className="h-24 w-full bg-muted/20 animate-pulse rounded" /><div className="h-24 w-full bg-muted/20 animate-pulse rounded" /></div></CardContent></Card>
  </>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function UsageDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(1)),
    to: new Date(),
  });
  const [selectedMetric, setSelectedMetric] = useState<UsageMetricKey>('postsUsed');

  const [userWiseData, setUserWiseData] = useState<UserWiseRecord[]>([]);
  const [dateWiseData, setDateWiseData] = useState<DateWiseData[]>([]);
  const [topUsageData, setTopUsageData] = useState<TopUsageData | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [growthRate, setGrowthRate] = useState<GrowthRate | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 10, total: 0, totalPages: 0,
  });

  const userWisePage = useRef(1);

  const fetchOverview = useCallback(async (from: Date, to: Date) => {
    const res = await fetch(
      `/api/admin/usage?type=summary&startDate=${formatDateParam(from)}&endDate=${formatDateParam(to)}`,
    );
    const data: SummaryData = await res.json();
    setSummaryData(data);
  }, []);

  const fetchUserWise = useCallback(async (from: Date, to: Date, page: number) => {
    const res = await fetch(
      `/api/admin/usage?type=user-wise&startDate=${formatDateParam(from)}&endDate=${formatDateParam(to)}&page=${page}&limit=10`,
    );
    const data = await res.json();
    setUserWiseData(Array.isArray(data.data) ? data.data : []);
    if (data.pagination) setPagination(data.pagination);
  }, []);

  const fetchDateWise = useCallback(async (from: Date, to: Date) => {
    const res = await fetch(
      `/api/admin/usage?type=date-wise&startDate=${formatDateParam(from)}&endDate=${formatDateParam(to)}`,
    );
    const data = await res.json();
    setDateWiseData(Array.isArray(data.data) ? data.data : []);
  }, []);

  const fetchTopUsage = useCallback(async (metric: UsageMetricKey) => {
    const res = await fetch(`/api/admin/usage?type=top-usage&metric=${metric}&limit=10`);
    const data = await res.json();
    setTopUsageData(data.data ? data : null);
  }, []);

  const fetchTrends = useCallback(async (from: Date, to: Date) => {
    const res = await fetch(
      `/api/admin/usage?type=trends&startDate=${formatDateParam(from)}&endDate=${formatDateParam(to)}`,
    );
    const data = await res.json();
    setTrendsData(Array.isArray(data.trends) ? data.trends : []);
    setGrowthRate(data.growthRate ?? null);
  }, []);

  const runFetch = useCallback(
    async (tab: string, from: Date, to: Date, metric: UsageMetricKey, page: number) => {
      setLoading(true);
      try {
        switch (tab) {
          case 'overview': await fetchOverview(from, to); break;
          case 'user-wise': await fetchUserWise(from, to, page); break;
          case 'date-wise': await fetchDateWise(from, to); break;
          case 'top-usage': await fetchTopUsage(metric); break;
          case 'trends': await fetchTrends(from, to); break;
        }
      } catch (err) {
        console.error('Usage fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [fetchOverview, fetchUserWise, fetchDateWise, fetchTopUsage, fetchTrends],
  );

  useEffect(() => {
    userWisePage.current = 1;
    runFetch(activeTab, dateRange.from, dateRange.to, selectedMetric, 1);
  }, [activeTab, dateRange.from, dateRange.to, selectedMetric, runFetch]);

  const handlePageChange = (newPage: number) => {
    userWisePage.current = newPage;
    runFetch('user-wise', dateRange.from, dateRange.to, selectedMetric, newPage);
  };

  // Prepare pie data with colors
  const pieData = summaryData
    ? Object.entries(summaryData.summary)
      .filter(([k]) => k !== 'totalUsers')
      .map(([key, value]) => ({
        name: SUMMARY_METRIC_LABELS[key] ?? key,
        value,
        key,
        fill: `var(--chart-${(['postsUsed', 'reviewPostersUsed'].includes(key) ? 1 :
          ['aiPostersUsed', 'keywordTrackingUsed'].includes(key) ? 2 :
            ['aiReviewRepliesUsed', 'aiImageUsed'].includes(key) ? 3 :
              ['scheduledPostsUsed'].includes(key) ? 4 :
                ['geoGridScansUsed'].includes(key) ? 5 : 1)})`
      }))
    : [];

  const barData = summaryData
    ? Object.entries(summaryData.summary)
      .filter(([k]) => k !== 'totalUsers')
      .map(([key, value]) => ({ name: SUMMARY_METRIC_LABELS[key] ?? key, value }))
    : [];

  const getTotalOperations = () =>
    summaryData
      ? Object.entries(summaryData.summary)
        .filter(([k]) => k !== 'totalUsers')
        .reduce((s, [, v]) => s + v, 0)
      : 0;

  const getMostUsedFeature = () => {
    if (!summaryData) return 'N/A';
    const [key] =
      Object.entries(summaryData.summary)
        .filter(([k]) => k !== 'totalUsers')
        .sort(([, a], [, b]) => b - a)[0] ?? [];
    return key ? (SUMMARY_METRIC_LABELS[key] ?? key) : 'N/A';
  };

  const dateChartData = dateWiseData.map((d) => ({
    date: d.date,
    operations: d.totalOperations,
    users: d.totalUsers,
  }));


  function fillDateGaps(data: { date: string; operations: number; users: number }[]) {
    if (data.length < 2) return data;

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const lookup = Object.fromEntries(sorted.map((d) => [d.date, d]));

    const start = new Date(sorted[0].date + "T00:00:00");
    const end = new Date(sorted[sorted.length - 1].date + "T00:00:00");
    const filled = [];

    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0];
      filled.push(lookup[key] ?? { date: key, operations: 0, users: 0 });
    }

    return filled;
  }

  const trendsData1 = fillDateGaps(
    dateWiseData.map((d) => ({
      date: d.date,
      operations: d.totalOperations,
      users: d.totalUsers,
    }))
  ).map((d) => ({
    month: d.date,
    totalOperations: d.operations,
    activeUsers: d.users,
  }));

  const featureTrendsData = fillDateGaps(
    dateWiseData.map((d) => ({
      date: d.date,
      operations: d.totalOperations,
      users: d.totalUsers,
    }))
  ).map((d) => {
    const original = dateWiseData.find((o) => o.date === d.date);
    return {
      month: d.date,
      postsUsed: original?.metrics?.postsUsed ?? 0,
      aiPostersUsed: original?.metrics?.aiPostersUsed ?? 0,
      aiReviewRepliesUsed: original?.metrics?.aiReviewRepliesUsed ?? 0,
      scheduledPostsUsed: original?.metrics?.scheduledPostsUsed ?? 0,
    };
  });



  const renderContent = () => {
    if (loading) {
      switch (activeTab) {
        case 'overview': return <OverviewSkeleton />;
        case 'user-wise': return <UserWiseSkeleton />;
        case 'date-wise': return <DateWiseSkeleton />;
        case 'top-usage': return <TopUsageSkeleton />;
        case 'trends': return <TrendsSkeleton />;
        default: return <OverviewSkeleton />;
      }
    }

    switch (activeTab) {
      case 'overview':
        return summaryData ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData.summary.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Users with activity</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
                  <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(getTotalOperations())}</div>
                  <p className="text-xs text-muted-foreground">Across all features</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Most Used Feature</CardTitle>
                  <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getMostUsedFeature()}</div>
                  <p className="text-xs text-muted-foreground">By total count</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Ops / User</CardTitle>
                  <BarChartIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryData.summary.totalUsers > 0
                      ? (getTotalOperations() / summaryData.summary.totalUsers).toFixed(1)
                      : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Operations per user</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {/* Pie Chart Card */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle>Usage Distribution</CardTitle>
                  <CardDescription>
                    Breakdown by feature type
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ChartContainer
                    config={pieChartConfig}
                    className="h-[360px] w-full"
                  >
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        outerRadius={90}
                        labelLine
                        dataKey="value"
                        nameKey="key"
                        label={({ name, percent }) =>
                          percent > 0.03
                            ? `${name} ${(percent * 100).toFixed(0)}%`
                            : ""
                        }
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fill}
                          />
                        ))}
                      </Pie>

                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent />}
                      />

                      <ChartLegend
                        verticalAlign="bottom"
                        wrapperStyle={{
                          paddingTop: 24,
                        }}
                        content={<ChartLegendContent />}
                      />
                    </PieChart>
                  </ChartContainer>
                </CardContent>

              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Feature Usage Metrics</CardTitle>
                  <CardDescription>
                    Total counts by feature
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ChartContainer
                    config={barChartConfig}
                    className="h-[400px] w-full"
                  >
                    <BarChart
                      data={barData}
                      layout="vertical"
                      barCategoryGap="25%"
                    >
                      <CartesianGrid horizontal={false} />

                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        width={140}
                        tick={{ fontSize: 12 }}
                      />

                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent />}
                      />

                      <Bar
                        dataKey="value"
                        fill="var(--color-value)"
                        radius={[0, 6, 6, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

            </div>

            <Card>
              <CardHeader>
                <CardTitle>Average Usage Per User</CardTitle>
                <CardDescription>
                  Average metrics across all active users
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(summaryData.averagePerUser).map(([key, value]) => {
                    const metricKey = key.replace(/^average_/, "") as UsageMetricKey;

                    return (
                      <div
                        key={key}
                        className="
              rounded-xl border bg-muted/30
              p-5
              space-y-3
              transition-colors
              hover:bg-muted/50
            "
                      >
                        <div className="text-sm text-muted-foreground leading-relaxed">
                          {METRIC_LABELS[metricKey] ?? metricKey}
                        </div>

                        <div className="text-2xl font-bold tracking-tight">
                          {value.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null;

      case 'user-wise':
        return (
          <Card>
            <CardHeader>
              <CardTitle>User-wise Usage Breakdown</CardTitle>
              <CardDescription>Aggregated usage metrics per user with profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-x-auto">
                <Table className="rounded-md">
                  <TableHeader className="sticky top-0 bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[280px]">User</TableHead>
                      <TableHead className="text-center">Total Ops</TableHead>
                      <TableHead className="text-center">Posts</TableHead>
                      <TableHead className="text-center">AI Posters</TableHead>
                      <TableHead className="text-center">AI Reviews</TableHead>
                      <TableHead className="text-center">Scheduled</TableHead>
                      <TableHead className="text-right">Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userWiseData.map((user) => (
                      <TableRow key={user.stackUserId}
                        className="h-16 even:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.profileImage || undefined} />
                              <AvatarFallback>
                                {getUserInitials(user.displayName, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate">
                                {user.displayName && user.displayName !== 'N/A' ? user.displayName : 'Anonymous User'}
                              </p>
                              {user.email && (
                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <code className="text-xs text-muted-foreground cursor-help">
                                    {shortId(user.stackUserId)}
                                  </code>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Full ID: {user.stackUserId}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{user.totalOperations}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{user.totalUsage.postsUsed}</TableCell>
                        <TableCell className="text-center">{user.totalUsage.aiPostersUsed}</TableCell>
                        <TableCell className="text-center">{user.totalUsage.aiReviewRepliesUsed}</TableCell>
                        <TableCell className="text-center">{user.totalUsage.scheduledPostsUsed}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {format(new Date(user.latestPeriodStart), 'MMM dd')} →{' '}
                          {format(new Date(user.latestPeriodEnd), 'MMM dd')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {userWiseData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No user data for selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1 || loading}
                    >
                      <ChevronLeftIcon className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages || loading}
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'date-wise':
        return (
          <>
            {/* ── Line chart ──────────────────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Daily usage distribution</CardTitle>
                <CardDescription>Operations and active users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={dateWiseChartConfig} className="h-[400px] w-full">
                  <LineChart data={dateChartData}>
                    <CartesianGrid vertical={false} />

                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />

                    {/* ── 2. yAxisId strings must match exactly on <Line> ── */}
                    <YAxis
                      yAxisId="yLeft"
                      orientation="left"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="yRight"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />

                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />

                    {/* ── 3. Pass hex directly to stroke — don't rely on config color var ── */}
                    <Line
                      yAxisId="yLeft"
                      type="monotone"
                      dataKey="operations"
                      stroke={dateWiseChartConfig.operations.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="yRight"
                      type="monotone"
                      dataKey="users"
                      stroke={dateWiseChartConfig.users.color}
                      strokeWidth={2}
                      strokeDasharray="5 3"   // visual distinction beyond color alone
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* ── Daily breakdown table ────────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Daily breakdown</CardTitle>
                <CardDescription>Detailed metrics per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Date</TableHead>
                        <TableHead className="text-center">Active users</TableHead>
                        <TableHead className="text-center">Total ops</TableHead>
                        <TableHead className="text-center">Posts</TableHead>
                        <TableHead className="text-center">AI features</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {dateWiseData.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No daily data for selected period
                          </TableCell>
                        </TableRow>
                      ) : (
                        dateWiseData.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell className="font-medium py-4 whitespace-nowrap">
                              {day.date}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              {day.totalUsers}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              {day.totalOperations}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              {day.metrics.postsUsed}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              {day.metrics.aiPostersUsed +
                                day.metrics.aiReviewRepliesUsed +
                                day.metrics.aiImageUsed}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        );

      case 'top-usage':
        return (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Usage Leaders</CardTitle>
                  <CardDescription>Highest usage by feature</CardDescription>
                </div>

                <Select
                  value={selectedMetric}
                  onValueChange={(v) => setSelectedMetric(v as UsageMetricKey)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METRIC_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {(() => {
                const items = topUsageData?.data ?? [];
                const total = items.reduce((s, i) => s + i.usageCount, 0);

                return items.length ? (
                  items.map((item, index) => {
                    const pct =
                      total > 0 ? ((item.usageCount / total) * 100).toFixed(1) : "0.0";

                    return (
                      <div
                        key={item.stackUserId}
                        className="rounded-lg border px-3 py-3"
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank */}
                          <div className="w-7 flex justify-center shrink-0">
                            {index === 0 ? (
                              <CrownIcon className="h-5 w-5 text-yellow-500" />
                            ) : index === 1 ? (
                              <MedalIcon className="h-5 w-5 text-slate-400" />
                            ) : index === 2 ? (
                              <MedalIcon className="h-5 w-5 text-amber-600" />
                            ) : (
                              <span className="text-sm font-semibold text-muted-foreground">
                                #{index + 1}
                              </span>
                            )}
                          </div>

                          {/* Avatar */}
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={item.profileImage || undefined} />
                            <AvatarFallback>
                              {getUserInitials(item.displayName, item.email)}
                            </AvatarFallback>
                          </Avatar>

                          {/* User info */}
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-medium">
                              {item.displayName && item.displayName !== "N/A"
                                ? item.displayName
                                : "Anonymous"}
                            </div>

                            {item.email && (
                              <div className="truncate text-xs text-muted-foreground">
                                {item.email}
                              </div>
                            )}
                          </div>

                          {/* Value */}
                          <div className="text-right shrink-0">
                            <div className="text-sm font-semibold">
                              {formatNumber(item.usageCount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pct}%
                            </div>
                          </div>
                        </div>

                        <Progress
                          value={Number(pct)}
                          className="mt-3 h-1.5"
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No usage data for this metric
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        );

      case 'trends':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Usage Trends</CardTitle>
                <CardDescription>Operations and active users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={trendsChartConfig}
                  className="h-[320px] w-full"
                >
                  <LineChart
                    data={trendsData1}
                    margin={{
                      top: 20,
                      right: 20,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />

                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tickFormatter={(val) =>
                        new Date(val + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />

                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />

                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />

                    <ChartTooltip
                      cursor={{ strokeDasharray: "4 4" }}
                      content={<ChartTooltipContent />}
                    />

                    <ChartLegend
                      verticalAlign="top"
                      align="right"
                      content={<ChartLegendContent />}
                    />

                    <Line
                      yAxisId="left"
                      dataKey="totalOperations"
                      type="monotone"
                      stroke="var(--color-totalOperations)"
                      strokeWidth={3}
                      dot={{
                        r: 5,
                        strokeWidth: 2,
                        fill: "var(--background)",
                      }}
                      activeDot={{ r: 7 }}
                    />

                    <Line
                      yAxisId="right"
                      dataKey="activeUsers"
                      type="monotone"
                      stroke="var(--color-activeUsers)"
                      strokeWidth={3}
                      dot={{
                        r: 5,
                        strokeWidth: 2,
                        fill: "var(--background)",
                      }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Trends</CardTitle>
                <CardDescription>
                  How each feature is being used over time
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ChartContainer
                  config={featureTrendsChartConfig}
                  className="h-[320px] w-full"
                >
                  <LineChart
                    accessibilityLayer
                    data={featureTrendsData}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />

                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />

                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />

                    <Line
                      dataKey="postsUsed"
                      type="monotone"
                      stroke="var(--color-postsUsed)"
                      strokeWidth={2}
                      dot={false}
                    />

                    <Line
                      dataKey="aiPostersUsed"
                      type="monotone"
                      stroke="var(--color-aiPostersUsed)"
                      strokeWidth={2}
                      dot={false}
                    />

                    <Line
                      dataKey="aiReviewRepliesUsed"
                      type="monotone"
                      stroke="var(--color-aiReviewRepliesUsed)"
                      strokeWidth={2}
                      dot={false}
                    />

                    <Line
                      dataKey="scheduledPostsUsed"
                      type="monotone"
                      stroke="var(--color-scheduledPostsUsed)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {growthRate && (
              <Card>
                <CardHeader>
                  <CardTitle>Growth Metrics</CardTitle>
                  <CardDescription>Month-over-month: {growthRate.period}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Operations Growth</p>
                      <p className={`text-2xl font-bold ${growthColor(growthRate.operationsGrowth)}`}>
                        {parseFloat(growthRate.operationsGrowth) >= 0 ? '+' : ''}
                        {growthRate.operationsGrowth}%
                      </p>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${parseFloat(growthRate.operationsGrowth) >= 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          style={{ width: `${Math.min(Math.abs(parseFloat(growthRate.operationsGrowth)), 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">User Growth</p>
                      {growthRate.usersGrowth !== null ? (
                        <>
                          <p className={`text-2xl font-bold ${growthColor(growthRate.usersGrowth)}`}>
                            {parseFloat(growthRate.usersGrowth) >= 0 ? '+' : ''}
                            {growthRate.usersGrowth}%
                          </p>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${parseFloat(growthRate.usersGrowth) >= 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                              style={{ width: `${Math.min(Math.abs(parseFloat(growthRate.usersGrowth)), 100)}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <p className="text-2xl font-bold text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Usage Analytics</h1>
            <p className="text-muted-foreground">Monitor and analyze platform usage metrics</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, 'MMM dd, yyyy')} – {format(dateRange.to, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range: any) => {
                    if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to });
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button
              onClick={() =>
                runFetch(activeTab, dateRange.from, dateRange.to, selectedMetric, userWisePage.current)
              }
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCwIcon className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full overflow-x-auto flex">
            <TabsTrigger value="overview" className="flex-shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="user-wise" className="flex-shrink-0">User Wise</TabsTrigger>
            <TabsTrigger value="date-wise" className="flex-shrink-0">Date Wise</TabsTrigger>
            <TabsTrigger value="top-usage" className="flex-shrink-0">Top Usage</TabsTrigger>
            <TabsTrigger value="trends" className="flex-shrink-0">Trends</TabsTrigger>
          </TabsList>

          {/* Tab Contents with loading handling */}
          <TabsContent value="overview" className="space-y-4">
            {renderContent()}
          </TabsContent>

          <TabsContent value="user-wise" className="space-y-4">
            {renderContent()}
          </TabsContent>

          <TabsContent value="date-wise" className="space-y-4">
            {renderContent()}
          </TabsContent>

          <TabsContent value="top-usage" className="space-y-4">
            {renderContent()}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {renderContent()}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}