import { NextRequest, NextResponse } from "next/server"
import { stackServerApp } from "@/stack"

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID
    const clientSecret = process.env.NEXT_PUBLIC_CLIENT_SECRET
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URL

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({ error: "OAuth configuration missing" }, { status: 500 })
    }

    // Exchange authorization code for tokens
    const tokenData = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    })

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenData,
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error("Google token exchange failed:", errorData)
      return NextResponse.json({ 
        error: errorData.error_description || "Token exchange failed" 
      }, { status: 400 })
    }

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      return NextResponse.json({ error: "No access token received" }, { status: 400 })
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      scope: tokens.scope,
    })

  } catch (error) {
    console.error("Error exchanging code for token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}