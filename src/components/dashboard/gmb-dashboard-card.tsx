'use client';
import { MapPin, FileText, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

interface DashboardStats {
  overview: {
    totalLocations: number;
    activeLocations: number;
    totalKeywords: number;
    keywordsWithRankData: number;
    rankDataStale: boolean;
    lastRankedAt: string | null;
  };
  gmb: {
    connected: boolean;
    accountName: string | null;
    tokenValid: boolean;
    tokenDaysLeft: number | null;
    tokenExpiry: string | null;
  };
  rankings: {
    inTopTen: number;
    improved: number;
  };
  scheduledPosts: {
    pending: number;
    total: number;
    failed?: number;
    nextPost: { summary: string; scheduledAt: string } | null;
    upcoming: { id: string; summary: string; scheduledAt: string; viewColor: string }[];
  };
  progress: {
    totalPoints: number;
    currentLevel: number;
    tasksCompleted: number;
    locationsCount: number;
  };
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
  accent,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  icon: React.ElementType;
  iconClass: string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 flex flex-col gap-3 transition-shadow hover:shadow-sm",
      accent
    )}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", iconClass.replace(/text-\S+/, '').trim(), "bg-muted/60")}>
          <Icon className={cn("h-4 w-4", iconClass)} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1.5">{sub}</div>
      </div>
    </div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

export default function GMBDashboardCards({
  stats,
  isLoading,
}: {
  stats?: DashboardStats;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-7 w-7 bg-muted rounded-lg animate-pulse" />
            </div>
            <div className="h-7 w-14 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const gmb = stats?.gmb;
  const nextPost = stats?.scheduledPosts?.nextPost;
  const progress = stats?.progress;

  const totalPoints = progress?.totalPoints ?? 0;
  const currentLevel = progress?.currentLevel ?? 1;
  const tasksCompleted = progress?.tasksCompleted ?? 0;
  const hasProgress = totalPoints > 0 || tasksCompleted > 0;

  const tokenDaysLeft = gmb?.tokenDaysLeft ?? null;
  const tokenWarning = tokenDaysLeft !== null && tokenDaysLeft <= 3;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* GMB Status */}
      <StatCard
        label="GMB Status"
        icon={Zap}
        iconClass={gmb?.connected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
        accent={tokenWarning ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20" : undefined}
        value={
          <span className={cn(!gmb?.connected && "text-muted-foreground")}>
            {gmb?.connected ? "Connected" : "Offline"}
          </span>
        }
        sub={
          tokenWarning
            ? <span className="text-amber-600 dark:text-amber-400 font-medium">Token expires in {tokenDaysLeft}d</span>
            : gmb?.accountName
              ? <span className="truncate block">{gmb.accountName.replace("accounts/", "")}</span>
              : "Google Business Profile"
        }
      />

      {/* Locations */}
      <StatCard
        label="Locations"
        href="/app/locations"
        icon={MapPin}
        iconClass="text-blue-600 dark:text-blue-400"
        value={stats?.overview?.totalLocations ?? 0}
        sub={
          <><span className="font-semibold text-foreground">{stats?.overview?.activeLocations ?? 0}</span> active</>
        }
      />

      {/* Progress */}
      <StatCard
        label="Progress"
        icon={Star}
        iconClass={hasProgress ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"}
        value={
          hasProgress
            ? <>{totalPoints.toLocaleString()}<span className="text-sm font-normal text-muted-foreground ml-1">pts</span></>
            : `Level ${currentLevel}`
        }
        sub={
          hasProgress
            ? <>Level <span className="font-semibold text-foreground">{currentLevel}</span> · {tasksCompleted} task{tasksCompleted !== 1 ? "s" : ""} done</>
            : "Complete tasks to earn points"
        }
      />

      {/* Scheduled Posts */}
      <StatCard
        label="Scheduled Posts"
        href="/app/post/schedule"
        icon={FileText}
        iconClass="text-purple-600 dark:text-purple-400"
        value={stats?.scheduledPosts?.pending ?? 0}
        sub={
          nextPost
            ? <>Next: <span className="font-semibold text-foreground">{format(new Date(nextPost.scheduledAt), "MMM d")}</span></>
            : "No upcoming"
        }
      />
    </div>
  );
}