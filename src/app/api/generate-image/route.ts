import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
// Gemini setup
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.AI_KEY! });

// Pollinations API key (required now)
const POLLINATIONS_API_KEY = process.env.POLLinations_API_KEY;

if (!POLLINATIONS_API_KEY) {
  console.error("Pollinations API key not set in environment variables");
}

interface RequestBody {
  occasion: string;
}

export async function POST(request: NextRequest) {
  try {
    // Gemini key check
    if (!process.env.GEMINI_API_KEY && !process.env.AI_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const { occasion }: RequestBody = await request.json();
    if (!occasion || typeof occasion !== "string") {
      return NextResponse.json({ error: "occasion is required and must be a string" }, { status: 400 });
    }

    // 1. Generate refined prompt with Gemini
    const promptRequest = `Generate a short, descriptive image prompt (under 40 words) for "${occasion}". Focus on visual elements, colors, and composition. Example: "colorful birthday party with balloons and cake". Generate only the prompt text, nothing else.`;

    let result;
    try {
      result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptRequest,
      });
    } catch (geminiError) {
      console.error("Gemini generation error:", geminiError);
      // Optional: Fallback to another model if primary fails
      result = await genAI.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: promptRequest,
      });
    }

    const generatedPrompt = result.text.trim();
    if (!generatedPrompt) {
      return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
    }

    // 2. Call Pollinations modern endpoint (direct image)
    if (!POLLINATIONS_API_KEY) {
      return NextResponse.json(
        { error: "Pollinations API key not configured on server" },
        { status: 500 }
      );
    }

    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(generatedPrompt);
    const imageUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true&key=${POLLINATIONS_API_KEY}`;

    // Test fetch to confirm it's an image
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(imageUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/*,*/*",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Pollinations failed: ${response.status} - ${errorText}`);
      throw new Error(`Pollinations returned ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    // Success: return the direct generation URL (it's cached & permanent)
    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
      imageUrl: imageUrl,  // This is the direct link you can set in form.setValue("image_url", imageUrl)
      provider: "pollinations",
      seed,
    });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}