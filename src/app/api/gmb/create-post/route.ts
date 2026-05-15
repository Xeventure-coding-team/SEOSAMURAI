import { NextRequest, NextResponse } from "next/server"
import { stackServerApp } from "@/stack"
import { prisma } from "../../../../../lib/prisma"

// ─────────────────────────────────────────────────────────
//  TOGGLE: true  → Pollinations + gptimage model (testing)
//          false → Real OpenAI gpt-image-1 (production)
// ─────────────────────────────────────────────────────────
const testing = false

// ── Endpoints ─────────────────────────────────────────────
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations"
const HF_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"

// ── Models ────────────────────────────────────────────────
const IMAGE_MODEL = "gpt-image-2"

type ImageQuality = "low" | "medium" | "high" | "auto"

type GmbContext = {
  businessName: string
  description: string
  primaryCategory: string
  phoneNumber: string
  website: string
  address: string
  rating: number | null
  logoUrl: string
  coverPhotoUrl: string
}

// ── Types ────────────────────────────────────────────────
interface ImagePostRequestBody {
  location_name: string
  access_token: string
  gmb_account_id: string
  post_content: string
  language?: string
  color_preference?: string
  image_style?: "promotional" | "minimal" | "bold" | "elegant"
  image_size?: "1024x1024" | "1024x1792" | "1792x1024"
  image_quality?: "low" | "medium" | "high" | "auto"
  include_logo?: boolean
  cta_text?: string
  instructions?: string
}

// ── GMB token helpers ─────────────────────────────────────
async function refreshGMBToken(userId: string): Promise<string | null> {
  try {
    const gmb = await prisma.gmbIntegration.findUnique({ where: { userId } })
    if (!gmb?.refreshToken) return null

    if (gmb.tokenExpiry) {
      const buffer = 5 * 60 * 1000
      if (new Date().getTime() + buffer < gmb.tokenExpiry.getTime()) return gmb.accessToken
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: gmb.refreshToken,
        grant_type: "refresh_token",
      }),
    })
    if (!res.ok) return null

    const { access_token, expires_in } = await res.json()
    const tokenExpiry = new Date()
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expires_in)

    await prisma.gmbIntegration.update({
      where: { id: gmb.id },
      data: { accessToken: access_token, tokenExpiry, updatedAt: new Date() },
    })
    return access_token
  } catch {
    return null
  }
}

async function getValidAccessToken(userId: string, currentToken: string): Promise<string | null> {
  try {
    const test = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${currentToken}` } }
    )
    if (test.ok) return currentToken
    if (test.status === 401) return await refreshGMBToken(userId)
    return null
  } catch {
    return null
  }
}

async function fetchGMBContext(
  gmbLocationId: string,
  gmbAccountId: string,
  accessToken: string
): Promise<GmbContext> {
  // ── Cache check ────────────────────────────────────────
  try {
    const cached = await prisma.gmbContextCache.findUnique({
      where: { locationId: gmbLocationId },
    })
    if (cached) {
      const ageMs = Date.now() - new Date(cached.cachedAt).getTime()
      if (ageMs < 60 * 60 * 1000) {
        return cached.data as unknown as GmbContext
      }
    }
  } catch { }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  }

  // ── Two different base URLs for two different APIs ─────
  const INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1"
  const MEDIA_BASE = "https://mybusiness.googleapis.com/v4"

  // ── Fetch location + media in parallel ─────────────────
  const [locationRes, mediaRes] = await Promise.all([
    // ✅ Business Information API — for location details
    fetch(
      `${INFO_BASE}/locations/${gmbLocationId}` +
      `?readMask=name,storeCode,profile,labels,metadata,categories,phoneNumbers`,
      { headers }
    ),
    // ✅ Legacy v4 API — the ONLY one that serves media
    fetch(
      `${MEDIA_BASE}/accounts/${gmbAccountId}/locations/${gmbLocationId}/media`,
      { headers }
    ),
  ])

  if (!locationRes.ok) {
    const errorText = await locationRes.text()
    throw new Error(`GMB location fetch failed (${locationRes.status}): ${errorText}`)
  }

  const locationData = await locationRes.json()
  const mediaData = mediaRes.ok ? await mediaRes.json() : null
  const allItems: any[] = mediaData?.mediaItems ?? []

  console.log("Media API status:", mediaRes.status)
  console.log("All categories:", allItems.map((m: any) => m.locationAssociation?.category))

  // ── Pick logo and cover from the single media response ─
  const logo = allItems.find((m: any) => m.locationAssociation?.category === "LOGO")
    ?? allItems.find((m: any) => m.locationAssociation?.category === "PROFILE")
    ?? null

  const coverPhoto = allItems.find((m: any) => m.locationAssociation?.category === "COVER")
    ?? allItems.find((m: any) => m.locationAssociation?.category === "EXTERIOR")
    ?? allItems[0]
    ?? null

  // ── Places ─────────────────────────────────────────────
  let placesData: any = null
  const apiKey = process.env.PLACES_KEY

  if (locationData?.metadata?.placeId && apiKey) {
    const placesRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${locationData.metadata.placeId}` +
      `&fields=name,rating,formatted_address,website&key=${apiKey}`
    )
    if (placesRes.ok) placesData = (await placesRes.json()).result
  }

  // ── Assemble ───────────────────────────────────────────
  const result: GmbContext = {
    businessName: locationData?.profile?.name ?? placesData?.name ?? "the business",
    description: locationData?.profile?.description ?? "",
    primaryCategory: locationData?.categories?.primaryCategory?.displayName ?? "",
    phoneNumber: locationData?.phoneNumbers?.primaryPhone ?? "",
    website: placesData?.website ?? "",
    address: placesData?.formatted_address ?? "",
    rating: placesData?.rating ?? null,
    logoUrl: logo?.googleUrl ?? logo?.thumbnailUrl ?? "",
    coverPhotoUrl: coverPhoto?.googleUrl ?? coverPhoto?.thumbnailUrl ?? "",
  }

  // ── Cache ──────────────────────────────────────────────
  try {
    await prisma.gmbContextCache.upsert({
      where: { locationId: gmbLocationId },
      update: { data: result as any, cachedAt: new Date() },
      create: { locationId: gmbLocationId, data: result as any, cachedAt: new Date() },
    })
  } catch { }

  return result
}

function buildImagePrompt(ctx: GmbContext, body: ImagePostRequestBody): string {
  const {
    post_content,
    language = "English",
    color_preference,
    image_style = "promotional",
    cta_text,
    include_logo = true,
    instructions,
  } = body

  const cleanUrl = (url: string) => {
    try {
      const u = new URL(url)
        ;["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
          .forEach(p => u.searchParams.delete(p))
      return u.toString()
    } catch { return url }
  }

  const styleVibes: Record<string, string> = {
    promotional: "bold, energetic, scroll-stopping",
    minimal: "striking minimal, not boring",
    bold: "raw, fearless, typographically dominant",
    elegant: "luxury editorial, aspirational",
  }

  const data = [
    `Business: ${ctx.businessName}`,
    ctx.primaryCategory && `Category: ${ctx.primaryCategory}`,
    ctx.description && `Context (do not paste on poster): ${ctx.description.slice(0, 200)}`,
    color_preference && `Color palette: ${color_preference}`,
    (include_logo && ctx.logoUrl)
      ? `Official logo image: ${ctx.logoUrl}
Use ONLY this exact logo.
Do not redesign, recreate, stylize, or replace it.`
      : `CRITICAL:
Do NOT generate any logo, icon, symbol, emblem, badge, watermark, monogram, mascot, or brand mark.
Do NOT invent branding elements.
Display ONLY plain text for the business name:
"${ctx.businessName}"
No graphical logo of any kind.`,
    ctx.rating && Number(ctx.rating) > 0 && `Google Rating: ${ctx.rating} ★`,
    cta_text && `CTA: "${cta_text.slice(0, 50)}"`,
    ctx.phoneNumber && ctx.phoneNumber,
    ctx.website && cleanUrl(ctx.website),
    ctx.address && ctx.address.slice(0, 80),
  ].filter(Boolean).join("\n")

return `
You are a professional social media designer creating a real business poster.

Promote: "${post_content.slice(0, 200)}"
Style: ${styleVibes[image_style]}
Language: ${language}
${["Arabic", "Urdu"].includes(language) ? "Layout: RTL\n" : ""}
${data}
${instructions ? `\nPriority: ${instructions.slice(0, 500)}` : ""}

IMPORTANT RULES:
- Use only provided business assets
- Do not invent logos or icons
- Do not create fake branding
- No watermark
- No random symbols
- Text must be sharp and readable
- Keep layout clean and realistic

If no logo image is provided, use ONLY the business name as plain typography.

Stay strictly within the provided business assets and text.
`.trim()
}

// ── Image generator ───────────────────────────────────────
async function generateImage(prompt: string, body: ImagePostRequestBody) {
  if (testing) {
    // ── Hugging Face FLUX.1-schnell (testing) ─────────────
    const hfToken = process.env.HF_TOKEN
    if (!hfToken) throw new Error("HF_TOKEN is not set")

    const [width, height] = (body.image_size ?? "1024x1024").split("x").map(Number)

    const res = await fetch(HF_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width, height, num_inference_steps: 4, guidance_scale: 0.0 },
      }),
    })

    if (!res.ok) {
      const raw = await res.text()
      let msg = `HuggingFace error (${res.status})`
      try { msg = JSON.parse(raw)?.error ?? raw.slice(0, 200) } catch { }
      throw new Error(msg)
    }

    // Response is raw image bytes
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const contentType = res.headers.get("content-type") ?? "image/jpeg"

    return {
      url: `data:${contentType};base64,${base64}`,
      revised_prompt: null,
    }

  } else {
    // ── OpenAI (production) ───────────────────────────────
    const openAiKey = process.env.OPENAI_API_KEY
    if (!openAiKey) throw new Error("OPENAI_API_KEY is not set")

    const res = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: body.image_size ?? "1024x1024",
        quality: body.image_quality ?? "medium",
      }),
    })

    const raw = await res.text()

    if (!res.ok) {
      let msg = `OpenAI error (${res.status})`
      try { msg = JSON.parse(raw)?.error?.message ?? raw.slice(0, 200) } catch { }
      throw new Error(msg)
    }

    const data = JSON.parse(raw)


    const item = data.data?.[0]
    if (!item?.b64_json) throw new Error("No image data returned from OpenAI")

    return {
      url: `data:image/png;base64,${item.b64_json}`,
      revised_prompt: item?.revised_prompt ?? null,
    }
  }
}

// ── Route handler ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: "User authentication required" }, { status: 401 })
    }

    const body: ImagePostRequestBody = await req.json()
    const { location_name, access_token, gmb_account_id, post_content } = body

    if (!location_name || !access_token || !gmb_account_id || !post_content?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields", required: ["location_name", "access_token", "gmb_account_id", "post_content"] },
        { status: 400 }
      )
    }

    const dbLocation = await prisma.locations.findUnique({
      where: { id: location_name },
      select: { location_id: true },
    })
    if (!dbLocation) return NextResponse.json({ error: "Location not found" }, { status: 404 })

    const gmbLocationId = dbLocation.location_id.replace(/^locations\//, "")
    const cleanAccountId = gmb_account_id.replace(/^accounts\//, "")

    const validToken = await getValidAccessToken(user.id, access_token)
    if (!validToken) {
      return NextResponse.json(
        { error: "Session expired. Please reconnect Google My Business." },
        { status: 401 }
      )
    }

    const gmbContext = await fetchGMBContext(gmbLocationId, cleanAccountId, validToken)
    const imagePrompt = buildImagePrompt(gmbContext, body)
    const image = await generateImage(imagePrompt, body)

    return NextResponse.json({
      image: {
        url: image.url,
        revised_prompt: image.revised_prompt,
        prompt_used: imagePrompt,
        size: body.image_size ?? "1024x1024",
        quality: body.image_quality ?? "medium",
      },
      meta: {
        businessName: gmbContext.businessName,
        category: gmbContext.primaryCategory,
        address: gmbContext.address,
        logoUrl: gmbContext.logoUrl,
        coverPhotoUrl: gmbContext.coverPhotoUrl,
        provider: testing ? "huggingface/FLUX.1-schnell (testing)" : "openai (production)",
        model: testing ? "black-forest-labs/FLUX.1-schnell" : IMAGE_MODEL,
        defaults_used: {
          language: body.language ?? "English",
          color_preference: body.color_preference ?? "auto (derived from category)",
          image_style: body.image_style ?? "promotional",
          image_size: body.image_size ?? "1024x1024",
          image_quality: body.image_quality ?? "standard",
          cta_text: body.cta_text ?? null,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Image generation failed",
        debug: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}