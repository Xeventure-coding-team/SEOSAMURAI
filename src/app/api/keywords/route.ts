import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { prisma } from "../../../../lib/prisma";
import { cleanGmbLocationId, getLocationById } from "@/lib/getLocationById";

interface TrackedKeywordData {
    id: string;
    keyword: string;
    location: string;
    locationId: string;
    targetDomain: string | null;
    currentRank: number | null;
    previousRank: number | null;
    rankChange: 'UP' | 'DOWN' | 'NEW' | 'SAME' | 'NOT_FOUND';
    rankChangeValue: number;
    url: string | null;
    title: string | null;
    snippet: string | null;
    canUpdate: boolean;
    nextUpdateTime: string;
    timeUntilUpdate: number;
    refreshRate: number;
    lastChecked: Date | null;
    isActive: boolean;
    createdAt: string;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const locationId = searchParams.get("locationId") // MongoDB _id

        const user = await stackServerApp.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!locationId) {
            return NextResponse.json(
                { error: "Missing locationId parameter" },
                { status: 400 }
            );
        }

        // ✅ Resolve real GMB location ID from MongoDB _id
        const dbLocation = await getLocationById(locationId)
        if (!dbLocation) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 })
        }

        const cleanLocationId = cleanGmbLocationId(dbLocation.location_id)
        const userId = user.id;
        const now = new Date();

        // ── Fetch all keywords — use cleanLocationId + userId (user-scoped, no conflict)
        const trackingEntries = await prisma.keywordTracking.findMany({
            where: { userId, locationId },
            orderBy: { createdAt: 'desc' }
        });

        if (trackingEntries.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
                metadata: {
                    total: 0,
                    location: null,
                    userId,
                    batchUpdateInfo: {
                        nextBatchUpdate: null,
                        refreshRate: 48
                    }
                }
            });
        }

        // ── Fetch all latest ranks in one query — no N+1 ─────────────────────
        const allRanks = await prisma.keywordRank.findMany({
            where: {
                userId,
                keyword: { in: trackingEntries.map(e => e.keyword) },
                location: { in: trackingEntries.map(e => e.location) },
            },
            orderBy: { createdAt: "desc" }
        })

        // Build lookup map — first entry per keyword::location = latest
        const rankMap = new Map<string, typeof allRanks[0]>()
        allRanks.forEach(r => {
            const key = `${r.keyword}::${r.location}`
            if (!rankMap.has(key)) rankMap.set(key, r)
        })

        // ── Build response data ───────────────────────────────────────────────
        const keywordsData: TrackedKeywordData[] = trackingEntries.map((entry) => {
            const latestRank = rankMap.get(`${entry.keyword}::${entry.location}`)

            const isNewKeyword = !entry.lastChecked && !entry.nextBatchUpdate

            const nextBatchUpdate = isNewKeyword
                ? null
                : entry.nextBatchUpdate ||
                new Date(entry.lastChecked!.getTime() + 48 * 60 * 60 * 1000)

            const timeUntilBatch = nextBatchUpdate
                ? Math.max(0, Math.floor((nextBatchUpdate.getTime() - now.getTime()) / 1000))
                : -1

            return {
                id: entry.id,
                keyword: entry.keyword,
                location: entry.location,
                locationId,
                targetDomain: entry.targetDomain,
                currentRank: latestRank?.rank ?? null,
                previousRank: latestRank?.previousRank ?? null,
                rankChange: (latestRank?.rankChange ?? 'NOT_FOUND') as TrackedKeywordData['rankChange'],
                rankChangeValue: latestRank?.rankChangeValue ?? 0,
                url: latestRank?.url ?? null,
                title: latestRank?.title ?? null,
                snippet: latestRank?.snippet ?? null,
                canUpdate: false,
                nextUpdateTime: nextBatchUpdate?.toISOString() ?? "pending",
                timeUntilUpdate: timeUntilBatch,
                refreshRate: 48,
                lastChecked: entry.lastChecked,
                isActive: entry.isActive,
                createdAt: entry.createdAt.toISOString()
            }
        })

        // ── Compute metadata ──────────────────────────────────────────────────
        const rankedCount = keywordsData.filter(k => k.currentRank !== null).length
        const avgRank = rankedCount > 0
            ? keywordsData
                .filter(k => k.currentRank !== null)
                .reduce((sum, k) => sum + k.currentRank!, 0) / rankedCount
            : 0

        const nextBatchUpdate = keywordsData.reduce((earliest, keyword) => {
            if (keyword.nextUpdateTime === "pending") return earliest
            const keywordBatch = new Date(keyword.nextUpdateTime)
            if (isNaN(keywordBatch.getTime())) return earliest
            return !earliest || keywordBatch < earliest ? keywordBatch : earliest
        }, null as Date | null)

        const pendingBatch = await prisma.batchUpdate.findFirst({
            where: { status: { in: ['PENDING', 'RUNNING'] } },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            success: true,
            data: keywordsData,
            metadata: {
                total: keywordsData.length,
                active: keywordsData.filter(k => k.isActive).length,
                paused: keywordsData.filter(k => !k.isActive).length,
                updateable: 0,
                ranked: rankedCount,
                averageRank: Math.round(avgRank * 100) / 100,
                locationId,
                userId,
                lastFetch: now.toISOString(),
                batchUpdateInfo: {
                    nextBatchUpdate: nextBatchUpdate?.toISOString() ?? null,
                    refreshRate: 48,
                    pendingBatch: pendingBatch ? {
                        id: pendingBatch.id,
                        status: pendingBatch.status,
                        totalKeywords: pendingBatch.totalKeywords,
                        processedKeywords: pendingBatch.processedKeywords,
                        startedAt: pendingBatch.startedAt?.toISOString() ?? null
                    } : null,
                    systemNote: "All keywords update together every 2 days via batch processing."
                }
            }
        });

    } catch (error) {
        console.error("Keywords API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch keywords" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const keywordId = searchParams.get("id");

        const user = await stackServerApp.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!keywordId) {
            return NextResponse.json({ error: "Missing keyword ID" }, { status: 400 });
        }

        const keywordEntry = await prisma.keywordTracking.findFirst({
            where: { id: keywordId, userId: user.id }
        });

        if (!keywordEntry) {
            return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
        }

        await prisma.keywordRank.deleteMany({
            where: {
                keyword: keywordEntry.keyword,
                location: keywordEntry.location,
                userId: user.id
            }
        });

        await prisma.keywordTracking.delete({
            where: { id: keywordId }
        });

        return NextResponse.json({
            success: true,
            message: "Keyword and all related data removed successfully"
        });

    } catch (error) {
        console.error("Delete keyword error:", error);
        return NextResponse.json(
            { error: "Failed to delete keyword" },
            { status: 500 }
        );
    }
}

export async function PUT() {
    return NextResponse.json(
        { error: "PUT method is not supported for this route" },
        { status: 405 }
    );
}