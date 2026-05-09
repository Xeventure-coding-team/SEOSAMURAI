"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import GoogleBusinessConnect from "@/components/GMB/GoogleBusinessConnect"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@stackframe/stack"
import { useGMBStore } from "@/store/gmbStore"
import ErrorRender from "@/components/Error"

interface GMBAuthWrapperProps {
  children: React.ReactNode
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000          // refresh 5 min before expiry
const SESSION_CACHE_KEY = "gmb_session_valid"
const SESSION_CACHE_TTL_MS = 30 * 60 * 1000            // re-validate against API every 30 min
const MAX_INIT_RETRIES = 4
const RETRY_BASE_DELAY_MS = 1500                        // exponential back-off base

type AuthState = "loading" | "authenticated" | "unauthenticated" | "error"

// ─── Singleton refresh promise — prevents parallel refresh races ──────────────
let globalRefreshPromise: Promise<string | null> | null = null

const GMBAuthWrapper: React.FC<GMBAuthWrapperProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>("loading")
  const [error, setError] = useState<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const handleAuthenticated = useCallback(() => {
    setSessionCache(true)
    setAuthState("authenticated")
  }, [])


  const user = useUser()

  const {
    setAccessToken,
    setRefreshToken,
    setTokenExpiry,
    setAccountName,
    setAccountId,
    clearTokens,
    tokenExpiry: storeTokenExpiry,
  } = useGMBStore()

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const isTokenExpired = (expiry: Date | null): boolean => {
    if (!expiry) return true
    return Date.now() + TOKEN_REFRESH_BUFFER_MS > new Date(expiry).getTime()
  }

  /** Read/write a lightweight cache flag so fast navigations skip the API call */
  const getSessionCache = (): boolean => {
    try {
      const raw = sessionStorage.getItem(SESSION_CACHE_KEY)
      if (!raw) return false
      const { ts } = JSON.parse(raw)
      return Date.now() - ts < SESSION_CACHE_TTL_MS
    } catch {
      return false
    }
  }

  const setSessionCache = (valid: boolean) => {
    try {
      if (valid) {
        sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ ts: Date.now() }))
      } else {
        sessionStorage.removeItem(SESSION_CACHE_KEY)
      }
    } catch {
      // sessionStorage may be blocked (private mode) — safe to ignore
    }
  }

  // ─── Token refresh (singleton, race-safe) ──────────────────────────────────

  const doTokenRefresh = useCallback(async (): Promise<string | null> => {
    if (globalRefreshPromise) {
      console.log("[GMBAuth] Refresh already in-flight, awaiting existing promise")
      return globalRefreshPromise
    }

    globalRefreshPromise = (async () => {
      try {
        const res = await fetch("/api/gmb/refresh-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // No body — server always reads refresh token from DB
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error("[GMBAuth] Refresh failed:", err)
          return null
        }

        const data = await res.json()

        if (!mountedRef.current) return data.access_token

        setAccessToken(data.access_token)
        if (data.refresh_token) setRefreshToken(data.refresh_token)
        const expiry = new Date(Date.now() + data.expires_in * 1000)
        setTokenExpiry(expiry)

        scheduleProactiveRefresh(expiry)
        console.log("[GMBAuth] Token refreshed successfully")
        return data.access_token
      } catch (e) {
        console.error("[GMBAuth] Refresh exception:", e)
        return null
      } finally {
        globalRefreshPromise = null
      }
    })()

    return globalRefreshPromise
  }, [setAccessToken, setRefreshToken, setTokenExpiry])

  // ─── Schedule background refresh before expiry ─────────────────────────────

  const scheduleProactiveRefresh = useCallback(
    (expiry: Date) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)

      const msUntilRefresh =
        new Date(expiry).getTime() - Date.now() - TOKEN_REFRESH_BUFFER_MS

      if (msUntilRefresh <= 0) {
        // Already near expiry — refresh now
        doTokenRefresh()
        return
      }

      console.log(
        `[GMBAuth] Proactive refresh scheduled in ${Math.round(msUntilRefresh / 60000)} min`
      )

      refreshTimerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return
        const newToken = await doTokenRefresh()
        if (!newToken && mountedRef.current) {
          // Refresh failed — force re-auth
          setSessionCache(false)
          clearTokens()
          setAuthState("unauthenticated")
        }
      }, msUntilRefresh)
    },
    [doTokenRefresh, clearTokens]
  )

  // ─── Load & validate tokens from API (with retry) ──────────────────────────

  const validateAndLoadTokens = useCallback(
    async (attempt = 0): Promise<boolean> => {
      try {
        const res = await fetch("/api/gmb/token", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        })

        if (res.status === 404 || res.status === 401) return false

        if (!res.ok) {
          throw new Error(`Token API returned ${res.status}`)
        }

        const data = await res.json()

        if (!data || !data.isActive || !data.accessToken) return false

        // Populate store
        setAccessToken(data.accessToken)
        if (data.refreshToken) setRefreshToken(data.refreshToken)
        const expiry = data.tokenExpiry ? new Date(data.tokenExpiry) : null
        if (expiry) setTokenExpiry(expiry)
        if (data.accountName) setAccountName(data.accountName)
        if (data.accountId) setAccountId(data.accountId)

        // Refresh if expired or near expiry
        if (isTokenExpired(expiry)) {
          console.log("[GMBAuth] Token expired/near-expiry, refreshing...")
          const newToken = await doTokenRefresh()
          if (!newToken) return false
        } else if (expiry) {
          scheduleProactiveRefresh(expiry)
        }

        return true
      } catch (err) {
        console.warn(`[GMBAuth] validateAndLoadTokens attempt ${attempt + 1} failed:`, err)

        // Retry with exponential back-off on network errors
        if (attempt < MAX_INIT_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
          console.log(`[GMBAuth] Retrying in ${delay}ms...`)
          await new Promise((r) => setTimeout(r, delay))
          if (!mountedRef.current) return false
          return validateAndLoadTokens(attempt + 1)
        }

        return false
      }
    },
    [
      setAccessToken,
      setRefreshToken,
      setTokenExpiry,
      setAccountName,
      setAccountId,
      doTokenRefresh,
      scheduleProactiveRefresh,
    ]
  )

  // ─── Main auth check ────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true

    const checkAuthentication = async () => {
      if (!user?.id) {
        setAuthState("loading")
        return
      }

      // OAuth callback — hand off to GoogleBusinessConnect
      const params = new URLSearchParams(window.location.search)
      if (params.has("code") || params.has("error")) {
        setAuthState("unauthenticated")
        return
      }

      // Fast path: session cache hit → skip API call only if token is still fresh
      if (getSessionCache()) {
        if (storeTokenExpiry && !isTokenExpired(storeTokenExpiry)) {
          scheduleProactiveRefresh(storeTokenExpiry)
          setAuthState("authenticated")
          return
        }
        // Token is expired or missing — invalidate cache and fall through to full validation
        setSessionCache(false)
      }

      try {
        setError(null)
        const isValid = await validateAndLoadTokens()

        if (!mountedRef.current) return

        if (isValid) {
          setSessionCache(true)
          setAuthState("authenticated")
        } else {
          setSessionCache(false)
          clearTokens()
          setAuthState("unauthenticated")
        }
      } catch (e) {
        console.error("[GMBAuth] Auth check failed:", e)
        if (!mountedRef.current) return
        setSessionCache(false)
        setError("Failed to verify authentication. Please try again.")
        clearTokens()
        setAuthState("error")
      }
    }

    checkAuthentication()

    return () => {
      mountedRef.current = false
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (authState === "loading" || !user?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-10 w-40 mx-auto" />
        </div>
      </div>
    )
  }

  if (authState === "error") {
    return (
      <ErrorRender
        error={error ?? "We couldn't load this content. You can retry or report the issue."}
      />
    )
  }

  if (authState === "unauthenticated") {
    return <GoogleBusinessConnect onAuthenticated={handleAuthenticated} />
  }

  return <>{children}</>
}

export default GMBAuthWrapper