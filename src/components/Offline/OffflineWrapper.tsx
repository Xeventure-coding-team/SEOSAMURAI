"use client";

import React, { useEffect, useState } from 'react'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface OfflineWrapperProps {
  children: React.ReactNode
  showRetry?: boolean
  customMessage?: string
}

function OfflineWrapper({ children, showRetry = true, customMessage }: OfflineWrapperProps) {
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !window.navigator.onLine : false
  );
  const [isChecking, setIsChecking] = useState<boolean>(false)

  const checkConnection = () => {
    setIsChecking(true)
    // Small delay to show loading state
    setTimeout(() => {
      setIsOffline(!window.navigator.onLine)
      setIsChecking(false)
    }, 500)
  }

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOffline) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">

            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-muted p-3">
                <WifiOff className="h-8 w-8 text-muted-foreground" />
              </div>

              <p className="text-sm text-muted-foreground">
                Some features may be unavailable while you're offline.
              </p>

              {showRetry && (
                <Button
                  onClick={checkConnection}
                  disabled={isChecking}
                  className="w-full sm:w-auto"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Wifi className="mr-2 h-4 w-4" />
                      Try Again
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

export default OfflineWrapper