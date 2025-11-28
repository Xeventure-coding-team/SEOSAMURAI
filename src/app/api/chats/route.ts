// src/app/api/chats/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          where: { role: 'user' },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    const formatted = chats.map(chat => ({
      id: chat.id,
      preview: chat.messages[0]?.content.slice(0, 60) || 'New Chat',
      createdAt: chat.createdAt.toISOString(),
      messageCount: chat.messages.length + (chat.messages.length > 0 ? 1 : 0), // rough count
    }));

    return NextResponse.json({ chats: formatted });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}