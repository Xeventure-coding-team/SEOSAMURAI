import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

// Gemini setup (prefers GEMINI_API_KEY, falls back to AI_KEY)
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.AI_KEY! });

interface RequestBody {
  occasion: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate Gemini API key
    if (!process.env.GEMINI_API_KEY && !process.env.AI_KEY) {
      console.error("API key environment variable not found")
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    const { occasion }: RequestBody = await request.json()
    if (!occasion || typeof occasion !== "string") {
      return NextResponse.json(
        { error: "occasion is required and must be a string" },
        { status: 400 }
      )
    }

    // 1️⃣ Generate an image prompt using Gemini
    const promptRequest = `Generate a short, descriptive image prompt (under 40 words) for "${occasion}". Focus on visual elements, colors, and composition. Example: "colorful birthday party with balloons and cake". Generate only the prompt text, nothing else.`

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

    const generatedPrompt = result.text.trim()

    if (!generatedPrompt) {
      console.error("Gemini returned empty prompt")
      return NextResponse.json(
        { error: "Failed to generate prompt" },
        { status: 500 }
      )
    }

    // 2️⃣ Try multiple Pollinations URL formats
    const seed = Math.floor(Math.random() * 1000000)
    
    const urlFormats = [
      // Format 1: Official docs format
      `https://pollinations.ai/p/${encodeURIComponent(generatedPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`,
      
      // Format 2: Alternative format
      `https://image.pollinations.ai/prompt/${encodeURIComponent(generatedPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`,
      
      // Format 3: Simpler format
      `https://pollinations.ai/p/${encodeURIComponent(generatedPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`,
      
      // Format 4: Most basic format
      `https://pollinations.ai/p/${encodeURIComponent(generatedPrompt)}&nologo=true`,
    ]

    // Try each URL format
    for (let i = 0; i < urlFormats.length; i++) {
      const imageUrl = urlFormats[i]

      try {
        // Test the URL with a GET request and timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

        const testResponse = await fetch(imageUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*,*/*',
          },
        })

        clearTimeout(timeoutId)

        if (testResponse.ok) {
          const contentType = testResponse.headers.get('content-type')
          
          // Check if it's actually an image
          if (contentType && contentType.startsWith('image/')) {
            
            return NextResponse.json({
              success: true,
              prompt: generatedPrompt,
              imageUrl: imageUrl,
              provider: "pollinations",
              seed: seed,
              formatUsed: i + 1,
              contentType: contentType
            })
          } else {
            console.log(`❌ Format ${i + 1} returned non-image content:`, contentType)
            // Continue to next format
          }
        } else {
          console.log(`❌ Format ${i + 1} failed with status:`, testResponse.status)
          // Continue to next format
        }

      } catch (fetchError) {
        console.log(`❌ Format ${i + 1} threw error:`, fetchError instanceof Error ? fetchError.message : 'Unknown error')
        // Continue to next format
      }
    }
    return NextResponse.json(
      { 
        error: "All image generation formats failed",
        prompt: generatedPrompt,
        testedUrls: urlFormats,
        seed: seed,
        suggestion: "Try calling the API again or check Pollinations service status"
      },
      { status: 500 }
    )

  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}