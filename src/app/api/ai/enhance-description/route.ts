import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY ?? process.env.AI_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY (or AI_KEY) must be set in environment");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || description.trim().length < 20) {
      return NextResponse.json(
        { message: "Please provide a valid description." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    const prompt = `Enhance the following Google Business Profile description without changing its meaning.

Original Description:
"${description}"

Improve it by:
- Keeping it between 150–300 characters
- Maintaining the same tone and intent
- Making it sound smoother, more natural, and engaging
- Naturally adding relevant local or service-related keywords (without keyword stuffing)
- Ending with a friendly call to action
- Avoiding repetition or generic phrases
- Output only the improved description — nothing else.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 300,
      },
    });

    const response = result.response;
    let enhancedDescription = response.text()?.trim();

    if (!enhancedDescription) {
      throw new Error("No text returned from the model");
    }

    // Clean and normalize the output
    enhancedDescription = enhancedDescription
      .replace(/^["']|["']$/g, "")
      .replace(/^(Enhanced|Improved|Updated)\s*[:\-]?\s*/i, "")
      .trim();

    // Fallback if the AI output is unusable
    if (enhancedDescription.length < 80 || enhancedDescription.includes("?")) {
      enhancedDescription = description;
    }

    return NextResponse.json({ enhancedDescription, success: true });
  } catch (error) {
    console.error("Error enhancing description:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to enhance description";
    return NextResponse.json(
      { message: errorMessage, success: false },
      { status: 500 }
    );
  }
}
