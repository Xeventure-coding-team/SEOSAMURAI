import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../../lib/prisma"
import { stackServerApp } from "@/stack"
import axios from "axios"
import crypto from "crypto"

// ─── Encryption helpers ───────────────────────────────────────────────────────
// Store tokens encrypted at rest. Key must be 32 bytes (256-bit), set in env.
// NEVER use NEXT_PUBLIC_ prefix for secrets.

const ENCRYPTION_KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex") // 64 hex chars = 32 bytes
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":")
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error("Invalid ciphertext format")
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const encrypted = Buffer.from(encryptedHex, "hex")
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8")
}

// ─── GMB token validation ─────────────────────────────────────────────────────

async function validateGMBToken(token: string): Promise<boolean> {
  try {
    const res = await axios.get(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      }
    )
    return res.status === 200
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status
      if (status === 401) console.error("[Token API] Token invalid/expired")
      else if (status === 403) console.error("[Token API] Token lacks required permissions")
      else if (err.code === "ECONNABORTED") console.error("[Token API] Validation timeout")
      else console.error("[Token API] Validation error:", status, err.response?.data)
    } else {
      console.error("[Token API] Unexpected validation error:", err)
    }
    return false
  }
}

// ─── Rate limit helper (simple in-memory — replace with Redis in production) ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 10           // max requests per window per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) return false

  entry.count++
  return true
}

// ─── GET — retrieve token (decrypted, with expiry check) ─────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const integration = await prisma.gmbIntegration.findUnique({
      where: { userId: user.id },
      select: {
        accessToken: true,
        refreshToken: true,
        tokenExpiry: true,
        accountName: true,
        accountId: true,
        isActive: true,
      },
    })

    if (!integration) return NextResponse.json(null, { status: 404 })

    // Decrypt tokens before returning
    let accessToken: string | null = null
    let refreshToken: string | null = null

    try {
      if (integration.accessToken) accessToken = decrypt(integration.accessToken)
      if (integration.refreshToken) refreshToken = decrypt(integration.refreshToken)
    } catch (decryptErr) {
      console.error("[Token API] Decryption failed:", decryptErr)
      return NextResponse.json({ error: "Token data corrupted" }, { status: 500 })
    }

    return NextResponse.json({
      accessToken,
      refreshToken,
      tokenExpiry: integration.tokenExpiry,
      accountName: integration.accountName,
      accountId: integration.accountId,
      isActive: integration.isActive,
    })
  } catch (err) {
    console.error("[Token API] GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── POST — store token (validate + encrypt) ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = await request.json()
    const { accessToken, refreshToken, expiresIn, accountName, accountId } = body

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 })
    }

    // Validate token against Google API
    const isValid = await validateGMBToken(accessToken)
    if (!isValid) {
      return NextResponse.json(
        { error: "Token validation failed. Please reconnect your Google account." },
        { status: 401 }
      )
    }

    // Encrypt tokens before storing
    const encryptedAccess = encrypt(accessToken)
    const encryptedRefresh = refreshToken ? encrypt(refreshToken) : undefined

    const tokenExpiry = new Date(
      Date.now() + ((expiresIn ?? 3600) * 1000)
    )

    const integration = await prisma.gmbIntegration.upsert({
      where: { userId: user.id },
      update: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry,
        accountName: accountName ?? undefined,
        accountId: accountId ?? undefined,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        user_id: user.id, 
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry,
        accountName: accountName ?? undefined,
        accountId: accountId ?? undefined,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      id: integration.id,
      tokenExpiry: integration.tokenExpiry,
      accountName: integration.accountName,
      accountId: integration.accountId,
    })
  } catch (err) {
    console.error("[Token API] POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── PUT — update token (refresh flow) ───────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { accessToken, refreshToken, expiresIn } = body

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 })
    }

    const encryptedAccess = encrypt(accessToken)
    const encryptedRefresh = refreshToken ? encrypt(refreshToken) : undefined
    const tokenExpiry = new Date(Date.now() + ((expiresIn ?? 3600) * 1000))

    const integration = await prisma.gmbIntegration.update({
      where: { userId: user.id },
      data: {
        accessToken: encryptedAccess,
        ...(encryptedRefresh ? { refreshToken: encryptedRefresh } : {}),
        tokenExpiry,
        isActive: true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      tokenExpiry: integration.tokenExpiry,
    })
  } catch (err) {
    console.error("[Token API] PUT error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── DELETE — revoke integration ──────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    try {
      // Fully delete tokens rather than just setting isActive: false
      // A soft-delete still exposes encrypted tokens to DB compromise
      await prisma.gmbIntegration.update({
        where: { userId: user.id },
        data: {
          accessToken: "",
          refreshToken: null,
          isActive: false,
          updatedAt: new Date(),
        },
      })
    } catch (err: any) {
      if (err?.code === "P2025") {
        // Record doesn't exist — that's fine
        console.log("[Token API] No integration found to delete for user:", user.id)
      } else {
        throw err
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Token API] DELETE error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}