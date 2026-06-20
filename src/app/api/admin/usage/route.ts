import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { prisma } from '../../../../../lib/prisma';

// ─── Hexclave ─────────────────────────────────────────────────────────────────

const HEXCLAVE_BASE = 'https://api.hexclave.com/api/v1';

const hexclaveHeaders = {
  'Content-Type': 'application/json',
  'X-Stack-Access-Type': 'server',
  'X-Stack-Project-Id': process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID!,
  'X-Stack-Secret-Server-Key': process.env.HEXCLAVE_SECRET_SERVER_KEY!,
};

type HexclaveUser = {
  id: string;
  display_name: string | null;
  primary_email: string | null;
  profile_image_url: string | null;
} | null;

async function fetchHexclaveUser(userId: string): Promise<HexclaveUser> {
  try {
    const res = await fetch(`${HEXCLAVE_BASE}/users/${userId}`, {
      headers: hexclaveHeaders,
      // Don't let a slow Hexclave call hang the whole response
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Fetch multiple users in parallel, keyed by id for fast lookup
async function fetchHexclaveUsers(userIds: string[]): Promise<Map<string, HexclaveUser>> {
  const results = await Promise.all(userIds.map((id) => fetchHexclaveUser(id)));
  return new Map(userIds.map((id, i) => [id, results[i]]));
}

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

const VALID_METRICS: UsageMetricKey[] = [
  'postsUsed',
  'aiPostersUsed',
  'aiReviewRepliesUsed',
  'scheduledPostsUsed',
  'geoGridScansUsed',
  'reviewPostersUsed',
  'keywordTrackingUsed',
  'aiImageUsed',
];

const ZERO_METRICS = () => ({
  postsUsed: 0,
  aiPostersUsed: 0,
  aiReviewRepliesUsed: 0,
  scheduledPostsUsed: 0,
  geoGridScansUsed: 0,
  reviewPostersUsed: 0,
  keywordTrackingUsed: 0,
  aiImageUsed: 0,
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<NextResponse | null> {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const perm = await user.getPermission('access_admin_dashboard');
  if (!perm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumMetrics(record: Record<string, unknown>) {
  return VALID_METRICS.reduce((sum, k) => sum + ((record[k] as number) ?? 0), 0);
}

/**
 * Returns a Prisma where-clause that matches records whose billing period
 * OVERLAPS with [startDate, endDate].
 *
 * A period [periodStart, periodEnd] overlaps [start, end] when:
 *   periodStart <= end  AND  periodEnd >= start
 *
 * Without a date filter we return all records (no where clause).
 */
function buildOverlapWhere(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  return {
    periodStart: { lte: end },
    periodEnd:   { gte: start },
  };
}

function displayName(user: HexclaveUser): string {
  if (!user) return 'N/A';
  return user.display_name || user.primary_email || user.id;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const sp = req.nextUrl.searchParams;
    const type       = sp.get('type') ?? 'overview';
    const startDate  = sp.get('startDate');
    const endDate    = sp.get('endDate');
    const userId     = sp.get('userId');
    const limit      = Math.min(parseInt(sp.get('limit') ?? '10'), 100);
    const page       = Math.max(parseInt(sp.get('page') ?? '1'), 1);
    const skip       = (page - 1) * limit;

    const run = async () => {
      switch (type) {
        case 'user-wise':
          return getUserWiseUsage(startDate, endDate, limit, page);

        case 'date-wise':
          return getDateWiseUsage(startDate, endDate);

        case 'top-usage': {
          const metric = sp.get('metric') as UsageMetricKey | null;
          if (!metric || !VALID_METRICS.includes(metric)) {
            return NextResponse.json(
              { error: `metric must be one of: ${VALID_METRICS.join(', ')}` },
              { status: 400 },
            );
          }
          return getTopUsage(metric, limit);
        }

        case 'user-details':
          if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
          }
          return getUserDetailedUsage(userId, startDate, endDate);

        case 'summary':
          return getUsageSummary(startDate, endDate);

        case 'trends':
          return getUsageTrends(startDate, endDate);

        default:
          return getAllUsage(startDate, endDate, limit, skip);
      }
    };

    return await run();
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch usage data',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = await req.json();
    const { subscriptionId, stackUserId, metric, amount = 1 } = body as {
      subscriptionId?: string;
      stackUserId?: string;
      metric?: string;
      amount?: number;
    };

    if (!subscriptionId || !stackUserId || !metric) {
      return NextResponse.json(
        { error: 'subscriptionId, stackUserId, and metric are required' },
        { status: 400 },
      );
    }
    if (!VALID_METRICS.includes(metric as UsageMetricKey)) {
      return NextResponse.json(
        { error: `metric must be one of: ${VALID_METRICS.join(', ')}` },
        { status: 400 },
      );
    }
    if (typeof amount !== 'number' || amount < 1) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const updatedUsage = await prisma.usage.upsert({
      where: { subscriptionId },
      create: {
        subscriptionId,
        stackUserId,
        periodStart: new Date(),
        periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        [metric]: amount,
      },
      update: { [metric]: { increment: amount } },
      include: { subscription: true },
    });

    return NextResponse.json(updatedUsage);
  } catch (error) {
    console.error('Usage tracking error:', error);
    return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAllUsage(
  startDate?: string | null,
  endDate?: string | null,
  limit = 10,
  skip = 0,
) {
  const where = buildOverlapWhere(startDate, endDate);
  const [data, total] = await Promise.all([
    prisma.usage.findMany({
      where,
      include: { subscription: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.usage.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page: Math.floor(skip / limit) + 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * User-wise: fetch ALL records for the period (no DB-level pagination —
 * pagination happens AFTER in-memory aggregation so page counts are correct),
 * then enrich with Hexclave display names.
 */
async function getUserWiseUsage(
  startDate?: string | null,
  endDate?: string | null,
  limit = 10,
  page = 1,
) {
  const where = buildOverlapWhere(startDate, endDate);

  // Fetch every record in the period so we can aggregate correctly
  const allRecords = await prisma.usage.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });

  // Aggregate by stackUserId
  const byUser = new Map<
    string,
    {
      stackUserId: string;
      subscriptionIds: string[];
      totalUsage: ReturnType<typeof ZERO_METRICS>;
      totalOperations: number;
      latestPeriodStart: Date;
      latestPeriodEnd: Date;
      lastUpdated: Date;
    }
  >();

  for (const record of allRecords) {
    const existing = byUser.get(record.stackUserId);
    if (!existing) {
      byUser.set(record.stackUserId, {
        stackUserId: record.stackUserId,
        subscriptionIds: [record.subscriptionId],
        totalUsage: {
          postsUsed: record.postsUsed,
          aiPostersUsed: record.aiPostersUsed,
          aiReviewRepliesUsed: record.aiReviewRepliesUsed,
          scheduledPostsUsed: record.scheduledPostsUsed,
          geoGridScansUsed: record.geoGridScansUsed,
          reviewPostersUsed: record.reviewPostersUsed,
          keywordTrackingUsed: record.keywordTrackingUsed,
          aiImageUsed: record.aiImageUsed,
        },
        totalOperations: sumMetrics(record),
        latestPeriodStart: record.periodStart,
        latestPeriodEnd: record.periodEnd,
        lastUpdated: record.updatedAt,
      });
    } else {
      existing.subscriptionIds.push(record.subscriptionId);
      for (const k of VALID_METRICS) {
        existing.totalUsage[k] += record[k] as number;
      }
      existing.totalOperations = sumMetrics(existing.totalUsage);
      if (record.updatedAt > existing.lastUpdated) {
        existing.lastUpdated = record.updatedAt;
        existing.latestPeriodStart = record.periodStart;
        existing.latestPeriodEnd = record.periodEnd;
      }
    }
  }

  const aggregated = Array.from(byUser.values());
  const total = aggregated.length;

  // Paginate the aggregated list
  const skip = (page - 1) * limit;
  const pageSlice = aggregated.slice(skip, skip + limit);

  // Enrich only the current page with Hexclave user info
  const userMap = await fetchHexclaveUsers(pageSlice.map((u) => u.stackUserId));

  const data = pageSlice.map((u) => {
    const hUser = userMap.get(u.stackUserId) ?? null;
    return {
      ...u,
      displayName: displayName(hUser),
      email: hUser?.primary_email ?? null,
      profileImage: hUser?.profile_image_url ?? null,
    };
  });

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
}

async function getDateWiseUsage(startDate?: string | null, endDate?: string | null) {
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
  const end   = endDate   ? new Date(endDate)   : new Date();

  // Use overlap so we catch records that started before the window
  const records = await prisma.usage.findMany({
    where: {
      periodStart: { lte: end },
      periodEnd:   { gte: start },
    },
    orderBy: { periodStart: 'asc' },
  });

  const dateMap = new Map<
    string,
    { date: string; totalUsers: number; totalOperations: number; metrics: ReturnType<typeof ZERO_METRICS> }
  >();

  for (const record of records) {
    // Use the date that falls within our window (clamp to start if period started earlier)
    const effectiveDate = record.periodStart < start ? start : record.periodStart;
    const dateKey = effectiveDate.toISOString().split('T')[0];

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {
        date: dateKey,
        totalUsers: 0,
        totalOperations: 0,
        metrics: ZERO_METRICS(),
      });
    }

    const day = dateMap.get(dateKey)!;
    day.totalUsers++;
    for (const k of VALID_METRICS) {
      day.metrics[k] += record[k] as number;
    }
    day.totalOperations = sumMetrics(day.metrics);
  }

  return NextResponse.json({
    data: Array.from(dateMap.values()),
    period: { startDate: start, endDate: end },
  });
}

async function getTopUsage(metric: UsageMetricKey, limit: number) {
  const topRecords = await prisma.usage.findMany({
    where: { [metric]: { gt: 0 } },
    orderBy: { [metric]: 'desc' },
    take: limit,
  });

  const userMap = await fetchHexclaveUsers(topRecords.map((u) => u.stackUserId));

  return NextResponse.json({
    metric,
    data: topRecords.map((u) => {
      const hUser = userMap.get(u.stackUserId) ?? null;
      return {
        stackUserId: u.stackUserId,
        subscriptionId: u.subscriptionId,
        usageCount: u[metric],
        displayName: displayName(hUser),
        email: hUser?.primary_email ?? null,
        profileImage: hUser?.profile_image_url ?? null,
        periodStart: u.periodStart,
        periodEnd: u.periodEnd,
      };
    }),
    limit,
  });
}

async function getUserDetailedUsage(
  userId: string,
  startDate?: string | null,
  endDate?: string | null,
) {
  const overlapWhere = buildOverlapWhere(startDate, endDate);
  const where = { stackUserId: userId, ...overlapWhere };

  const [records, hUser] = await Promise.all([
    prisma.usage.findMany({
      where,
      include: { subscription: true },
      orderBy: { periodStart: 'desc' },
    }),
    fetchHexclaveUser(userId),
  ]);

  const totals = records.reduce((acc, record) => {
    for (const k of VALID_METRICS) acc[k] += record[k] as number;
    return acc;
  }, ZERO_METRICS());

  const mostUsedFeature =
    (Object.entries(totals) as [UsageMetricKey, number][])
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  return NextResponse.json({
    userId,
    displayName: displayName(hUser),
    email: hUser?.primary_email ?? null,
    totalRecords: records.length,
    totals,
    totalOperations: sumMetrics(totals),
    mostUsedFeature,
    history: records,
  });
}

async function getUsageSummary(startDate?: string | null, endDate?: string | null) {
  const where = buildOverlapWhere(startDate, endDate);
  const allUsage = await prisma.usage.findMany({ where });

  const totals = allUsage.reduce(
    (acc, record) => {
      acc.totalUsers++;
      for (const k of VALID_METRICS) acc[k] += record[k] as number;
      return acc;
    },
    { totalUsers: 0, ...ZERO_METRICS() } as { totalUsers: number } & ReturnType<typeof ZERO_METRICS>,
  );

  const n = totals.totalUsers || 1;
  const averagePerUser = Object.fromEntries(
    VALID_METRICS.map((k) => [`average_${k}`, +(totals[k] / n).toFixed(2)]),
  );

  return NextResponse.json({
    period: { startDate: startDate ?? 'all', endDate: endDate ?? 'all' },
    summary: totals,
    averagePerUser,
  });
}

async function getUsageTrends(startDate?: string | null, endDate?: string | null) {
  const start = startDate
    ? new Date(startDate)
    : new Date(new Date().setDate(new Date().getDate() - 90));
  const end = endDate ? new Date(endDate) : new Date();

  const records = await prisma.usage.findMany({
    where: {
      periodStart: { lte: end },
      periodEnd:   { gte: start },
    },
    orderBy: { periodStart: 'asc' },
  });

  const monthlyMap = new Map<
    string,
    {
      month: string;
      totalOperations: number;
      activeUsers: Set<string>;
      metrics: ReturnType<typeof ZERO_METRICS>;
    }
  >();

  for (const record of records) {
    const monthKey = record.periodStart.toISOString().slice(0, 7);

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        totalOperations: 0,
        activeUsers: new Set(),
        metrics: ZERO_METRICS(),
      });
    }

    const month = monthlyMap.get(monthKey)!;
    month.activeUsers.add(record.stackUserId);
    for (const k of VALID_METRICS) {
      month.metrics[k] += record[k] as number;
    }
    month.totalOperations = sumMetrics(month.metrics);
  }

  const trends = Array.from(monthlyMap.values()).map(({ activeUsers, ...rest }) => ({
    ...rest,
    activeUsers: activeUsers.size,
  }));

  let growthRate = null;
  if (trends.length >= 2) {
    const latest   = trends[trends.length - 1];
    const previous = trends[trends.length - 2];
    if (previous.totalOperations > 0) {
      growthRate = {
        operationsGrowth: (
          ((latest.totalOperations - previous.totalOperations) / previous.totalOperations) * 100
        ).toFixed(2),
        usersGrowth:
          previous.activeUsers > 0
            ? (((latest.activeUsers - previous.activeUsers) / previous.activeUsers) * 100).toFixed(2)
            : null,
        period: `${previous.month} to ${latest.month}`,
      };
    }
  }

  return NextResponse.json({ trends, period: { startDate: start, endDate: end }, growthRate });
}