"use client";

import { useState } from "react";
import Link from "next/link";
import { useHexclaveApp } from "@hexclave/next";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import Logo from "@/components/Logo";

// --- Validation ---
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address.";
  return null;
}

export default function ForgotPasswordPage() {
  const app = useHexclaveApp();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    // Validate email
    const emailErr = validateEmail(email);
    if (emailErr) {
      setFieldError(emailErr);
      return;
    }

    setLoading(true);
    try {
      const result = await app.sendForgotPasswordEmail(email.trim().toLowerCase());
      if (result.status === "error") {
        setError(result.error.humanReadableMessage);
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <div className="absolute top-6 left-6">
          <Link href="/">
            <Logo className="h-10 w-auto" />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold text-gray-900">
                  Check your inbox
                </h1>
                <p className="mt-1.5 text-sm text-gray-600">
                  Password reset link sent
                </p>
              </div>

              <div className="flex flex-col items-center gap-6 py-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    We sent a password reset link to
                  </p>
                  <p className="text-sm font-medium text-foreground break-all">
                    {email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    If an account exists, you'll receive a link to reset your password shortly.
                  </p>
                </div>

                <Link
                  href="/sign-in"
                  className="w-full h-10 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center justify-center"
                >
                  Back to sign in
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-xs text-muted-foreground">
                  Didn't receive the email?{" "}
                  <button
                    onClick={() => setSent(false)}
                    className="text-primary hover:underline transition-colors"
                  >
                    Try again
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="absolute top-6 left-6">
        <Link href="/">
          <Logo className="h-10 w-auto" />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">
                Forgot your password?
              </h1>
              <p className="mt-1.5 text-sm text-gray-600">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldError(null);
                      setError(null);
                    }}
                    onBlur={() => {
                      const err = validateEmail(email);
                      setFieldError(err);
                    }}
                    autoComplete="email"
                    required
                    aria-invalid={!!fieldError}
                    className="w-full h-10 pl-10 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                {fieldError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {fieldError}
                  </p>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/50">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>

              {/* Sign in link */}
              <div className="pt-4 text-center">
                <Link
                  href="/sign-in"
                  className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}