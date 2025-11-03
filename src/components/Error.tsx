"use client";

import { AlertCircle } from 'lucide-react'
import React from 'react'
import { Button } from './ui/button'

interface ErrorProps {
    error: string | null
}

function ErrorRender({ error }: ErrorProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
            <div className="bg-destructive/10 p-6 rounded-full mb-6">
                <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Something went wrong</h2>
            <p className="text-muted-foreground mb-8 text-center max-w-md">{error}</p>
            <Button onClick={() => window.location.reload()} size="lg" className="px-8">
                Try Again
            </Button>
        </div>
    )
}

export default ErrorRender