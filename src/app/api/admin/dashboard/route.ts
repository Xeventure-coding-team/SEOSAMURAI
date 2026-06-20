// E:\SEOSAMURAI\src\app\api\admin\dashboard\route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAccess } from '../../../../../lib/require-access';
import { stackServerApp } from '@/stack';

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardStats = {
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
    releaseDate: Date;
    type: string | null;
  }>;
  period: {
    start: Date;
    end: Date;
  };
};

// ─── Auth Guard ──────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<NextResponse | null> {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const perm = await user.getPermission('access_admin_dashboard');
  if (!perm) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  return null;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const sp = req.nextUrl.searchParams;
    const period = sp.get('period') ?? 'month';
    
    const now = new Date();
    const periodStart = getPeriodStart(now, period);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Fetch all data in parallel
    const [
      userData,
      totalBlogs,
      totalChangelogs,
      usageData,
      settings,
      recentChangelogs,
    ] = await Promise.all([
      fetchUserCounts(),
      prisma.blogPost.count(),
      prisma.changeLog.count(),
      getUsageStats(periodStart, now),
      prisma.siteSettings.findUnique({
        where: { id: 'singleton' },
      }),
      prisma.changeLog.findMany({
        orderBy: { releaseDate: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          version: true,
          releaseDate: true,
          type: true,
        },
      }),
    ]);

    // Construct clean response
    const dashboardData: DashboardStats = {
      totalUsers: userData.totalUsers || 0,
      activeUsers: userData.activeUsers || 0,
      newUsersThisMonth: userData.newUsersThisMonth || 0,
      totalBlogs: totalBlogs || 0,
      totalChangelogs: totalChangelogs || 0,
      totalOperations: usageData.totalOperations || 0,
      usageByFeature: usageData.byFeature || {},
      maintenanceMode: settings?.maintenanceMode ?? false,
      registrationOpen: settings?.registrationOpen ?? true,
      recentChangelogs: recentChangelogs || [],
      period: {
        start: periodStart,
        end: now,
      },
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function getPeriodStart(now: Date, period: string): Date {
  const date = new Date(now);
  switch (period) {
    case 'week':
      date.setDate(date.getDate() - 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() - 1);
      break;
    case 'quarter':
      date.setMonth(date.getMonth() - 3);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      date.setMonth(date.getMonth() - 1);
  }
  return date;
}

async function fetchUserCounts(): Promise<{
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
}> {
  try {
    console.log('🔍 Fetching users from Hexclave API...');
    
    const response = await fetch(
      'https://api.hexclave.com/api/v1/users?include_restricted=true',
      {
        headers: {
          'X-Stack-Access-Type': 'server',
          'X-Stack-Project-Id': process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID!,
          'X-Stack-Secret-Server-Key': process.env.HEXCLAVE_SECRET_SERVER_KEY!,
        },
      }
    );

    if (!response.ok) {
      console.error('❌ Hexclave API error:', response.status);
      return { totalUsers: 0, activeUsers: 0, newUsersThisMonth: 0 };
    }

    const data = await response.json();
    
    // ✅ FIX: Hexclave returns users in "items" array
    const users = data.items || [];
    console.log(`👥 Found ${users.length} users`);

    if (!Array.isArray(users) || users.length === 0) {
      return { totalUsers: 0, activeUsers: 0, newUsersThisMonth: 0 };
    }
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let activeCount = 0;
    let newThisMonth = 0;
    
    for (const user of users) {
      // Check if user is active (has been active in last 30 days)
      const lastActive = user.last_active_at_millis;
      if (lastActive) {
        const lastActiveDate = new Date(lastActive);
        if (lastActiveDate >= thirtyDaysAgo) {
          activeCount++;
        }
      }
      
      // Check if user signed up this month
      const signedUp = user.signed_up_at_millis;
      if (signedUp) {
        const signedUpDate = new Date(signedUp);
        if (signedUpDate >= monthStart) {
          newThisMonth++;
        }
      }
    }

    console.log(`📊 Users: ${users.length} total, ${activeCount} active, ${newThisMonth} new this month`);

    return {
      totalUsers: users.length || 0,
      activeUsers: activeCount || 0,
      newUsersThisMonth: newThisMonth || 0,
    };
  } catch (error) {
    console.error('❌ Error fetching user counts:', error);
    return { totalUsers: 0, activeUsers: 0, newUsersThisMonth: 0 };
  }
}

async function getUsageStats(startDate: Date, endDate: Date): Promise<{
  totalOperations: number;
  byFeature: Record<string, number>;
}> {
  try {
    const usageRecords = await prisma.usage.findMany({
      where: {
        periodStart: { lte: endDate },
        periodEnd: { gte: startDate },
      },
    });

    const byFeature: Record<string, number> = {};
    let totalOperations = 0;

    const featureMap: Record<string, string> = {
      postsUsed: 'Posts',
      aiPostersUsed: 'AI Posters',
      aiReviewRepliesUsed: 'AI Review Replies',
      scheduledPostsUsed: 'Scheduled Posts',
      geoGridScansUsed: 'Geo Grid Scans',
      reviewPostersUsed: 'Review Posters',
      keywordTrackingUsed: 'Keyword Tracking',
      aiImageUsed: 'AI Images',
    };

    for (const record of usageRecords) {
      const metrics = [
        'postsUsed',
        'aiPostersUsed',
        'aiReviewRepliesUsed',
        'scheduledPostsUsed',
        'geoGridScansUsed',
        'reviewPostersUsed',
        'keywordTrackingUsed',
        'aiImageUsed',
      ] as const;

      for (const metric of metrics) {
        const value = record[metric as keyof typeof record] as number || 0;
        if (value > 0) {
          const displayName = featureMap[metric] || metric;
          byFeature[displayName] = (byFeature[displayName] || 0) + value;
          totalOperations += value;
        }
      }
    }

    return {
      totalOperations: totalOperations || 0,
      byFeature: byFeature || {},
    };
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return { totalOperations: 0, byFeature: {} };
  }
}