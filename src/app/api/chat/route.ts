
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../../../../lib/prisma';

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.AI_KEY!,
});

const SYSTEM_PROMPT = `You are a helpful assistant specialized in Google My Business (GMB), now known as Google Business Profile.

Your expertise includes:
- Setting up and verifying GMB profiles
- Optimizing business information and categories
- Managing and responding to customer reviews
- Using GMB posts and updates effectively
- Understanding GMB insights and analytics
- Local SEO best practices for GMB
- Troubleshooting common GMB issues
- GMB API and integration questions

Guidelines:
- Only answer questions related to Google My Business/Google Business Profile
- If asked about unrelated topics, politely redirect to GMB topics
- Provide accurate, actionable advice
- Be concise but thorough
- Use examples when helpful

If the question is not related to GMB, respond with: "I'm specifically designed to help with Google My Business questions. Please ask me anything about GMB setup, optimization, reviews, or local SEO."`;

// POST - Send message (create new chat or continue existing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, chatId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage || trimmedMessage.length > 10000) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    let chat;

    if (chatId) {
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

      // 10 message limit per chat (5 user + 5 assistant)
      if (chat.messages.length >= 10) {
        return NextResponse.json(
          { error: 'Message limit reached', limitReached: true },
          { status: 429 }
        );
      }
    } else {
      // Create new chat - NO LIMIT on number of chats
      chat = await prisma.chat.create({
        data: {},
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: trimmedMessage,
      },
    });

    // Build history for Gemini
    const history = chat.messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
    history.push({ role: 'user', parts: [{ text: trimmedMessage }] });

    // Call Gemini
    let assistantMessage: string;

    try {
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: history,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      assistantMessage = result.text?.trim() || "Sorry, I couldn't respond.";
    } catch (err: any) {
      // Fallback if history fails
      const fallback = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT + "\n\nQuestion: " + trimmedMessage }],
          },
        ],
      });
      assistantMessage = fallback.text?.trim() || "I'm having trouble responding right now.";
    }

    // Clean and save assistant message
    const cleaned = assistantMessage.replace(/^["']|["']$/g, '').replace(/\n{3,}/g, '\n\n');

    const savedMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: cleaned,
      },
    });

    const totalMessages = chat.messages.length + 2;
    const limitReached = totalMessages >= 10;

    return NextResponse.json({
      message: savedMessage,
      chatId: chat.id,
      messageCount: totalMessages,
      limitReached,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Load a specific chat by ID
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const chatId = url.searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
  }

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const formattedMessages = chat.messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    return NextResponse.json({
      messages: formattedMessages,
      chatId: chat.id,
      messageCount: chat.messages.length,
      limitReached: chat.messages.length >= 10,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load chat' }, { status: 500 });
  }
}
