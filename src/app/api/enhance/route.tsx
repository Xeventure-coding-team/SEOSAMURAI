import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Gemini setup (use GEMINI_API_KEY for preference, fallback to AI_KEY if needed)
const genAI = new GoogleGenAI({ apiKey: process.env.AI_KEY || process.env.GEMINI_API_KEY! });

interface RequestBody {
  occasion: string;
}

export async function POST(request: NextRequest) {
  try {
    // Validate Gemini API key
    if (!process.env.AI_KEY && !process.env.GEMINI_API_KEY) {
      console.error("AI_KEY or GEMINI_API_KEY environment variable not found");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const { occasion }: RequestBody = await request.json();
    if (!occasion || typeof occasion !== "string") {
      return NextResponse.json(
        { error: "occasion is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if the content is empty or just whitespace
    if (!occasion.trim()) {
      return NextResponse.json(
        { error: "No text found to enhance" },
        { status: 400 }
      );
    }

    // Generate enhanced text using Gemini
    const enhanceRequest = `Enhance and improve the following text for better engagement, clarity, and impact. Keep the original meaning but make it more compelling, well-structured, and polished. Only return the enhanced text, nothing else:

"${occasion}"`;

    let result;
    try {
      result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: enhanceRequest,
      });
    } catch (geminiError) {
      console.error("Gemini generation error:", geminiError);
      // Optional: Fallback to a different model if primary fails (e.g., pro version)
      result = await genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: enhanceRequest,
      });
    }

    const enhancedText = result.text.trim();

    if (!enhancedText) {
      console.error("Gemini returned empty enhanced text");
      return NextResponse.json(
        { error: "Failed to enhance text" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content: enhancedText,
      originalLength: occasion.length,
      enhancedLength: enhancedText.length
    });

  } catch (error) {
    console.error("Error in text enhancement:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Test endpoint to verify text enhancement is working
// =============================================================================
export async function GET(request: NextRequest) {
  try {
    if (!process.env.AI_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        error: "API key not configured",
        status: "failed"
      });
    }

    const testText = "This is a test";
    const testRequest = `Enhance and improve the following text: "${testText}"`;

    let result;
    try {
      result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: testRequest,
      });
    } catch (geminiError) {
      console.error("Gemini test generation error:", geminiError);
      // Optional: Fallback to a different model
      result = await genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: testRequest,
      });
    }

    const enhancedTest = result.text.trim();

    return NextResponse.json({
      status: "working",
      testInput: testText,
      testOutput: enhancedTest,
      modelUsed: "gemini-2.5-flash" // Update if fallback is used
    });

  } catch (error) {
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}