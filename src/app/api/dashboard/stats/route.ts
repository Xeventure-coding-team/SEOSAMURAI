// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get userId from headers or auth session
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User ID required' },
        { status: 401 }
      );
    }

    // Fetch all statistics in parallel for better performance
    const [
      locationsCount,
      activeLocations,
      keywordsStats,
      scheduledPostsStats,
      recentKeywordRanks,
      gmbIntegration,
      competitorAnalysesCount,
      upcomingPosts,
      recentRankChanges,
      keywordTrackingStats
    ] = await Promise.all([
      // Total locations for user
      prisma.locations.count({
        where: { user_id: userId }
      }),

      // Active locations (updated in last 30 days)
      prisma.locations.count({
        where: {
          user_id: userId,
          updated_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Keywords statistics
      prisma.keywords.aggregate({
        where: { user_id: userId },
        _count: { id: true }
      }),

      // Scheduled posts statistics
      prisma.scheduledPost.groupBy({
        by: ['status'],
        where: { user_id: userId },
        _count: true
      }),

      // Recent keyword rankings (last 7 days)
      prisma.keywordRank.findMany({
        where: {
          userId: userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          keyword: true,
          rank: true,
          previousRank: true,
          rankChange: true,
          rankChangeValue: true,
          location: true,
          createdAt: true
        }
      }),

      // GMB integration status
      prisma.gmbIntegration.findUnique({
        where: { userId: userId },
        select: {
          isActive: true,
          tokenExpiry: true,
          accountName: true
        }
      }),

      // Competitor analyses count
      prisma.competitorAnalysis.count({
        where: { userId: userId }
      }),

      // Upcoming scheduled posts (next 7 days)
      prisma.scheduledPost.findMany({
        where: {
          user_id: userId,
          status: 'PENDING',
          scheduledAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: {
          id: true,
          summary: true,
          scheduledAt: true,
          locationId: true,
          viewColor: true
        }
      }),

      // Recent rank changes (improvements and drops)
      prisma.keywordRank.findMany({
        where: {
          userId: userId,
          rankChange: { in: ['UP', 'DOWN'] },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          keyword: true,
          rank: true,
          previousRank: true,
          rankChange: true,
          rankChangeValue: true,
          location: true
        }
      }),

      // Keyword tracking statistics
      prisma.keywordTracking.aggregate({
        where: {
          userId: userId,
          isActive: true
        },
        _count: { id: true }
      })
    ]);

    // Calculate scheduled posts by status
    const postsByStatus = scheduledPostsStats.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average rank for tracked keywords
    const avgRankData = await prisma.keywordRank.aggregate({
      where: {
        userId: userId,
        rank: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      _avg: { rank: true }
    });

    // Get top performing keywords (rank <= 10)
    const topPerformingKeywords = await prisma.keywordRank.findMany({
      where: {
        userId: userId,
        rank: { lte: 10, not: null }
      },
      orderBy: { rank: 'asc' },
      take: 10,
      distinct: ['keyword'],
      select: {
        keyword: true,
        rank: true,
        location: true,
        url: true
      }
    });

    // Construct the response
    const stats = {
      overview: {
        totalLocations: locationsCount,
        activeLocations: activeLocations,
        totalKeywords: keywordsStats._count.id,
        activeKeywordTracking: keywordTrackingStats._count.id,
        competitorAnalyses: competitorAnalysesCount
      },
      scheduledPosts: {
        total: Object.values(postsByStatus).reduce((sum, count) => sum + count, 0),
        pending: postsByStatus.PENDING || 0,
        published: postsByStatus.PUBLISHED || 0,
        failed: postsByStatus.FAILED || 0,
        upcoming: upcomingPosts
      },
      rankings: {
        averageRank: avgRankData._avg.rank ? Math.round(avgRankData._avg.rank * 10) / 10 : null,
        recentRankings: recentKeywordRanks,
        topPerformingKeywords: topPerformingKeywords,
        recentChanges: recentRankChanges
      },
      integrations: {
        gmbConnected: gmbIntegration?.isActive || false,
        gmbAccountName: gmbIntegration?.accountName || null,
        gmbTokenValid: gmbIntegration 
          ? new Date(gmbIntegration.tokenExpiry) > new Date()
          : false
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(stats, { status: 200 });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Optional: Add POST endpoint for refreshing specific stats
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { refreshType } = body;

    // Handle specific refresh requests
    switch (refreshType) {
      case 'rankings':
        // Trigger ranking refresh logic here
        return NextResponse.json({ message: 'Rankings refresh initiated' });
      
      case 'posts':
        // Trigger posts refresh logic here
        return NextResponse.json({ message: 'Posts refresh initiated' });
      
      default:
        return NextResponse.json({ error: 'Invalid refresh type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Dashboard refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh dashboard' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}