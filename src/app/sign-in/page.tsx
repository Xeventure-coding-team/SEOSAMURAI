"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useHexclaveApp } from "@hexclave/next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import { AuthCard } from "@/components/auth-card";
import { Mail, Lock, XCircle, Loader2, AlertCircle } from "lucide-react";

// --- Constants ---
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 10 * 60 * 1000; // 10 minutes

// --- Helpers ---
function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  return null;
}

// --- Component ---
export default function SignInPage() {
  const app = useHexclaveApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Client-side brute-force throttle
  const attemptsRef = useRef(0);
  const lockedUntil = useRef<number | null>(null);
  const [lockMsg, setLockMsg] = useState<string | null>(null);

  const getLockRemaining = () => {
    if (!lockedUntil.current) return null;
    const remaining = lockedUntil.current - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 60000) : null;
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;
    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLockMsg(null);

    // Honeypot
    if (honeypot) return;

    // Client-side lockout check
    const mins = getLockRemaining();
    if (mins !== null) {
      setLockMsg(`Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
      return;
    }

    if (!validateAll()) return;

    setLoading(true);
    try {
      const result = await app.signInWithCredential({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.status === "error") {
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          lockedUntil.current = Date.now() + LOCKOUT_MS;
          attemptsRef.current = 0;
          setLockMsg("Too many failed attempts. Try again in 10 minutes.");
        } else {
          const remaining = MAX_ATTEMPTS - attemptsRef.current;
          setError(
            `${result.error.humanReadableMessage} — ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
          );
        }
      } else {
        // Success — Hexclave handles redirect to `afterSignIn`
        attemptsRef.current = 0;
        lockedUntil.current = null;
      }
    } finally {
      setLoading(false);
    }
  }, [app, email, password, honeypot]);

  const isLocked = getLockRemaining() !== null;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your account to continue"
      maxWidth="md"
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link 
            href="/sign-up" 
            className="font-medium text-primary hover:underline transition-colors"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <SocialAuthButtons />


      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot — invisible to real users */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
        >
          <label htmlFor="website">Leave this blank</label>
          <input
            id="website"
            name="website"
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { 
                setEmail(e.target.value); 
                setFieldErrors((f) => ({ ...f, email: "" })); 
              }}
              onBlur={() => { 
                const err = validateEmail(email); 
                setFieldErrors((f) => ({ ...f, email: err ?? "" })); 
              }}
              autoComplete="email"
              required
              disabled={isLocked}
              className="h-10 pl-10"
              aria-invalid={!!fieldErrors.email}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { 
                setPassword(e.target.value); 
                setFieldErrors((f) => ({ ...f, password: "" })); 
              }}
              onBlur={() => { 
                const err = validatePassword(password); 
                setFieldErrors((f) => ({ ...f, password: err ?? "" })); 
              }}
              autoComplete="current-password"
              required
              disabled={isLocked}
              className="h-10 pl-10"
              aria-invalid={!!fieldErrors.password}
            />
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Errors */}
        {(error || lockMsg) && (
          <Alert 
            variant="destructive" 
            className="border-destructive/50 bg-destructive/10"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {lockMsg ?? error}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit button */}
        <Button 
          type="submit" 
          className="w-full h-10" 
          disabled={loading || isLocked}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : isLocked ? (
            "Account locked"
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}