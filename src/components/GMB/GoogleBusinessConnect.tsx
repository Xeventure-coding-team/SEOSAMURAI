"use client"

import React, { useEffect, useState } from "react"
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
    Loader2Icon
} from "lucide-react"

type State =
    | "loading"
    | "connected"
    | "disconnected"
    | "connecting"
    | "disconnecting"
    | "processing-callback"
    | "error"

const GoogleBusinessConnect: React.FC = () => {
    const [state, setState] = useState<State>("loading")
    const [accountName, setAccountName] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)

    const clientId: string = process.env.NEXT_PUBLIC_CLIENT_ID as string
    const redirectUri: string = process.env.NEXT_PUBLIC_REDIRECT_URL as string
    const scopes: string = "https://www.googleapis.com/auth/business.manage"

    useEffect(() => {
        initializeComponent()
    }, [])

    // Simulate progress for better UX
    useEffect(() => {
        if (state === 'processing-callback' || state === 'connecting') {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev
                    return prev + 10
                })
            }, 200)
            return () => clearInterval(interval)
        } else {
            setProgress(0)
        }
    }, [state])

    const initializeComponent = async () => {
        try {

            console.log(window.location.href, "window location href testing!!")

            setState('loading')
            setError(null)

            // First, check if we have OAuth callback params
            const params = new URLSearchParams(window.location.search)
            const code = params.get("code")
            const error = params.get("error")

            if (error) {
                setError(`Authorization failed: ${error}`)
                setState('error')
                cleanupURL()
                return
            }

            if (code) {
                console.log("Processing OAuth callback...")
                await handleOAuthCallback(code)
                return
            }

            // No OAuth params, check existing connection
            await checkExistingConnection()

        } catch (error) {
            console.error("Initialization error:", error)
            setError("Failed to initialize component")
            setState('error')
        }
    }

    const checkExistingConnection = async () => {
        try {
            const response = await fetch("/api/gmb/token", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store"
            })

            if (response.ok) {

                const data = await response.json()
                if (data.accessToken && data.isActive) {
                    console.log("Existing valid connection found")
                    setState('connected')
                    setAccountName(data.accountName || "Google My Business Account")

                    // Redirect to locations after showing success state
                    setTimeout(() => {
                        if (!window.location.pathname.includes('/locations')) {
                            window.location.href = "/app/locations"

                            console.log(window.location.href, "window location href>!!")
                        }
                    }, 2000)
                    return
                }
            }

            console.log("No valid connection found")
            setState('disconnected')

        } catch (error) {
            console.error("Error checking connection:", error)
            setState('disconnected') // Default to disconnected on error
        }
    }

    const handleOAuthCallback = async (code: string) => {
        setState('processing-callback')
        setError(null)
        setProgress(20)

        try {
            console.log("Exchanging code for tokens...")

            // Exchange code for tokens
            const tokenResponse = await fetch("/api/gmb/exchange-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            })

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json()
                throw new Error(errorData.error || "Failed to exchange code for token")
            }

            const tokenData = await tokenResponse.json()
            console.log("Token exchange successful")
            setProgress(50)

            // Get account information
            let accountName = null
            let accountId = null

            try {
                if (process.env.NEXT_PUBLIC_API_BASE_URL) {
                    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}connected-accounts?access_token=${tokenData.access_token}`
                    const accountResponse = await fetch(url, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${tokenData.access_token}`
                        },
                    })

                    if (accountResponse.ok) {
                        const accountData = await accountResponse.json()
                        accountName = accountData.accountName
                        accountId = accountData.accountId
                        console.log("Account info retrieved:", { accountName, accountId })
                    }
                }
            } catch (accountError) {
                console.warn("Failed to get account info:", accountError)
            }

            setProgress(75)

            // Save tokens to database
            const saveResponse = await fetch("/api/gmb/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token,
                    expiresIn: tokenData.expires_in,
                    accountName,
                    accountId,
                }),
                cache: "no-store"
            })

            if (!saveResponse.ok) {
                const saveError = await saveResponse.json()
                throw new Error(saveError.error || "Failed to save tokens")
            }

            console.log("Connection successful!")
            setProgress(100)

            // Success!
            setState('connected')
            setAccountName(accountName || "Google My Business Account")

            // Clean up URL
            cleanupURL()

            // Redirect after showing success
            setTimeout(() => {
                window.location.href = "/app/locations"
            }, 2000)

        } catch (error: any) {
            console.error("OAuth callback error:", error)

            // Clean up on error
            try {
                await fetch("/api/gmb/token", { method: "DELETE" })
            } catch (cleanupError) {
                console.warn("Failed to cleanup tokens:", cleanupError)
            }

            setError(error.message || "Failed to connect to Google My Business")
            setState('error')
            cleanupURL()
        }
    }

    const triggerGMBConnection = async () => {
        try {
            setState('connecting')
            setError(null)
            setProgress(10)

            console.log("Starting OAuth flow...")

            // Clear any existing tokens
            try {
                await fetch("/api/gmb/token", { method: "DELETE" })
            } catch (error) {
                console.warn("Failed to clear existing tokens:", error)
            }

            setProgress(30)

            // Build authorization URL
            const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`

            // Redirect to Google OAuth
            window.location.href = authorizationUrl

        } catch (error) {
            console.error("Connection initiation error:", error)
            setError("Failed to initiate connection. Please try again.")
            setState('disconnected')
        }
    }

    const handleDisconnect = async () => {
        try {
            setState('connecting')
            setError(null)

            const response = await fetch("/api/gmb/token", { method: "DELETE" })

            if (response.ok) {
                setState('disconnected')
                setAccountName(null)
                console.log("Disconnected successfully")
            } else {
                throw new Error("Failed to disconnect")
            }
        } catch (error) {
            console.error("Disconnect error:", error)
            setError("Failed to disconnect. Please try again.")
            setState('connected') // Revert state on error
        }
    }

    const cleanupURL = () => {
        // Clean up URL parameters
        const url = new URL(window.location.href)
        url.search = ''
        window.history.replaceState({}, document.title, url.toString())
    }

    const retryConnection = () => {
        setError(null)
        initializeComponent()
    }

    // Benefits data for better user understanding
    const benefits = [
        {
            icon: <BarChart3 className="h-5 w-5" />,
            title: "Analytics & Insights",
            description: "Track performance metrics and customer engagement"
        },
        {
            icon: <MapPin className="h-5 w-5" />,
            title: "Location Management",
            description: "Update business info, hours, and photos instantly"
        },
        {
            icon: <Star className="h-5 w-5" />,
            title: "Review Management",
            description: "Respond to reviews and improve your reputation"
        },
        {
            icon: <Users className="h-5 w-5" />,
            title: "Customer Engagement",
            description: "Connect with customers through posts and messaging"
        }
    ]

    // Render loading state
    if (state === 'loading' || state === 'processing-callback') {
        return (
            <div className="flex items-center justify-center min-h-[70vh] p-4">
                <Card className="max-w-md w-full shadow-lg border-0 bg-card">
                    <CardContent className="p-8">
                        <div className="space-y-6 text-center">
                            <div className="relative">
                                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xl font-semibold">
                                    {state === 'processing-callback'
                                        ? "Connecting Your Account"
                                        : "Checking Connection Status"
                                    }
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {state === 'processing-callback'
                                        ? "We're securely connecting your Google My Business account. This may take a moment..."
                                        : "Please wait while we verify your connection status..."
                                    }
                                </p>
                            </div>

                            {state === 'processing-callback' && (
                                <div className="space-y-2">
                                    <Progress value={progress} className="h-2" />
                                    <p className="text-xs text-muted-foreground">
                                        {progress}% complete
                                    </p>
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

    return (
        <div className="flex items-center justify-center min-h-[70vh] p-4">
            <div className="max-w-2xl w-full space-y-6">
                {/* Main Connection Card */}
                <Card className="shadow-lg border-0 bg-card">
                    <CardHeader className="text-center space-y-4 pb-6">
                        <div className="flex justify-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${state === 'connected'
                                ? 'bg-green-100 dark:bg-green-900/20'
                                : state === 'error'
                                    ? 'bg-red-100 dark:bg-red-900/20'
                                    : 'bg-blue-100 dark:bg-blue-900/20'
                                }`}>
                                {state === "connected" ? (
                                    <CheckCircle className="h-8 w-8 text-[hsl(var(--success))]" />
                                ) : state === "error" ? (
                                    <AlertCircle className="h-8 w-8 text-[hsl(var(--destructive))]" />
                                ) : state === "connecting" ? (
                                    <Loader2 className="animate-spin h-8 w-8 text-[hsl(var(--primary))]" />
                                ) : (
                                    <Shield className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <CardTitle className="text-2xl">
                                {state === 'connected'
                                    ? "Successfully Connected!"
                                    : "Connect Google My Business"
                                }
                            </CardTitle>
                            <CardDescription className="text-base max-w-md mx-auto">
                                {state === 'connected' ? (
                                    <div className="space-y-2">
                                        <p>Your account <strong className="text-foreground">{accountName}</strong> is now connected.</p>
                                        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                            <Zap className="h-4 w-4" />
                                            <span className="font-medium">Redirecting to your locations...</span>
                                        </div>
                                    </div>
                                ) : (
                                    "Unlock powerful tools to manage your Google My Business presence and grow your local business."
                                )}
                            </CardDescription>
                        </div>

                        {state === 'connected' && (
                            <Badge variant="secondary" className="mx-auto bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Account Connected
                            </Badge>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Error Display */}
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

                        {/* Progress Bar for Connecting State */}
                        {state === 'connecting' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="animate-spin h-5 w-5 text-primary" />
                                    <span className="font-medium">Connecting to Google...</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3">
                            {state === 'connected' ? (
                                <div className="space-y-3">
                                    <Button
                                        onClick={() => window.location.href = "/app/locations"}
                                        className="w-full h-12 text-base"
                                        size="lg"
                                    >
                                        Go to Locations
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                    <Button
                                        onClick={handleDisconnect}
                                        disabled={state === "connecting"}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        {state === "connecting" ? (
                                            <>
                                                <Loader2Icon className="animate-spin mr-2 h-4 w-4" />
                                                Disconnecting...
                                            </>
                                        ) : (
                                            "Disconnect Account"
                                        )}
                                    </Button>
                                </div>
                            ) : state === 'error' ? (
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        onClick={retryConnection}
                                        className="flex-1 h-12"
                                        size="lg"
                                    >
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
                                    disabled={state === 'connecting'}
                                    className="w-full h-12 text-base"
                                    size="lg"
                                >
                                    {state === 'connecting' ? (
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

                        {/* Security Note */}
                        {(state === 'disconnected' || state === 'error') && (
                            <div className="text-center text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                                <Shield className="h-4 w-4 inline mr-2" />
                                Your data is protected by Google's secure OAuth 2.0 authentication
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Benefits Section - Only show when not connected */}
                {state !== "connected" && (
                    <Card className="bg-gradient-to-br from-background to-muted border-border">
                        <CardHeader className="text-center pb-4">
                            <CardTitle className="text-xl text-foreground">
                                What You'll Get Access To
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Powerful tools to manage and grow your local business presence
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {benefits.map((benefit, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border"
                                    >
                                        <div className="text-primary mt-1">{benefit.icon}</div>
                                        <div>
                                            <h4 className="font-medium text-foreground mb-1">
                                                {benefit.title}
                                            </h4>
                                            <p className="text-sm text-muted-foreground">
                                                {benefit.description}
                                            </p>
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