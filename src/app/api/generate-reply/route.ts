// app/api/generate-reply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Initialize Gemini AI (prefers GEMINI_API_KEY, falls back to AI_KEY)
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.AI_KEY! });

interface RequestBody {
  reviewText: string
  businessName: string
  guest: string
  rating?: string // Optional rating field (e.g., "FIVE" for 5 stars)
  incorrect?: string
}

interface ErrorResponse {
  error: string
  details?: string
}
  
interface SuccessResponse {
  reply: string
}

export async function POST(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    // Validate environment variable
    if (!process.env.GEMINI_API_KEY && !process.env.AI_KEY) {
      console.error('API key environment variable is not set')
      return NextResponse.json(
        {
          error: 'AI service configuration error',
          details: 'Missing API key configuration'
        },
        { status: 500 }
      )
    }

    // Parse and validate request body
    let body: RequestBody
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'JSON parsing failed'
        },
        { status: 400 }
      )
    }

    const { reviewText, businessName, guest, rating, incorrect } = body

    // Validate required fields
    if (!businessName || typeof businessName !== 'string') {
      return NextResponse.json(
        {
          error: 'Business name is required',
          details: 'businessName must be a non-empty string'
        },
        { status: 400 }
      )
    }

    if (!guest || typeof guest !== 'string') {
      return NextResponse.json(
        {
          error: 'Guest name is required',
          details: 'guest must be a non-empty string'
        },
        { status: 400 }
      )
    }

    // Trim and validate content
    const trimmedBusinessName = businessName.trim()
    const trimmedGuestName = guest.trim()
    const trimmedReviewText = reviewText ? reviewText.trim() : ''
    const trimmedRating = rating ? rating.trim().toUpperCase() : ''
    const trimmedIncorrect = incorrect ? incorrect.trim() : null

    if (trimmedGuestName.length === 0) {
      return NextResponse.json(
        { error: 'Guest name cannot be empty after trimming' },
        { status: 400 }
      )
    }

    if (trimmedBusinessName.length === 0) {
      return NextResponse.json(
        { error: 'Business name cannot be empty after trimming' },
        { status: 400 }
      )
    }

    // Map rating string to numeric value for sentiment logic
    const starMap: { [key: string]: number } = {
      'ONE': 1,
      'TWO': 2,
      'THREE': 3,
      'FOUR': 4,
      'FIVE': 5
    };
    const stars = starMap[trimmedRating] || 0; // 0 if invalid or missing

    // Define safety settings to prevent blocks
    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ];

    // Function to generate content with retry on empty text
    const generateWithRetry = async (modelName: string, prompt: string, maxRetries: number = 2) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await genAI.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 500,
          },
        });

        // Check for prompt-level blocks
        if (result.promptFeedback?.blockReason) {
          throw new Error('Prompt blocked by safety filters');
        }

        // Check for response-level safety blocks or empty candidates
        if (result.candidates.length === 0 || result.candidates[0].finishReason === 'SAFETY') {
          throw new Error('Response blocked by safety filters');
        }

        const generatedText = result.text;

        // If text is not empty, return it
        if (generatedText && generatedText.trim().length > 0) {
          return generatedText;
        }
      }

      throw new Error(`Failed after ${maxRetries} retries on ${modelName}: AI generated empty response`);
    };

    let generatedReply: string;
    let prompt: string;

    // Use corrected text if provided, otherwise use original review text
    const effectiveReviewText = trimmedIncorrect && trimmedIncorrect.length > 0 ? trimmedIncorrect : trimmedReviewText;
    const reviewLength = effectiveReviewText.length;

    if (effectiveReviewText.length === 0) {
      // Fallback for no review text: Use rating for sentiment if available
      let sentiment = 'neutral';
      if (stars >= 4) {
        sentiment = 'positive';
      } else if (stars <= 2 && stars > 0) {
        sentiment = 'negative';
      } else if (stars === 3) {
        sentiment = 'neutral';
      }

      // Improved prompt for rating-only reviews
      prompt = `You are a customer service representative for "${trimmedBusinessName}". A customer named "${trimmedGuestName}" has left only a ${stars}-star rating with no written review.

CRITICAL RULES:
1. KEEP IT BRIEF: 40-70 words maximum. They left no text, so don't write an essay.

2. DO NOT:
   - Say "thank you for your review" (there is no review)
   - Say "thank you for your feedback" (there is no feedback)  
   - Mention the star rating (e.g., "thanks for the 3 stars" or "we noted your 4-star rating")
   - Ask them to "share more about their experience"
   - Reference non-existent comments

3. FOR HIGH RATINGS (4-5 stars):
   - Express brief gratitude for visiting/choosing the business
   - Mention you're glad they had a good experience
   - Simple invitation to return
   - Keep it 2-3 sentences maximum
   - Example tone: "Hi [Name], glad you enjoyed your visit! Hope to see you again soon."

4. FOR LOW RATINGS (1-2 stars):
   - Acknowledge disappointment without being defensive
   - Brief apology ("Sorry we didn't meet your expectations")
   - Provide ONE clear next step (contact info or invitation to discuss)
   - Keep it 3-4 sentences maximum
   - Example tone: "Hi [Name], we're sorry we missed the mark. We'd love to hear what went wrong."

5. FOR NEUTRAL RATINGS (3 stars):
   - Brief acknowledgment of their visit (NOT the rating number)
   - Express openness to improvement
   - Invite them to share thoughts if they'd like
   - Keep it 2-3 sentences maximum
   - Example tone: "Hi [Name], thanks for stopping by. We'd love to know how we can improve for next time."

6. STRUCTURE:
   - Start with "Hi ${trimmedGuestName}," (NOT "Hi ,${trimmedGuestName}," - no space before comma)
   - One sentence acknowledging the rating
   - One relevant sentence about next steps or appreciation
   - Sign-off: Keep it simple and natural:
     * Just business name: "– ${trimmedBusinessName}"
     * Or casual: "– Team Thannikode" 
     * NEVER use: "– The ${trimmedBusinessName} Team" (too corporate and stiff)

7. FORMATTING:
   - Greeting format must be: "Hi [Name]," or "Dear [Name]," with NO space before the comma
   - Keep spacing clean and professional

DO NOT write corporate fluff. Match the minimal effort they put in with a proportional, genuine response.

Write ONLY the reply text:`;

    } else {
      // Validate review text length
      if (reviewLength > 10000) {
        return NextResponse.json(
          {
            error: 'Review text too long',
            details: 'Review text must be under 10000 characters'
          },
          { status: 400 }
        )
      }

      // Improved prompt for reviews WITH text
      prompt = `You are a customer service representative for "${trimmedBusinessName}". Your goal is to write a genuine, human response that matches the tone and length of the review.

Review Details:
- Customer: ${trimmedGuestName}
- Rating: ${stars > 0 ? stars + ' stars' : 'None'}
- Review Length: ${reviewLength} characters
- Review: "${effectiveReviewText}"
${trimmedIncorrect && trimmedIncorrect.length > 0 ? '\n- NOTE: This is a corrected version of a misspelled review. Respond to this corrected text.' : ''}

CRITICAL RULES:
0. HANDLE INCORRECT SPELLINGS:
   - Auto-detect and silently correct: typos, misspellings, missing/extra/swapped letters
   - Use context, sentiment, and common usage to determine intended word
   - Prioritize corrections within 1-2 character edits of original
   - Preserve intentional slang, abbreviations, and proper nouns
   - If ambiguous, choose most frequent/natural interpretation
   - Respond using corrected meaning - never mention the errors

1. MATCH THE REVIEW LENGTH: 
   - Short review (under 50 chars) = 25-50 word reply (keep it brief!)
   - Medium review (50-150 chars) = 50-90 word reply  
   - Long review (150+ chars) = 90-150 word reply
   - Very detailed complaints = up to 180 words MAX
   
2. NEVER OVER-RESPOND: If they wrote 5 words, don't write a paragraph. Match their effort level.

3. TONE MATCHING:
   - Casual review → casual, friendly response (e.g., "Hi ${trimmedGuestName}, glad you enjoyed it!")
   - Formal review → professional response (e.g., "Dear ${trimmedGuestName}, thank you for your feedback.")
   - Brief review → brief, warm response (2-3 sentences max)
   - DO NOT be overly enthusiastic for simple comments like "good" or "nice place"

3. ADDRESS SPECIFICS:
   - Pick 1-2 specific things they mentioned
   - Respond directly to those points
   - Don't list everything they said
   - If they mention specific staff, food items, or services, acknowledge those

4. FOR POSITIVE REVIEWS (4-5 stars):
   - Thank them genuinely but briefly
   - Mention ONE specific thing they liked (if they mentioned something specific)
   - Simple invitation to return (e.g., "Hope to see you again!")
   - Keep it proportional to their enthusiasm
   - For very short reviews (under 10 words), keep reply under 30 words

5. FOR NEGATIVE REVIEWS (1-2 stars):
   - Acknowledge the specific issue(s) mentioned (e.g., "We're sorry the service was slow")
   - Apologize sincerely without being defensive or making excuses
   - Offer ONE concrete action: refund offer, phone call, specific improvement
   - Provide contact info if appropriate
   - Keep it solution-focused, not explanation-heavy

6. FOR NEUTRAL REVIEWS (3 stars):
   - Acknowledge their experience without over-apologizing
   - Ask what could have been better (briefly)
   - Express genuine hope to improve
   - Keep it short and authentic

7. STRUCTURE & FORMATTING:
   - Start: "Hi ${trimmedGuestName}," (casual) or "Dear ${trimmedGuestName}," (formal)
   - CRITICAL: Format must be "Hi [Name]," NOT "Hi ,[Name]," - no space before the comma
   - Don't repeat their exact words back to them
   - Avoid filler phrases like "We're always happy when our guests enjoy their time"
   - Get to the point quickly
   - Sign-off: Keep it natural and simple:
     * Just business name: "– ${trimmedBusinessName}"
     * Or casual variant: "– Team Thannikode"
     * NEVER use: "– The ${trimmedBusinessName} Team" (sounds corporate and stiff)

8. AVOID THESE PHRASES:
   - "Thank you so much for taking the time"
   - "We're absolutely delighted/thrilled"
   - "We strive to create memorable experiences"
   - "It's wonderful to hear"
   - "We sincerely appreciate"
   - "Fantastic encouragement"
   - "We're always happy when our guests enjoy their time"
   - "Thanks for the [X] stars" or any mention of star ratings
   - Any excessive corporate jargon or filler phrases

9. WRITE LIKE A HUMAN:
   - Use contractions (we're, glad, it's, you're)
   - Keep sentences short and clear
   - Be warm but not robotic
   - Match their energy level
   - If they wrote 1 sentence, write 2-3 sentences max
   - Quality over quantity - every word should matter

Customer: ${trimmedGuestName}
Rating: ${stars > 0 ? stars + ' stars' : 'None'}
Review: "${effectiveReviewText}"

Write ONLY the reply text. Be human, not a corporate bot.`;
    }

    try {
      // Primary model with retry
      generatedReply = await generateWithRetry('gemini-2.5-flash', prompt);
    } catch (primaryError) {
      console.error("Primary model failed:", primaryError);
      // Fallback model with retry
      generatedReply = await generateWithRetry('gemini-2.5-flash-lite', prompt);
    }

    // Clean up the response
    const cleanedReply = generatedReply
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes from start/end
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .replace(/^(Dear|Hi|Hello)\s*,\s*(.*?),?/i, (match, greeting, name) => {
        // Fix greeting format: ensure "Hi Name," not "Hi ,Name," or "Hi, Name,"
        return `${greeting} ${name.trim()},`;
      });

    if (cleanedReply.length > 1000) {
      throw new Error('Generated reply is too long')
    }

    // Basic validation: ensure reply addresses the guest
    if (!cleanedReply.toLowerCase().includes(trimmedGuestName.toLowerCase().split(' ')[0])) {
      console.warn('Generated reply does not include guest name, regenerating...');
      // Could add a retry here if needed
    }

    return NextResponse.json(
      { reply: cleanedReply },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )

  } catch (error) {
    console.error('Error in generate-reply API route:', error)

    // Handle specific Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        return NextResponse.json(
          {
            error: 'AI service authentication failed',
            details: 'Invalid or expired API key'
          },
          { status: 401 }
        )
      }

      if (error.message.includes('RATE_LIMIT')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            details: 'Too many requests. Please try again later.'
          },
          { status: 429 }
        )
      }

      if (error.message.includes('QUOTA')) {
        return NextResponse.json(
          {
            error: 'API quota exceeded',
            details: 'Daily quota limit reached. Please try again tomorrow.'
          },
          { status: 429 }
        )
      }

      if (error.message.includes('safety filters')) {
        return NextResponse.json(
          {
            error: 'Content safety issue',
            details: 'The review content was flagged by safety filters. Please try a different input.'
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to generate reply',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported HTTP methods
export async function GET(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function PUT(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

export async function DELETE(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}