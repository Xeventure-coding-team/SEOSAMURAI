"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import GoogleBusinessConnect from "@/components/GMB/GoogleBusinessConnect"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@stackframe/stack"
import { useGMBStore } from "@/store/gmbStore"
import ErrorRender from "@/components/Error"

interface GMBAuthWrapperProps {
  children: React.ReactNode
}

const GMBAuthWrapper: React.FC<GMBAuthWrapperProps> = ({ children }) => {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const user = useUser()
  const pathname = usePathname()
  
  const { 
    accessToken, 
    setAccessToken, 
    setRefreshToken, 
    setTokenExpiry,
    setAccountName,
    setAccountId,
    clearTokens
  } = useGMBStore()

  const isTokenExpired = (expiry: Date | null): boolean => {
    if (!expiry) return true
    // Consider token expired if it expires within the next 5 minutes
    return Date.now() + (5 * 60 * 1000) > expiry.getTime()
  }

  const refreshToken = async (): Promise<string | null> => {
    try {
      console.log("Attempting to refresh token...")
      
      const response = await fetch("/api/gmb/refresh-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Refresh failed:", errorData)
        return null
      }

      const data = await response.json()

      // Update Zustand store with refreshed tokens
      setAccessToken(data.access_token)
      if (data.refresh_token) {
        setRefreshToken(data.refresh_token)
      }
      setTokenExpiry(new Date(Date.now() + data.expires_in * 1000))

      console.log("Token refreshed successfully")
      return data.access_token

    } catch (error) {
      console.error("Token refresh failed:", error)
      return null
    }
  }

  const validateAndLoadTokens = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/gmb/token", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store"
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No GMB integration found")
          return false
        }
        throw new Error(`Failed to load tokens: ${response.status}`)
      }

      const data = await response.json()
      
      // Check if integration is active
      if (!data.isActive) {
        console.log("GMB integration is inactive")
        return false
      }

      // Update store with current data
      if (data.accessToken) setAccessToken(data.accessToken)
      if (data.refreshToken) setRefreshToken(data.refreshToken)
      if (data.tokenExpiry) setTokenExpiry(new Date(data.tokenExpiry))
      if (data.accountName) setAccountName(data.accountName)
      if (data.accountId) setAccountId(data.accountId)

      // Check if token is expired
      if (isTokenExpired(new Date(data.tokenExpiry))) {
        console.log("Token is expired, attempting refresh...")
        
        const newToken = await refreshToken()
        if (!newToken) {
          console.log("Failed to refresh token")
          return false
        }
      }

      return true

    } catch (error) {
      console.error("Error validating tokens:", error)
      return false
    }
  }

  useEffect(() => {
    const checkAuthentication = async () => {
      // Wait for user to be loaded
      if (!user?.id) {
        setAuthState('loading')
        return
      }

      // Check if we have OAuth callback parameters - if so, let GoogleBusinessConnect handle everything
      const params = new URLSearchParams(window.location.search)
      const hasOAuthParams = params.has('code') || params.has('error')
      
      if (hasOAuthParams) {
        console.log("OAuth callback detected, delegating to GoogleBusinessConnect")
        setAuthState('unauthenticated')
        return
      }

      try {
        setError(null)
        console.log("Checking GMB authentication...")

        const isValid = await validateAndLoadTokens()
        
        if (isValid) {
          console.log("GMB authentication valid")
          setAuthState('authenticated')
        } else {
          console.log("GMB authentication invalid or missing")
          clearTokens()
          setAuthState('unauthenticated')
        }

      } catch (error) {
        console.error("Authentication check failed:", error)
        setError("Failed to verify authentication")
        clearTokens()
        setAuthState('error')
      }
    }

    checkAuthentication()
  }, [user?.id])

  // Show loading state
  if (authState === 'loading' || !user?.id) {
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

  // Show error state with retry option
  if (authState === 'error') {
    return (
        <ErrorRender error={"We couldn't load this content. You can retry or report the issue."} />
    )
  }

  // Show connection screen if not authenticated
  if (authState === 'unauthenticated') {
    return <GoogleBusinessConnect />
  }

  // Show protected content if authenticated
  return <>{children}</>
}

export default GMBAuthWrapper