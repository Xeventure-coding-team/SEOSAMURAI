"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHexclaveApp } from "@hexclave/next";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import Logo from "@/components/Logo";

// Validate the code has a plausible shape before sending it to the API.
// Adjust the regex to match whatever format Hexclave issues (UUID, base64, etc.)
const CODE_REGEX = /^[a-zA-Z0-9\-_]{8,256}$/;

export default function VerifyEmailPage() {
  const app = useHexclaveApp();
  const code = useSearchParams().get("code") ?? "";

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errMsg, setErrMsg] = useState("This link is invalid or has expired.");
  const didRun = useRef(false); // guard against React 18 double-invocation in dev

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    // Guard 1: missing code
    if (!code) {
      setErrMsg("No verification code was found in this link.");
      setStatus("error");
      return;
    }

    // Guard 2: obviously malformed code — don't waste a round-trip
    if (!CODE_REGEX.test(code)) {
      setErrMsg("The verification code in this link looks malformed.");
      setStatus("error");
      return;
    }

    // Guard 3: code is suspiciously long — possible injection attempt
    if (code.length > 256) {
      setErrMsg("The verification code in this link is invalid.");
      setStatus("error");
      return;
    }

    app
      .verifyEmail({ code })
      .then((result) => {
        if (result.status === "ok") {
          setStatus("ok");
        } else {
          // Surface Hexclave's message if it's available, fall back to generic
          setErrMsg(
            result.error?.humanReadableMessage ??
              "This link is invalid or has expired."
          );
          setStatus("error");
        }
      })
      .catch(() => {
        setErrMsg("Something went wrong. Please try again.");
        setStatus("error");
      });
  }, [code, app]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Logo */}
      <div className="absolute top-6 left-6">
        <Link href="/">
          <Logo className="h-10 w-auto" />
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">
                Email verification
              </h1>
              <p className="mt-1.5 text-sm text-gray-600">
                {status === "loading" && "Verifying your email address..."}
                {status === "ok" && "Your email has been verified"}
                {status === "error" && "Verification failed"}
              </p>
            </div>

            {/* Content */}
            <div className="flex flex-col items-center gap-6 py-4">
              {status === "loading" && (
                <>
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <div className="space-y-2 text-center">
                    <p className="text-sm text-muted-foreground">
                      Please wait while we verify your email...
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse delay-150" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse delay-300" />
                    </div>
                  </div>
                </>
              )}

              {status === "ok" && (
                <>
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm text-muted-foreground">
                      Your email has been verified successfully.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You can now access all features of your account.
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center justify-center"
                  >
                    Continue to Dashboard
                  </Link>
                </>
              )}

              {status === "error" && (
                <>
                  <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm text-muted-foreground">{errMsg}</p>
                    <p className="text-xs text-muted-foreground">
                      The verification link may have expired or been used already.
                    </p>
                  </div>
                  <div className="w-full space-y-2">
                    <Link
                      href="/sign-in"
                      className="w-full h-10 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center justify-center"
                    >
                      Back to sign in
                    </Link>
                    <Link
                      href="/sign-up"
                      className="w-full h-10 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
                    >
                      Create a new account
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-muted-foreground">
                Need help?{" "}
                <Link 
                  href="/support" 
                  className="text-primary hover:underline transition-colors"
                >
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}