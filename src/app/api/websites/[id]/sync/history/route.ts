import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '../../../../../../../lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: websiteId } = await params;
 
    try {
        const history = await prisma.syncHistory.findMany({
            where: { websiteId },
            orderBy: { fetchedAt: 'desc' },
            take: 10,
        });
 
        const cachedData = await prisma.websiteCachedData.findUnique({
            where: { websiteId },
            select: {
                lastSyncedAt: true,
                nextSyncAt: true,
                isSyncing: true,
                lastSyncError: true,
                syncRetryCount: true,
            },
        });
 
        return NextResponse.json({
            current: cachedData,
            history,
        });
 
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to fetch sync history', details: error.message },
            { status: 500 }
        );
    }
}