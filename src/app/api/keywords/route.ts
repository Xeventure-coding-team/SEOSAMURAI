import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { prisma } from "../../../../lib/prisma";

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
        const locationId = searchParams.get("locationId");

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

        const userId = user.id;
        const now = new Date();

        // Build where clause
        const whereClause: any = {
            userId,
            isActive: true
        };

        whereClause.locationId = locationId;

        // Get all tracked keywords for the user
        const trackingEntries = await prisma.keywordTracking.findMany({
            where: whereClause,
            orderBy: [
                { createdAt: 'desc' }
            ]
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

        // Get latest rank data for each keyword
        const keywordRankPromises = trackingEntries.map(async (entry) => {
            const latestRank = await prisma.keywordRank.findFirst({
                where: {
                    keyword: entry.keyword,
                    location: entry.location,
                    userId: entry.userId
                },
                orderBy: { createdAt: 'desc' }
            });

            // Use nextBatchUpdate from database, or calculate 2 days from last check/creation
            const nextBatchUpdate = entry.nextBatchUpdate ||
                new Date((entry.lastChecked || entry.createdAt).getTime() + (48 * 60 * 60 * 1000));

            const timeUntilBatch = Math.max(0, Math.floor((nextBatchUpdate.getTime() - now.getTime()) / 1000));

            const keywordData: TrackedKeywordData = {
                id: entry.id,
                keyword: entry.keyword,
                location: entry.location,
                locationId: locationId || "default",
                targetDomain: entry.targetDomain,
                currentRank: latestRank?.rank || null,
                previousRank: latestRank?.previousRank || null,
                rankChange: latestRank?.rankChange || 'NOT_FOUND',
                rankChangeValue: latestRank?.rankChangeValue || 0,
                url: latestRank?.url || null,
                title: latestRank?.title || null,
                snippet: latestRank?.snippet || null,
                canUpdate: false, // Always false for batch system
                nextUpdateTime: nextBatchUpdate.toISOString(),
                timeUntilUpdate: timeUntilBatch,
                refreshRate: 48, // Fixed to 48 hours for batch system
                lastChecked: entry.lastChecked,
                isActive: entry.isActive,
                createdAt: entry.createdAt.toISOString()
            };

            return keywordData;
        });

        const keywordsData = await Promise.all(keywordRankPromises);

        // Sort by creation date (most recent first)
        keywordsData.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Calculate summary stats
        const rankedCount = keywordsData.filter(k => k.currentRank !== null).length;
        const avgRank = keywordsData
            .filter(k => k.currentRank !== null)
            .reduce((sum, k) => sum + k.currentRank!, 0) / rankedCount || 0;

        // Find the earliest next batch update time (when all keywords will update)
        const nextBatchUpdate = keywordsData.reduce((earliest, keyword) => {
            const keywordBatch = new Date(keyword.nextUpdateTime);
            return !earliest || keywordBatch < earliest ? keywordBatch : earliest;
        }, null as Date | null);

        // Check if there's a pending batch update
        const pendingBatch = await prisma.batchUpdate.findFirst({
            where: {
                status: { in: ['PENDING', 'RUNNING'] }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            data: keywordsData,
            metadata: {
                total: keywordsData.length,
                updateable: 0, // Always 0 for batch system
                ranked: rankedCount,
                averageRank: Math.round(avgRank * 100) / 100,
                locationId: locationId,
                userId,
                lastFetch: now.toISOString(),
                batchUpdateInfo: {
                    nextBatchUpdate: nextBatchUpdate?.toISOString() || null,
                    refreshRate: 48, // Consistent 48-hour batch cycle
                    pendingBatch: pendingBatch ? {
                        id: pendingBatch.id,
                        status: pendingBatch.status,
                        totalKeywords: pendingBatch.totalKeywords,
                        processedKeywords: pendingBatch.processedKeywords,
                        startedAt: pendingBatch.startedAt?.toISOString() || null
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

// DELETE method to remove keyword and all related data
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

        // First, find the keyword to verify ownership
        const keywordEntry = await prisma.keywordTracking.findFirst({
            where: { id: keywordId, userId: user.id }
        });

        if (!keywordEntry) {
            return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
        }

        const keyword = keywordEntry.keyword;
        const location = keywordEntry.location;

        // Delete related entries in keywordRank table
        await prisma.keywordRank.deleteMany({
            where: {
                keyword,
                location,
                userId: user.id
            }
        });

        // Delete the main keywordTracking entry
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