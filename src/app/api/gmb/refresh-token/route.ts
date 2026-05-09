import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../../lib/prisma"
import { stackServerApp } from "@/stack"
import crypto from "crypto"

// ─── Encryption (same helpers as token-route — extract to lib/crypto.ts in prod) ──

const ENCRYPTION_KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex")
const IV_LENGTH = 16

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
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

// ─── Rate limiting ────────────────────────────────────────────────────────────

const refreshRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const REFRESH_RATE_LIMIT_WINDOW_MS = 60_000
const REFRESH_RATE_LIMIT_MAX = 5 // token refresh max 5 times/min per user

function checkRefreshRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = refreshRateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    refreshRateLimitMap.set(userId, { count: 1, resetAt: now + REFRESH_RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= REFRESH_RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// ─── POST — refresh access token ──────────────────────────────────────────────
// Security: refresh token is ALWAYS read from DB — never accepted from request body.
// This prevents an attacker from using an arbitrary refresh token even if authenticated.

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!checkRefreshRateLimit(user.id)) {
      return NextResponse.json({ error: "Too many refresh attempts" }, { status: 429 })
    }

    // Always read refresh token from DB — never from body
    const integration = await prisma.gmbIntegration.findUnique({
      where: { userId: user.id },
      select: {
        refreshToken: true,
        isActive: true,
        tokenExpiry: true,
      },
    })

    if (!integration?.isActive || !integration.refreshToken) {
      return NextResponse.json(
        { error: "No active integration found. Please reconnect your account." },
        { status: 400 }
      )
    }

    // Decrypt stored refresh token
    let decryptedRefreshToken: string
    try {
      decryptedRefreshToken = decrypt(integration.refreshToken)
    } catch (err) {
      console.error("[Refresh API] Failed to decrypt refresh token:", err)
      // Mark integration as invalid — token data is corrupted
      await prisma.gmbIntegration.update({
        where: { userId: user.id },
        data: { isActive: false, updatedAt: new Date() },
      })
      return NextResponse.json(
        { error: "Token data corrupted. Please reconnect your account." },
        { status: 400 }
      )
    }

    // Exchange with Google
    // NOTE: CLIENT_SECRET must NOT have NEXT_PUBLIC_ prefix — server-only
    const googleRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
        client_secret: process.env.NEXT_PUBLIC_CLIENT_SECRET!,
        refresh_token: decryptedRefreshToken,
        grant_type: "refresh_token",
      }),
    })

    const data = await googleRes.json()

    if (!googleRes.ok) {
      console.error("[Refresh API] Google token refresh failed:", data)

      if (data.error === "invalid_grant") {
        // Refresh token is revoked/expired — force re-auth
        await prisma.gmbIntegration.update({
          where: { userId: user.id },
          data: {
            accessToken: "",
            refreshToken: null,
            isActive: false,
            updatedAt: new Date(),
          },
        })
        return NextResponse.json(
          { error: "Session expired. Please reconnect your Google account." },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: data.error_description ?? data.error ?? "Token refresh failed" },
        { status: 400 }
      )
    }

    // Encrypt new tokens before storing
    const newEncryptedAccess = encrypt(data.access_token)
    // Google may not always return a new refresh token — keep the old one if not provided
    const newEncryptedRefresh = data.refresh_token
      ? encrypt(data.refresh_token)
      : integration.refreshToken  // already encrypted

    const tokenExpiry = new Date(Date.now() + data.expires_in * 1000)

    await prisma.gmbIntegration.update({
      where: { userId: user.id },
      data: {
        accessToken: newEncryptedAccess,
        refreshToken: newEncryptedRefresh,
        tokenExpiry,
        isActive: true,
        updatedAt: new Date(),
      },
    })

    // Return decrypted access token to client (refresh token stays server-side)
    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type ?? "Bearer",
      // Intentionally NOT returning refresh_token to client
    })
  } catch (err) {
    console.error("[Refresh API] POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── GET — check token status ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const integration = await prisma.gmbIntegration.findUnique({
      where: { userId: user.id },
      select: {
        refreshToken: true,
        isActive: true,
        tokenExpiry: true,
        accessToken: true,
      },
    })

    if (!integration) {
      return NextResponse.json({
        hasValidRefreshToken: false,
        isTokenExpired: true,
        canRefresh: false,
        hasIntegration: false,
      })
    }

    const hasValidRefreshToken = integration.isActive && !!integration.refreshToken
    const isTokenExpired = integration.tokenExpiry
      ? new Date() > integration.tokenExpiry
      : true

    return NextResponse.json({
      hasValidRefreshToken,
      isTokenExpired,
      canRefresh: hasValidRefreshToken,
      hasIntegration: true,
      hasAccessToken: !!integration.accessToken,
      isActive: integration.isActive,
      tokenExpiry: integration.tokenExpiry,
    })
  } catch (err) {
    console.error("[Refresh API] GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}