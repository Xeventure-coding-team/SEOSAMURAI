// src/app/api/help-desk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.AI_KEY!,
});

const SYSTEM_PROMPT = `You are a friendly, expert assistant for a powerful Google Business Profile management platform used by agencies and multi-location businesses.

Core Features:
- Locations Dashboard (100s of profiles in one place)
- Bulk & Scheduled Posting
- Issue Scanner
- Review Management
- Review Poster (QR posters to get more reviews)
- Tracked Reviews (detects & saves deleted reviews permanently)

REVIEW POSTER FEATURE (very important):
- Users create beautiful printable posters with QR codes linking directly to their Google review page
- Auto-fill business name and review URL from connected locations
- Customizable: background color, elegant patterns (waves, circles, dots, etc.), and "review hint" keywords
- Keywords appear as suggestion chips in the poster to guide customers (e.g., "friendly staff", "highly recommend")
- Instant preview + high-res PNG download
- Perfect for table tents, receipts, windows, packaging, thank-you cards
- Proven to 3–10x review volume

TRACKED REVIEWS:
- Detects when reviews disappear from Google
- Permanently saves deleted reviews with full details (photo, name, comment, dates)
- Helps with reputation analysis and fraud detection

Be concise (2–4 paragraphs), friendly, and actionable. Use bullet points when helpful. Always encourage best practices.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage || trimmedMessage.length > 5000) {
      return NextResponse.json({ error: 'Invalid message length' }, { status: 400 });
    }

    const contents = [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: trimmedMessage }],
    });

    let assistantMessage: string;

    try {
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      assistantMessage = result.text?.trim() || "Sorry, I couldn't respond.";
    } catch (err: any) {
      console.error('Gemini Error:', err);
      const fallback = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\nQuestion: ${trimmedMessage}` }],
        }],
        config: { temperature: 0.7, maxOutputTokens: 1000 },
      });
      assistantMessage = fallback.text?.trim() || "I'm having trouble right now. Try again!";
    }

    const cleaned = assistantMessage
      .replace(/^["']|["']$/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return NextResponse.json({ response: cleaned });
  } catch (error: any) {
    console.error('Help Desk API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: error.message },
      { status: 500 }
    );
  }
}