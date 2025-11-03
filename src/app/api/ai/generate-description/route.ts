import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY ?? process.env.AI_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY (or AI_KEY) must be set in environment');
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { businessContext, businessName, primaryCategory, additionalCategories } = body;

    // If businessContext is placeholder text, rebuild it
    if (
      !businessContext ||
      businessContext.includes('Add a description') ||
      businessContext.includes('placeholder') ||
      businessContext.toLowerCase().includes('update your business') ||
      businessContext.toLowerCase().includes('highlight your services') ||
      businessContext.toLowerCase().includes('add details about') ||
      businessContext.trim().length < 20 // Increase minimum length
    ) {
      const parts = [];

      if (businessName) parts.push(`Business Name: ${businessName}`);
      if (primaryCategory) parts.push(`Business Type: ${primaryCategory}`);
      if (additionalCategories?.length > 0) {
        parts.push(`Additional Categories: ${additionalCategories.join(', ')}`);
      }

      businessContext = parts.length > 0 ? parts.join('\n') : null;
    }

    // Then check if we have enough info
    if (!businessContext || businessContext.trim().length < 20) {
      return NextResponse.json(
        { message: 'Insufficient business information provided' },
        { status: 400 }
      );
    }

    if (!businessContext || businessContext.trim().length < 10) {
      return NextResponse.json(
        { message: 'Insufficient business information provided' },
        { status: 400 }
      );
    }

    console.log('Processing businessContext:', businessContext); // DEBUG

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });
    const prompt = `Write a short, natural, and Google Business Profile–optimized description for this business. 

Business Details:
${businessContext}

Follow this style and structure:
- 2–3 sentences (150–300 characters total)
- Start with a friendly welcome mentioning the business name and/or location
- Use first-person voice ("we", "our", "us")
- Clearly describe what the business offers or specializes in
- Keep it conversational, approachable, and community-focused
- Naturally include relevant local or industry keywords (e.g., "shopping hub", "café", "clinic") — but no keyword stuffing
- End with an inviting call to action like “Visit us today,” “Stop by,” or “Call now”
- Avoid placeholders or generic phrases
- Output only the final description — no extra text or explanations

Match this tone and rhythm:
“Welcome to Thannikode Complex, your local shopping hub for everything you need! We’re proud to offer a diverse range of stores and services in the heart of Thannikode. Stop by and see what we have for you!”`;


    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 300,
        stopSequences: ['\n\n\n', 'Here\'s', 'I can', 'Please', 'To create'],
      },
    });

    const response = result.response;
    let generatedDescription = response.text()?.trim();

    if (!generatedDescription) {
      throw new Error('No text returned from the model');
    }

    // Clean up any unwanted prefixes or suffixes
    generatedDescription = generatedDescription
      .replace(/^(Here's|Here is|I've created|I've written|Description:|Business Description:)/i, '')
      .replace(/^["']|["']$/g, '') // Remove quotes
      .trim();

    // Fallback if AI still asks questions or returns template
    if (
      generatedDescription.includes('?') ||
      generatedDescription.toLowerCase().includes('please tell me') ||
      generatedDescription.toLowerCase().includes('i need to know') ||
      generatedDescription.length < 50
    ) {
      // Extract business info for fallback
      const businessNameMatch = businessContext.match(/Business Name:\s*(.+)/i);
      const categoryMatch = businessContext.match(/Business Type:\s*(.+)/i);
      const locationMatch = businessContext.match(/Location:\s*(.+)/i);

      const name = businessNameMatch?.[1]?.trim() || 'Our business';
      const category = categoryMatch?.[1]?.trim() || 'business';
      const location = locationMatch?.[1]?.split(',')[0]?.trim() || '';

      generatedDescription = `${name} is a premier ${category.toLowerCase()}${location ? ` located in ${location}` : ''}. We are committed to providing exceptional service and quality to our customers. Visit us today to experience the difference!`;
    }

    return NextResponse.json({
      generatedDescription,
      success: true
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating description:', error);

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate description';
    const errorDetails = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        message: errorMessage,
        details: errorDetails,
        success: false
      },
      { status: 500 }
    );
  }
}