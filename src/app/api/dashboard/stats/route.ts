import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      locationsData,
      keywordTracking,
      recentRanks,
      gmbStatus,
      upcomingPosts,
      allPostCounts,
      topRanks,
      improvedRanks,
      userProgress,       // ← replaces locationProgress aggregation
    ] = await Promise.all([
      // 1. Locations
      prisma.locations.findMany({
        where: { user_id: userId, is_deleted: false },
        select: {
          id: true,
          location_id: true,
          location_name: true,
          last_rank_updated: true,
        },
      }),

      // 2. Keyword tracking config
      prisma.keywordTracking.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          keyword: true,
          location: true,
          locationId: true,
          lastChecked: true,
          nextBatchUpdate: true,
          refreshRate: true,
        },
        orderBy: { lastChecked: 'desc' },
      }),

      // 3. Recent rank results
      prisma.keywordRank.findMany({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        select: {
          keyword: true,
          rank: true,
          previousRank: true,
          rankChange: true,
          rankChangeValue: true,
          location: true,
          locationId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 4. GMB integration
      prisma.gmbIntegration.findUnique({
        where: { userId },
        select: {
          isActive: true,
          accountName: true,
          tokenExpiry: true,
        },
      }),

      // 5. Upcoming posts — 14-day window
      prisma.scheduledPost.findMany({
        where: {
          user_id: userId,
          status: 'PENDING',
          scheduledAt: { gte: now, lte: fourteenDaysAhead },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: {
          id: true,
          summary: true,
          scheduledAt: true,
          timezone: true,
          viewColor: true,
        },
      }),

      // 6. All post counts by status
      prisma.scheduledPost.groupBy({
        by: ['status'],
        where: { user_id: userId },
        _count: { id: true },
      }),

      // 7. Top ranking keywords (rank ≤ 10)
      prisma.keywordRank.findMany({
        where: {
          userId,
          rank: { lte: 10, not: null },
          createdAt: { gte: sevenDaysAgo },
        },
        distinct: ['keyword'],
        orderBy: [{ rank: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          keyword: true,
          rank: true,
          location: true,
          rankChangeValue: true,
        },
      }),

      // 8. Most improved this week
      prisma.keywordRank.findMany({
        where: {
          userId,
          rankChange: 'UP',
          createdAt: { gte: sevenDaysAgo },
        },
        distinct: ['keyword'],
        orderBy: [{ rankChangeValue: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          keyword: true,
          rank: true,
          previousRank: true,
          rankChangeValue: true,
          location: true,
        },
      }),

      // 9. UserProgress — single global row per user, no aggregation needed
      prisma.userProgress.findUnique({
        where: { userId },
        select: {
          totalPoints: true,
          currentLevel: true,
          tasksCompleted: true,
          locationsCount: true,
        },
      }),
    ]);

    // ── Post counts
    const postCounts = allPostCounts.reduce(
      (acc, row) => ({ ...acc, [row.status.toLowerCase()]: row._count.id }),
      { pending: 0, published: 0, failed: 0, processing: 0, cancelled: 0, expired: 0 } as Record<string, number>
    );

    // ── Active locations (ranked in last 30 days)
    const activeLocations = locationsData.filter(
      (l) => l.last_rank_updated && new Date(l.last_rank_updated) > thirtyDaysAgo
    );

    // ── Keyword data: merge tracking config with latest rank result
    const rankMap = new Map<string, (typeof recentRanks)[0]>();
    for (const r of recentRanks) {
      const key = `${r.keyword}__${r.locationId}`;
      if (!rankMap.has(key)) rankMap.set(key, r);
    }

    const keywords = keywordTracking.map((kt) => {
      const rankKey = `${kt.keyword}__${kt.locationId}`;
      const rank = rankMap.get(rankKey) ?? null;
      const isStale = !kt.lastChecked || new Date(kt.lastChecked) < sevenDaysAgo;
      return {
        keyword: kt.keyword,
        location: kt.location,
        locationId: kt.locationId,
        rank: rank?.rank ?? null,
        rankChange: rank?.rankChange ?? null,
        rankChangeValue: rank?.rankChangeValue ?? 0,
        lastChecked: kt.lastChecked,
        nextBatchUpdate: kt.nextBatchUpdate,
        isStale,
        neverRanked: !rank,
      };
    });

    // ── Staleness
    const mostRecentCheck = keywordTracking
      .filter((k) => k.lastChecked)
      .sort((a, b) => new Date(b.lastChecked!).getTime() - new Date(a.lastChecked!).getTime())[0];

    const rankDataStale =
      !mostRecentCheck || new Date(mostRecentCheck.lastChecked!) < sevenDaysAgo;

    // ── GMB token days remaining
    const tokenDaysLeft = gmbStatus?.tokenExpiry
      ? Math.ceil((new Date(gmbStatus.tokenExpiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return NextResponse.json({
      overview: {
        totalLocations: locationsData.length,
        activeLocations: activeLocations.length,
        totalKeywords: keywordTracking.length,
        keywordsWithRankData: keywords.filter((k) => !k.neverRanked).length,
        keywordsStale: keywords.filter((k) => k.isStale && !k.neverRanked).length,
        rankDataStale,
        lastRankedAt: mostRecentCheck?.lastChecked ?? null,
      },

      gmb: {
        connected: gmbStatus?.isActive ?? false,
        accountName: gmbStatus?.accountName ?? null,
        tokenExpiry: gmbStatus?.tokenExpiry ?? null,
        tokenDaysLeft,
        tokenValid: tokenDaysLeft !== null && tokenDaysLeft > 0,
      },

      rankings: {
        topKeywords: topRanks,
        improvedKeywords: improvedRanks,
        inTopTen: topRanks.length,
        improved: improvedRanks.length,
      },

      keywords,

      scheduledPosts: {
        pending: postCounts.pending,
        published: postCounts.published,
        failed: postCounts.failed,
        total: Object.values(postCounts).reduce((a, b) => a + b, 0),
        upcoming: upcomingPosts,
        nextPost: upcomingPosts[0] ?? null,
      },

      // Flat global progress — no aggregation, directly from UserProgress model
      progress: {
        totalPoints:    userProgress?.totalPoints    ?? 0,
        currentLevel:   userProgress?.currentLevel   ?? 1,
        tasksCompleted: userProgress?.tasksCompleted ?? 0,
        locationsCount: userProgress?.locationsCount ?? 0,
      },

      lastUpdated: now.toISOString(),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}