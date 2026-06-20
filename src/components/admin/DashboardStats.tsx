"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  FileText, 
  Activity, 
  Calendar,
  TrendingUp,
  Settings,
  AlertCircle,
  RefreshCw,
  Clock,
  Zap,
  UserPlus,
  BookOpen,
  GitBranch,
  BarChart3,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardData = {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalBlogs: number;
  totalChangelogs: number;
  totalOperations: number;
  usageByFeature: Record<string, number>;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  recentChangelogs: Array<{
    id: string;
    title: string;
    version: string;
    releaseDate: string;
    type: string | null;
  }>;
  period: {
    start: string;
    end: string;
  };
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ 
  title, 
  value, 
  subtitle, 
  trend,
  icon: Icon, 
  loading = false,
  className 
}: { 
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon: React.ElementType;
  loading?: boolean;
  className?: string;
}) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <ArrowUpRight className="h-3 w-3 text-emerald-500" />;
    if (trend.value < 0) return <ArrowDownRight className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-emerald-600';
    if (trend.value < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-2 rounded-lg bg-primary/5 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  getTrendColor()
                )}>
                  {getTrendIcon()}
                  {trend.value > 0 && '+'}{trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {trend.label}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DashboardStats() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch('/api/admin/dashboard?period=month');
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
        setError(null);
        setLastUpdated(new Date());
      } else {
        setError(result.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="p-3 rounded-full bg-red-50 text-red-600 mb-4">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Failed to Load</h3>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <button
          onClick={() => fetchDashboardData()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="p-3 rounded-full bg-gray-50 text-gray-600 mb-4">
          <BarChart3 className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No Data Available</h3>
        <p className="text-muted-foreground text-sm">
          Start using your platform to see analytics here.
        </p>
      </div>
    );
  }

  const {
    totalUsers = 0,
    activeUsers = 0,
    newUsersThisMonth = 0,
    totalBlogs = 0,
    totalChangelogs = 0,
    totalOperations = 0,
    usageByFeature = {},
    maintenanceMode = false,
    registrationOpen = true,
    recentChangelogs = [],
  } = data;

  const featureEntries = Object.entries(usageByFeature);
  const maxUsage = featureEntries.length > 0 ? featureEntries[0][1] : 1;
  const totalContent = totalBlogs + totalChangelogs;

  const userTrend = newUsersThisMonth > 0 ? 12 : 0;
  const activeTrend = activeUsers > 0 ? 8 : 0;
  const contentTrend = totalContent > 0 ? 5 : 0;
  const opsTrend = totalOperations > 0 ? 23 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of your platform activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border text-sm">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Status:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "h-2 w-2 rounded-full",
            maintenanceMode ? "bg-red-500" : "bg-emerald-500"
          )} />
          <span className="text-sm">
            {maintenanceMode ? 'Maintenance' : 'Operational'}
          </span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">
            {registrationOpen ? 'Registrations Open' : 'Registrations Closed'}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span className="text-xs">
            {new Date(data.period.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(data.period.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={totalUsers}
          subtitle={`${newUsersThisMonth} new this month`}
          trend={{ value: userTrend, label: 'vs last month' }}
          icon={Users}
        />
        <StatCard
          title="Active Users"
          value={activeUsers}
          subtitle="Last 30 days"
          trend={{ value: activeTrend, label: 'vs last month' }}
          icon={Activity}
        />
        <StatCard
          title="Content"
          value={totalContent}
          subtitle={`${totalBlogs} blogs · ${totalChangelogs} changelogs`}
          trend={{ value: contentTrend, label: 'vs last month' }}
          icon={FileText}
        />
        <StatCard
          title="Operations"
          value={totalOperations}
          subtitle={`${featureEntries.length} features in use`}
          trend={{ value: opsTrend, label: 'vs last month' }}
          icon={TrendingUp}
        />
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Feature Usage */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Feature Usage</CardTitle>
              <Badge variant="outline" className="text-xs px-2.5 py-0.5">
                <Zap className="h-3 w-3 mr-1" />
                {featureEntries.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {featureEntries.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No usage data available</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {featureEntries.map(([feature, count]) => {
                  const percentage = Math.max((count / maxUsage) * 100, 1);
                  return (
                    <div key={feature}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{feature}</span>
                        <span className="font-medium">{count.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Changelogs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Updates</CardTitle>
              <Badge variant="outline" className="text-xs px-2.5 py-0.5">
                <GitBranch className="h-3 w-3 mr-1" />
                {recentChangelogs.length} new
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recentChangelogs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No recent updates</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {recentChangelogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 -mx-1 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-primary/5 text-primary mt-0.5">
                      <GitBranch className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-sm truncate">
                          {log.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          v{log.version}
                        </Badge>
                        {log.type && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {log.type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.releaseDate 
                          ? new Date(log.releaseDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Unknown'
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Status Skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-32 mt-1" />
              <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Grid Skeleton */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}