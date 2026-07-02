'use client';
import { MapPin, FileText, Zap, Star, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

// Single pill: label + value + optional badge. This is the whole visual
// language of the strip — everything reduces to this shape.
function StatusPill({
  icon: Icon,
  label,
  value,
  badge,
  badgeTone = 'default',
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: string;
  badgeTone?: 'default' | 'good' | 'warn' | 'bad';
  href?: string;
}) {
  const tones: Record<string, string> = {
    default: 'bg-muted text-muted-foreground border-transparent',
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    warn: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    bad: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
  };

  const content = (
    <div className="flex items-center gap-3 py-4 px-4 min-w-0">
      <Icon className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground leading-none mb-1.5">{label}</p>
        <p className="text-base font-semibold leading-none truncate">{value}</p>
      </div>
      {badge && (
        <Badge variant="outline" className={cn('text-xs font-medium shrink-0', tones[badgeTone])}>
          {badge}
        </Badge>
      )}
      {href && <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
    </div>
  );

  return href ? (
    <Link href={href} className="block hover:bg-muted/40 transition-colors rounded-lg">
      {content}
    </Link>
  ) : (
    <div className="rounded-lg">{content}</div>
  );
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
      <div className="rounded-lg border border-border bg-card divide-y divide-border sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-4 px-4">
            <div className="h-4.5 w-4.5 bg-muted rounded animate-pulse shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
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
    <div className="rounded-lg border border-border bg-card divide-y divide-border sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-2 lg:grid-cols-4">
      <StatusPill
        icon={Zap}
        label="Google Business Profile"
        value={gmb?.connected ? (gmb.accountName?.replace('accounts/', '') ?? 'Connected') : 'Not connected'}
        badge={tokenWarning ? `Expires in ${tokenDaysLeft}d` : gmb?.connected ? 'Live' : 'Action needed'}
        badgeTone={tokenWarning ? 'warn' : gmb?.connected ? 'good' : 'bad'}
      />
      <StatusPill
        icon={MapPin}
        label="Locations"
        value={`${stats?.overview?.totalLocations ?? 0} location${(stats?.overview?.totalLocations ?? 0) !== 1 ? 's' : ''}`}
        badge={
          (stats?.overview?.activeLocations ?? 0) > 0
            ? `${stats?.overview?.activeLocations} active`
            : 'Set up needed'
        }
        badgeTone={(stats?.overview?.activeLocations ?? 0) > 0 ? 'good' : 'warn'}
        href="/app/locations"
      />
      <StatusPill
        icon={Star}
        label="Progress"
        value={hasProgress ? `${totalPoints.toLocaleString()} pts · Level ${currentLevel}` : `Level ${currentLevel}`}
        badge={hasProgress ? `${tasksCompleted} task${tasksCompleted !== 1 ? 's' : ''} done` : undefined}
      />
      <StatusPill
        icon={FileText}
        label="Next post"
        value={nextPost ? format(new Date(nextPost.scheduledAt), 'MMM d, h:mm a') : 'Nothing scheduled'}
        badge={stats?.scheduledPosts?.pending ? `${stats.scheduledPosts.pending} pending` : undefined}
        href="/app/post/schedule"
      />
    </div>
  );
}