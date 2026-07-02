"use client";

import { useState } from "react";
import Link from "next/link";
import { useHexclaveApp } from "@hexclave/next";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthCard } from "@/components/auth-card";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";

// --- Validation ---
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

const DISPOSABLE = ["mailinator.com", "guerrillamail.com", "tempmail.com", "10minutemail.com", "throwam.com"];

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address.";
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain && DISPOSABLE.includes(domain)) return "Disposable email addresses are not allowed.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  const failed = PASSWORD_RULES.filter((r) => !r.test(password));
  if (failed.length > 0) return `${failed[0].label} is required.`;
  if (password.length > 128) return "Password is too long (max 128 characters).";
  return null;
}

function getStrength(password: string) {
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}

// --- Component ---
export default function SignUpPage() {
  const app = useHexclaveApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [newsletter, setNewsletter] = useState(true);

  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const isDev = false;

  const strength = getStrength(password);
  const strengthLabel = ["", "Weak", "Fair", "Moderate", "Strong", "Very strong"][strength];
  const strengthColor = ["", "#EF4444", "#EF4444", "#F59E0B", "#10B981", "#10B981"][strength];

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;
    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;
    if (!confirmPassword) errors.confirm = "Please confirm your password.";
    else if (password !== confirmPassword) errors.confirm = "Passwords don't match.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (honeypot) return;
    if (!validateAll()) return;

    if (!isDev && !turnstileToken) {
      setError("Please complete the human verification.");
      return;
    }

    if (!isDev && turnstileToken) {
      try {
        const check = await fetch("/api/auth/verify-turnstile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: turnstileToken }),
        });
        if (!check.ok) {
          setError("Human verification failed. Please try again.");
          setTurnstileToken(null);
          return;
        }
      } catch {
        setError("Verification failed. Please try again.");
        return;
      }
    }

    setLoading(true);
    try {
      const result = await app.signUpWithCredential({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.status === "error") {
        setError(result.error.humanReadableMessage);
        setLoading(false);
        return;
      }

      const writeAndVerifyNewsletterPref = async (): Promise<boolean> => {
        try {
          const user = await app.getUser();
          if (!user) return false;

          const accessToken = await user.getAccessToken();
          if (!accessToken) return false;

          const baseUrl = "https://api.hexclave.com/api/v1";

          const headers = {
            "X-Hexclave-Access-Type": "client",
            "X-Hexclave-Project-Id": process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID!,
            "X-Hexclave-Access-Token": accessToken,
            "Content-Type": "application/json",
          };

          const listRes = await fetch(
            `${baseUrl}/emails/notification-preference/me`,
            { headers }
          );

          if (!listRes.ok) return false;

          const data = await listRes.json();

          const marketing = data.items.find(
            (item: any) => item.notification_category_name === "Marketing"
          );

          if (!marketing) return false;

          const updateRes = await fetch(
            `${baseUrl}/emails/notification-preference/me/${marketing.notification_category_id}`,
            {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                enabled: newsletter,
              }),
            }
          );

          if (!updateRes.ok) return false;

          const updated = await updateRes.json();

          return updated.enabled === newsletter;
        } catch {
          return false;
        }
      };

      let verified = await writeAndVerifyNewsletterPref();


      if (!verified) {
        // Don't block signup over this — just flag it so the user can
        // double check in Settings if they care about the marketing toggle.
        console.warn("Newsletter preference could not be confirmed after signup.");
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthCard
        title="Check your inbox"
        description="We sent a verification link to your email"
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Click the link to verify{" "}
              <span className="font-medium text-foreground">{email}</span>{" "}
              and finish setting up your account.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create an account"
      description="Get started for free"
      maxWidth="md"
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SocialAuthButtons />


      {/* Honeypot */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}>
        <input
          name="website"
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
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
              className="h-10"
              aria-invalid={!!fieldErrors.email}
            />
            {email && !fieldErrors.email && validateEmail(email) === null && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
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
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
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
              autoComplete="new-password"
              required
              className="h-10 pr-10"
              aria-invalid={!!fieldErrors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password strength */}
          {password.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? "bg-primary" : "bg-muted"
                      }`}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs font-medium" style={{ color: strengthColor }}>
                  {strengthLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {strength}/5
                </p>
              </div>
              <ul className="space-y-0.5 pt-0.5">
                {PASSWORD_RULES.map((rule) => (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-xs ${rule.test(password)
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                      }`}
                  >
                    {rule.test(password) ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                    )}
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fieldErrors.password && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-sm font-medium">
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((f) => ({ ...f, confirm: "" }));
              }}
              onBlur={() => {
                if (confirmPassword && password !== confirmPassword) {
                  setFieldErrors((f) => ({ ...f, confirm: "Passwords don't match." }));
                }
              }}
              autoComplete="new-password"
              required
              className="h-10 pr-10"
              aria-invalid={!!fieldErrors.confirm}
            />
            {confirmPassword && password === confirmPassword && password.length > 0 && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
          {fieldErrors.confirm && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {fieldErrors.confirm}
            </p>
          )}
        </div>

        {/* Newsletter opt-in */}
        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id="newsletter"
            checked={newsletter}
            onCheckedChange={(checked) => setNewsletter(checked === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="newsletter"
            className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer"
          >
            Send me product updates and the occasional newsletter. You can unsubscribe anytime.
          </Label>
        </div>

        {/* Turnstile */}
        {!isDev && (
          <div className="space-y-1.5 pt-1">
            <Label className="text-sm font-medium">Verify you're human</Label>
            <div>
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                  setTurnstileError(false);
                  setError(null);
                }}
                onError={() => {
                  setTurnstileError(true);
                  setError("Human check failed. Please refresh.");
                }}
                onExpire={() => setTurnstileToken(null)}
                options={{
                  appearance: "always",
                  theme: "auto",
                  size: "flexible",
                }}
                style={{ width: "100%" }}
              />
              {turnstileError && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Verification unavailable. Please refresh the page.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full h-10"
          disabled={loading || (!isDev && !turnstileToken)}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>

        {/* Terms */}
        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline underline-offset-2">
            Terms
          </Link>
          {" "}and{" "}
          <Link href="/privacy" className="text-primary hover:underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthCard>
  );
}