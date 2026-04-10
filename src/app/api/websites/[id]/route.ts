import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const website = await prisma.website.findUnique({
      where: { id: params.id },
      include: { cachedData: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({ website });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch website' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const website = await prisma.website.update({
      where: { id: params.id },
      data: body,
      include: { cachedData: true },
    });

    return NextResponse.json({ website });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update website' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.website.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Website deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete website' }, { status: 500 });
  }
}