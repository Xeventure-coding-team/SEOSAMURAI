"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Loader2,
    CheckCircle,
    AlertCircle,
    Shield,
    Zap,
    BarChart3,
    MapPin,
    Star,
    Users,
    ArrowRight,
    RefreshCw,
    X,
    WifiOff,
} from "lucide-react"


interface GoogleBusinessConnectProps {
    onAuthenticated?: () => void
}

// ─── Types ───────────────────────────────────────────────────────────────────

type State =
    | "loading"           // initial check
    | "retrying"          // slow network — re-attempting silently
    | "connected"         // all good
    | "disconnected"      // no token found
    | "connecting"        // OAuth redirect in progress
    | "disconnecting"     // actively revoking
    | "processing-callback" // exchanging OAuth code
    | "error"

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CHECK_RETRIES = 4
const RETRY_BASE_DELAY_MS = 1200
const PROGRESS_TICK_MS = 250

// ─── CSRF state helpers ───────────────────────────────────────────────────────

function generateOAuthState(): string {
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("")
}

function saveOAuthState(state: string) {
    sessionStorage.setItem("gmb_oauth_state", state)
}

function validateAndClearOAuthState(receivedState: string | null): boolean {
    const stored = sessionStorage.getItem("gmb_oauth_state")
    sessionStorage.removeItem("gmb_oauth_state")
    return !!stored && stored === receivedState
}

// ─── Component ───────────────────────────────────────────────────────────────

const GoogleBusinessConnect: React.FC<GoogleBusinessConnectProps> = ({ onAuthenticated }) => {
    const [state, setState] = useState<State>("loading")
    const [accountName, setAccountName] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const [retryCount, setRetryCount] = useState(0)
    const mountedRef = useRef(true)

    const initCalledRef = useRef(false)

    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID as string
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URL as string
    const scopes = "https://www.googleapis.com/auth/business.manage"

    // ─── Progress ticker ───────────────────────────────────────────────────────

    useEffect(() => {
        const active = state === "processing-callback" || state === "connecting"
        if (!active) {
            setProgress(0)
            return
        }
        const interval = setInterval(() => {
            setProgress((p) => (p >= 90 ? p : p + 8))
        }, PROGRESS_TICK_MS)
        return () => clearInterval(interval)
    }, [state])

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    useEffect(() => {
        mountedRef.current = true
        initializeComponent()
        return () => {
            mountedRef.current = false
        }
    }, [])

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const safeSetState = (s: State) => {
        if (mountedRef.current) setState(s)
    }

    const cleanupURL = () => {
        const url = new URL(window.location.href)
        url.search = ""
        window.history.replaceState({}, document.title, url.toString())
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    const initializeComponent = async () => {

        if (initCalledRef.current) return
        initCalledRef.current = true

        safeSetState("loading")
        setError(null)

        const params = new URLSearchParams(window.location.search)
        const code = params.get("code")
        const oauthError = params.get("error")
        const receivedState = params.get("state")

        if (oauthError) {
            setError(`Authorization failed: ${oauthError}`)
            safeSetState("error")
            cleanupURL()
            return
        }

        if (code) {
            // CSRF check
            if (!validateAndClearOAuthState(receivedState)) {
                setError("Security check failed. Please try connecting again.")
                safeSetState("error")
                cleanupURL()
                return
            }
            await handleOAuthCallback(code)
            return
        }

        await checkExistingConnection()
    }

    // ─── Check existing connection with retry + slow-network UX ───────────────

    const checkExistingConnection = async (attempt = 0) => {
        if (attempt === 0) safeSetState("loading")
        if (attempt > 0) {
            safeSetState("retrying")
            setRetryCount(attempt)
        }

        try {
            const res = await fetch("/api/gmb/token", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                signal: AbortSignal.timeout(10_000), // 10s timeout per attempt
            })

            if (!mountedRef.current) return

            if (res.ok) {
                const data = await res.json()
                if (data?.accessToken && data?.isActive) {
                    setAccountName(data.accountName ?? "Google My Business Account")
                    safeSetState("connected")
                    onAuthenticated?.()
                    return
                }
            }

            // 401 / 404 → definitively not connected
            if (res.status === 401 || res.status === 404) {
                safeSetState("disconnected")
                return
            }

            throw new Error(`Unexpected status: ${res.status}`)
        } catch (err: any) {
            const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError"
            console.warn(`[GMBConnect] Check attempt ${attempt + 1} failed:`, err?.message)

            if (attempt < MAX_CHECK_RETRIES) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(1.8, attempt)
                await new Promise((r) => setTimeout(r, delay))
                if (!mountedRef.current) return
                return checkExistingConnection(attempt + 1)
            }

            // All retries exhausted
            if (isTimeout) {
                setError("Connection is slow. Please check your network and try again.")
            }
            safeSetState("disconnected")
        }
    }

    // ─── OAuth callback handler ───────────────────────────────────────────────

    const handleOAuthCallback = async (code: string) => {
        safeSetState("processing-callback")
        setError(null)
        setProgress(15)

        try {
            // 1. Exchange code for tokens
            const tokenRes = await fetch("/api/gmb/exchange-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            })

            if (!tokenRes.ok) {
                const errData = await tokenRes.json().catch(() => ({}))
                throw new Error(errData.error ?? "Failed to exchange authorization code")
            }

            const tokenData = await tokenRes.json()
            setProgress(45)

            // 2. Fetch account info
            let accountName: string | null = null
            let accountId: string | null = null

            try {
                const accountRes = await fetch(
                    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
                    {
                        headers: {
                            Authorization: `Bearer ${tokenData.access_token}`,
                            "Content-Type": "application/json",
                        },
                    }
                )

                if (accountRes.ok) {
                    const accountData = await accountRes.json()
                    const account = accountData.accounts?.[0]

                    if (account) {
                        // account.name is like "accounts/123456789"
                        accountName = account.accountName ?? account.name ?? null
                        accountId = account.name?.split("/")?.[1] ?? null
                    }
                } else {
                    console.warn("[GMBConnect] Accounts API returned:", accountRes.status)
                }
            } catch (e) {
                console.warn("[GMBConnect] Could not fetch account info:", e)
                // Non-fatal — tokens still save, account info just won't be set
            }

            setProgress(70)

            // 3. Save tokens to DB (server validates them)
            const saveRes = await fetch("/api/gmb/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token,
                    expiresIn: tokenData.expires_in,
                    accountName,
                    accountId,
                }),
                cache: "no-store",
            })

            if (!saveRes.ok) {
                const saveErr = await saveRes.json().catch(() => ({}))
                throw new Error(saveErr.error ?? "Failed to save connection")
            }

            setProgress(100)
            cleanupURL()

            if (!mountedRef.current) return
            setAccountName(accountName ?? "Google My Business Account")
            safeSetState("connected")

            setTimeout(() => {
                if (mountedRef.current) window.location.href = "/app/locations"
            }, 1800)
        } catch (err: any) {
            console.error("[GMBConnect] OAuth callback failed:", err)

            // Clean up bad tokens
            await fetch("/api/gmb/token", { method: "DELETE" }).catch(() => { })

            if (!mountedRef.current) return
            setError(err.message ?? "Failed to connect to Google My Business")
            safeSetState("error")
            cleanupURL()
        }
    }

    // ─── Connect ──────────────────────────────────────────────────────────────

    const triggerGMBConnection = async () => {
        safeSetState("connecting")
        setError(null)
        setProgress(10)

        try {
            // Clear stale tokens
            await fetch("/api/gmb/token", { method: "DELETE" }).catch(() => { })

            // Generate & store CSRF state
            const oauthState = generateOAuthState()
            saveOAuthState(oauthState)

            setProgress(30)

            const authUrl =
                `https://accounts.google.com/o/oauth2/v2/auth` +
                `?client_id=${encodeURIComponent(clientId)}` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&response_type=code` +
                `&scope=${encodeURIComponent(scopes)}` +
                `&access_type=offline` +
                `&prompt=consent` +
                `&state=${oauthState}`

            window.location.href = authUrl
        } catch {
            setError("Failed to initiate connection. Please try again.")
            safeSetState("disconnected")
        }
    }

    // ─── Disconnect ───────────────────────────────────────────────────────────

    const handleDisconnect = async () => {
        safeSetState("disconnecting")
        setError(null)

        try {
            const res = await fetch("/api/gmb/token", { method: "DELETE" })
            if (!res.ok) throw new Error("Delete request failed")
            if (!mountedRef.current) return
            setAccountName(null)
            safeSetState("disconnected")
        } catch {
            setError("Failed to disconnect. Please try again.")
            safeSetState("connected")
        }
    }

    // ─── Benefits ─────────────────────────────────────────────────────────────

    const benefits = [
        {
            icon: <BarChart3 className="h-5 w-5" />,
            title: "Analytics & Insights",
            description: "Track performance metrics and customer engagement",
        },
        {
            icon: <MapPin className="h-5 w-5" />,
            title: "Location Management",
            description: "Update business info, hours, and photos instantly",
        },
        {
            icon: <Star className="h-5 w-5" />,
            title: "Review Management",
            description: "Respond to reviews and improve your reputation",
        },
        {
            icon: <Users className="h-5 w-5" />,
            title: "Customer Engagement",
            description: "Connect with customers through posts and messaging",
        },
    ]

    // ─── Loading / processing states ──────────────────────────────────────────

    const isProcessing = state === "loading" || state === "processing-callback"
    const isSlowNetwork = state === "retrying"
    const isDisconnecting = state === "disconnecting"

    if (isProcessing || isSlowNetwork) {
        return (
            <div className="flex items-center justify-center min-h-[70vh] p-4">
                <Card className="max-w-md w-full shadow-lg border-0 bg-card">
                    <CardContent className="p-8">
                        <div className="space-y-6 text-center">
                            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                                {isSlowNetwork ? (
                                    <WifiOff className="h-8 w-8 text-amber-500 animate-pulse" />
                                ) : (
                                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                                )}
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold">
                                    {state === "processing-callback"
                                        ? "Connecting Your Account"
                                        : isSlowNetwork
                                            ? "Slow Connection Detected"
                                            : "Checking Connection Status"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {state === "processing-callback"
                                        ? "Securely connecting your Google My Business account..."
                                        : isSlowNetwork
                                            ? `Network is slow — retrying automatically (attempt ${retryCount + 1} of ${MAX_CHECK_RETRIES + 1})...`
                                            : "Please wait while we verify your connection..."}
                                </p>
                            </div>

                            {state === "processing-callback" && (
                                <div className="space-y-2">
                                    <Progress value={progress} className="h-2" />
                                    <p className="text-xs text-muted-foreground">{progress}% complete</p>
                                </div>
                            )}

                            {isSlowNetwork && (
                                <div className="space-y-2">
                                    <div className="flex gap-1 justify-center">
                                        {Array.from({ length: MAX_CHECK_RETRIES + 1 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-2 w-6 rounded-full transition-colors ${i < retryCount
                                                    ? "bg-amber-400"
                                                    : i === retryCount
                                                        ? "bg-primary animate-pulse"
                                                        : "bg-muted"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Retrying automatically</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Skeleton className="h-3 w-3/4 mx-auto" />
                                <Skeleton className="h-3 w-1/2 mx-auto" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ─── Main card ────────────────────────────────────────────────────────────

    return (
        <div className="flex items-center justify-center min-h-[70vh] p-4">
            <div className="max-w-2xl w-full space-y-6">
                <Card className="bg-card">
                    <CardHeader className="text-center space-y-4 pb-6">
                        <div className="flex justify-center">
                            <div
                                className={`w-16 h-16 rounded-full flex items-center justify-center ${state === "connected"
                                    ? "bg-green-100 dark:bg-green-900/20"
                                    : state === "error"
                                        ? "bg-red-100 dark:bg-red-900/20"
                                        : "bg-blue-100 dark:bg-blue-900/20"
                                    }`}
                            >
                                {state === "connected" ? (
                                    <CheckCircle className="h-8 w-8 text-[hsl(var(--success))]" />
                                ) : state === "error" ? (
                                    <AlertCircle className="h-8 w-8 text-[hsl(var(--destructive))]" />
                                ) : state === "connecting" || state === "disconnecting" ? (
                                    <Loader2 className="animate-spin h-8 w-8 text-[hsl(var(--primary))]" />
                                ) : (
                                    <Shield className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <CardTitle className="text-2xl">
                                {state === "connected"
                                    ? "Successfully Connected!"
                                    : state === "disconnecting"
                                        ? "Disconnecting..."
                                        : "Connect Google My Business"}
                            </CardTitle>

                            <CardDescription className="text-base max-w-md mx-auto">
                                {state === "connected" ? (
                                    <div className="space-y-2">
                                        <p>
                                            Your account <strong className="text-foreground">{accountName}</strong> is
                                            now connected.
                                        </p>
                                        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                            <Zap className="h-4 w-4" />
                                            <span className="font-medium">Redirecting to your locations...</span>
                                        </div>
                                    </div>
                                ) : (
                                    "Unlock powerful tools to manage your Google My Business presence."
                                )}
                            </CardDescription>
                        </div>

                        {state === "connected" && (
                            <Badge
                                variant="secondary"
                                className="mx-auto bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Account Connected
                            </Badge>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Error banner */}
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                                            Connection Failed
                                        </h4>
                                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setError(null)}
                                        className="ml-auto p-1 h-auto text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Connecting progress */}
                        {(state === "connecting" || state === "disconnecting") && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="animate-spin h-5 w-5 text-primary" />
                                    <span className="font-medium">
                                        {state === "connecting"
                                            ? "Redirecting to Google..."
                                            : "Removing connection..."}
                                    </span>
                                </div>
                                {state === "connecting" && <Progress value={progress} className="h-2" />}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col gap-3">
                            {state === "connected" ? (
                                <div className="space-y-3">
                                    <Button
                                        onClick={() => (window.location.href = "/app/locations")}
                                        className="w-full h-12 text-base"
                                        size="lg"
                                    >
                                        Go to Locations
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                    <Button
                                        onClick={handleDisconnect}
                                        disabled={isDisconnecting}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        {isDisconnecting ? (
                                            <>
                                                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                                Disconnecting...
                                            </>
                                        ) : (
                                            "Disconnect Account"
                                        )}
                                    </Button>
                                </div>
                            ) : state === "error" ? (
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button onClick={() => { initCalledRef.current = false; initializeComponent() }} className="flex-1 h-12" size="lg">
                                        <RefreshCw className="mr-2 h-5 w-5" />
                                        Try Again
                                    </Button>
                                    <Button
                                        onClick={triggerGMBConnection}
                                        variant="outline"
                                        className="flex-1 h-12"
                                        size="lg"
                                    >
                                        Start Fresh
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={triggerGMBConnection}
                                    disabled={state === "connecting"}
                                    className="w-full h-12 text-base"
                                    size="lg"
                                >
                                    {state === "connecting" ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                            Redirecting to Google...
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="mr-2 h-5 w-5" />
                                            Connect Securely
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>

                        {(state === "disconnected" || state === "error") && (
                            <div className="text-center text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                                <Shield className="h-4 w-4 inline mr-2" />
                                Protected by Google OAuth 2.0 — we never store your password
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Benefits */}
                {state !== "connected" && (
                    <Card className="bg-gradient-to-br from-background to-muted border-border">
                        <CardHeader className="text-center pb-4">
                            <CardTitle className="text-xl text-foreground">What You'll Get Access To</CardTitle>
                            <CardDescription>
                                Powerful tools to manage and grow your local business presence
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {benefits.map((benefit, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/20 transition-colors"
                                    >
                                        <div className="text-primary mt-1">{benefit.icon}</div>
                                        <div>
                                            <h4 className="font-medium text-foreground mb-1">{benefit.title}</h4>
                                            <p className="text-sm text-muted-foreground">{benefit.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

export default GoogleBusinessConnect