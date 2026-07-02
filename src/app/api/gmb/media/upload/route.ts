import { canUse, canUseErrorMessage, getCode } from "@/lib/actions/can-use";
import { cleanGmbAccountId, cleanGmbLocationId, getLocationById } from "@/lib/getLocationById";
import { stackServerApp } from "@/stack";
import { NextRequest, NextResponse } from "next/server"



/**
 * Parse "accounts/AAA/locations/BBB" → { accountId: "AAA", locationId: "BBB" }
 * Also handles bare "accounts/AAA" (locationId will be empty string — caught by validation)
 */
function parseLocationName(locationName: string): { accountId: string; locationId: string } {
  const match = locationName.match(/accounts\/([^/]+)\/locations\/([^/]+)/)
  if (match) return { accountId: match[1], locationId: match[2] }

  // Fallback: maybe just "locations/BBB"
  const locOnly = locationName.match(/(?:^|\/)locations\/([^/]+)/)
  return { accountId: "", locationId: locOnly ? locOnly[1] : locationName }
}

function tryParseJson(text: string): any {
  try { return JSON.parse(text) } catch { return text }
}

async function deleteFromImageKit(fileId: string, basicAuth: string): Promise<void> {
  try {
    const res = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${basicAuth}` },
    })
    console.log("[ImageKit] delete", fileId, res.ok ? "✓" : await res.text())
  } catch (err) {
    console.warn("[ImageKit] delete error:", err)
  }
}

export async function POST(req: NextRequest) {
  let imagekitFileId: string | null = null
  let basicAuth = ""

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const locationName = formData.get("locationName") as string | null
    const category = (formData.get("category") as string) || "ADDITIONAL"
    const accessToken = formData.get("accessToken") as string | null

    const user = await stackServerApp.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const check = await canUse(user.id, "media-upload");
    if (!check.ok) {
      return NextResponse.json({
        success: false,
        error: canUseErrorMessage(check, "media-upload"),
        code: getCode(check),
      });
    }

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (!locationName) return NextResponse.json({ error: "locationName is required" }, { status: 400 })
    if (!accessToken) return NextResponse.json({ error: "accessToken is required" }, { status: 401 })

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 })
    }

    const isVideo = file.type.startsWith("video/")
    const maxSize = isVideo ? 75 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max: ${isVideo ? "75 MB for videos" : "5 MB for images"}` },
        { status: 400 }
      )
    }

    // ----------------------------------------------------------------
    // Step 1: Upload to ImageKit → get a public URL
    // ----------------------------------------------------------------
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
    if (!privateKey) return NextResponse.json({ error: "IMAGEKIT_PRIVATE_KEY not configured" }, { status: 500 })

    basicAuth = Buffer.from(`${privateKey}:`).toString("base64")

    const ikFormData = new FormData()
    ikFormData.append("file", file)
    ikFormData.append("fileName", `gmb-temp-${Date.now()}`)
    ikFormData.append("folder", "/gmb-temp")
    ikFormData.append("useUniqueFileName", "true")
    ikFormData.append("isPrivateFile", "false")

    const ikRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}` },
      body: ikFormData,
    })

    const ikText = await ikRes.text()
    if (!ikRes.ok) {
      console.error("[ImageKit] upload failed:", ikText)
      return NextResponse.json({ error: "ImageKit upload failed", details: ikText }, { status: 500 })
    }

    const ikData = JSON.parse(ikText)
    const publicUrl: string = ikData.url
    imagekitFileId = ikData.fileId
    console.log("[ImageKit] uploaded →", publicUrl, "| fileId:", imagekitFileId)

    // ----------------------------------------------------------------
    // Step 2: Resolve the Mongo location _id → real GMB location ID
    // ----------------------------------------------------------------
    const { accountId, locationId: rawLocationId } = parseLocationName(locationName)

    if (!accountId || !rawLocationId) {
      await deleteFromImageKit(imagekitFileId!, basicAuth)
      return NextResponse.json(
        { error: `Could not parse accountId/locationId from: "${locationName}". Expected format: "accounts/AAA/locations/BBB"` },
        { status: 400 }
      )
    }

    const locationRecord = await getLocationById(rawLocationId)
    if (!locationRecord) {
      await deleteFromImageKit(imagekitFileId!, basicAuth)
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    const gmbLocationId = cleanGmbLocationId(locationRecord.location_id)
    const cleanAccountId = cleanGmbAccountId(accountId)

    const gmbApiUrl = `https://mybusiness.googleapis.com/v4/accounts/${cleanAccountId}/locations/${gmbLocationId}/media`
    console.log("[GMB media upload] POST →", gmbApiUrl)

    const gmbRes = await fetch(gmbApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mediaFormat: isVideo ? "VIDEO" : "PHOTO",
        locationAssociation: { category },
        sourceUrl: publicUrl,
      }),
    })

    const gmbText = await gmbRes.text()
    console.log("[GMB media upload] response:", gmbRes.status, gmbText.slice(0, 300))

    await deleteFromImageKit(imagekitFileId!, basicAuth)
    imagekitFileId = null

    if (!gmbRes.ok) {
      console.error("[GMB media upload] failed:", gmbText)
      return NextResponse.json(
        { error: "Something went wrong, Please try again later", details: tryParseJson(gmbText) },
        { status: gmbRes.status }
      )
    }

    return NextResponse.json({ success: true, mediaItem: tryParseJson(gmbText) })

  } catch (error) {
    console.error("[GMB media upload] Unexpected error:", error)
    if (imagekitFileId && basicAuth) {
      await deleteFromImageKit(imagekitFileId, basicAuth).catch(() => { })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET — list media for a location
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const locationName = searchParams.get("locationName")
    const accessToken = searchParams.get("accessToken")
    const pageToken = searchParams.get("pageToken") || ""
    const pageSize = searchParams.get("pageSize") || "20"

    if (!locationName) return NextResponse.json({ error: "locationName is required" }, { status: 400 })
    if (!accessToken) return NextResponse.json({ error: "accessToken is required" }, { status: 401 })

    const { accountId, locationId } = parseLocationName(locationName)
    const params = new URLSearchParams({ pageSize })
    if (pageToken) params.set("pageToken", pageToken)

    const gmbRes = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const text = await gmbRes.text()
    if (!gmbRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch media from GMB", details: tryParseJson(text) },
        { status: gmbRes.status }
      )
    }

    return NextResponse.json(tryParseJson(text))
  } catch (error) {
    console.error("[GMB media list] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}