'use client';
import { MapPin, FileText, Zap, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

export default function GMBDashboardCards({
  stats,
  isLoading,
}: {
  stats?: DashboardStats;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-border/50">
            <CardContent className="pt-6 pb-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-7 w-7 bg-muted rounded-lg animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
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

  const getDisplayName = (accountName: string | null) => {
    if (!accountName) return 'No account';
    const cleaned = accountName.replace('accounts/', '');
    return cleaned.length > 12 ? `Account ${cleaned.slice(-8)}` : cleaned;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* GMB Status */}
      <Card className={cn(
        'transition-all duration-200 hover:shadow-md',
        tokenWarning && 'border-amber-400/70 bg-amber-50/30 dark:bg-amber-950/20'
      )}>
        <CardContent >
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">GMB Status</span>
            <Zap className={cn(
              'w-5 h-5 flex-shrink-0 transition-colors',
              gmb?.connected ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'
            )} />
          </div>
          <div className="space-y-2">
            <div className={cn(
              'text-3xl font-bold tracking-tight',
              !gmb?.connected && 'text-muted-foreground'
            )}>
              {gmb?.connected ? 'Connected' : 'Offline'}
            </div>
            <div className={cn(
              'text-sm',
              tokenWarning
                ? 'text-amber-600 dark:text-amber-500 font-medium'
                : 'text-muted-foreground'
            )}>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations */}
      <Link href={'/app/locations'}>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent >
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Locations</span>
              <MapPin className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold tracking-tight">
                {stats?.overview?.totalLocations ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{stats?.overview?.activeLocations ?? 0}</span> active
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Progress — from UserProgress model */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent >
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Progress</span>
            <Star className={cn(
              'w-5 h-5 flex-shrink-0 transition-colors',
              hasProgress ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
            )} />
          </div>
          <div className="space-y-2">
            {hasProgress ? (
              <>
                <div className="text-3xl font-bold tracking-tight">
                  {totalPoints.toLocaleString()}
                  <span className="text-base font-semibold text-muted-foreground ml-1">pts</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Level <span className="font-semibold text-foreground">{currentLevel}</span> · {tasksCompleted} task{tasksCompleted !== 1 ? 's' : ''} done
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold tracking-tight">Level {currentLevel}</div>
                <div className="text-sm text-muted-foreground">Complete tasks to earn points</div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Posts */}
      <Link href={'/app/post/schedule'}>
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent >
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Scheduled Posts</span>
              <FileText className="w-5 h-5 flex-shrink-0 text-purple-600 dark:text-purple-500" />
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold tracking-tight">
                {stats?.scheduledPosts?.pending ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {nextPost ? `Next: ${format(new Date(nextPost.scheduledAt), 'MMM d')}` : 'No upcoming'}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

    </div>
  );
}