"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHexclaveApp } from "@hexclave/next";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Lock } from "lucide-react";
import Logo from "@/components/Logo";

// --- Validation (same rules as sign-up) ---
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  {
    label: "One special character",
    test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
];

const CODE_REGEX = /^[a-zA-Z0-9\-_]{8,256}$/;

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
export default function PasswordResetPage() {
  const app = useHexclaveApp();
  const code = useSearchParams().get("code") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = getStrength(password);
  const strengthLabel = ["", "Weak", "Fair", "Moderate", "Strong", "Very strong"][strength];
  const strengthColor = ["", "#EF4444", "#EF4444", "#F59E0B", "#10B981", "#10B981"][strength];

  // Validate the reset code before allowing any submission
  const codeError = !code
    ? "No reset code was found in this link."
    : !CODE_REGEX.test(code)
    ? "This reset link appears malformed. Request a new one."
    : null;

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;
    if (!confirmPassword) {
      errors.confirm = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirm = "Passwords don't match.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (codeError) {
      setError(codeError);
      return;
    }
    if (!validateAll()) return;

    setLoading(true);
    try {
      const result = await app.resetPassword({ code, password });
      if (result.status === "error") {
        setError(result.error.humanReadableMessage);
      } else {
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (done) {
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
                  Password updated
                </h1>
                <p className="mt-1.5 text-sm text-gray-600">
                  Your password has been changed successfully
                </p>
              </div>

              <div className="flex flex-col items-center gap-6 py-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm text-muted-foreground">
                    You can now sign in with your new password.
                  </p>
                </div>
                <Link
                  href="/sign-in"
                  className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center justify-center"
                >
                  Continue to sign in
                </Link>
              </div>

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

  // Error state for invalid code
  if (codeError) {
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
                  Invalid reset link
                </h1>
                <p className="mt-1.5 text-sm text-gray-600">
                  The password reset link is invalid
                </p>
              </div>

              <div className="flex flex-col items-center gap-6 py-4">
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm text-muted-foreground">{codeError}</p>
                  <p className="text-xs text-muted-foreground">
                    Request a new password reset link to continue.
                  </p>
                </div>
                <Link
                  href="/forgot-password"
                  className="w-full h-10 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center justify-center"
                >
                  Request a new link
                </Link>
              </div>

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

  // Main form
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
                Set a new password
              </h1>
              <p className="mt-1.5 text-sm text-gray-600">
                Choose a strong password for your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  New password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
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
                    aria-invalid={!!fieldErrors.password}
                    className="w-full h-10 pl-10 pr-10 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
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
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strength ? "bg-primary" : "bg-muted"
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
                          className={`flex items-center gap-1.5 text-xs ${
                            rule.test(password) 
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
                <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
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
                        setFieldErrors((f) => ({
                          ...f,
                          confirm: "Passwords don't match.",
                        }));
                      }
                    }}
                    autoComplete="new-password"
                    required
                    aria-invalid={!!fieldErrors.confirm}
                    className="w-full h-10 pl-10 pr-10 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  {confirmPassword && password === confirmPassword && password.length > 0 && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.confirm && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {fieldErrors.confirm}
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
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <Link
                href="/sign-in"
                className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}