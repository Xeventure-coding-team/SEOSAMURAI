"use client";

import { useState } from "react";
import { Loader2, RefreshCw, X, AlertCircle } from "lucide-react";

export function AutopayToggle({ isAutopayOn, isCanceled = false }: { isAutopayOn: boolean; isCanceled?: boolean }) {
  const [enabled, setEnabled] = useState(isAutopayOn);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [fullyCanceled, setFullyCanceled] = useState(isCanceled);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/subscription/toggle-autopay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enable: !enabled }),
    });

    const data = await res.json();

    if (res.ok) {
      setEnabled(!enabled);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } else if (data.error === "fully_canceled") {
      setFullyCanceled(true);
    }

    setConfirm(false);
    setLoading(false);
  }

  // Fully canceled — show resubscribe prompt
  if (fullyCanceled) {
    return (
      <div className="mt-1 sm:flex sm:justify-end">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
          <AlertCircle className="h-3 w-3" />
          Subscription ended ·{" "}
          <a href="/app/settings/billing" className="underline underline-offset-2 hover:opacity-80">
            Resubscribe
          </a>
        </div>
      </div>
    );
  }

  // Confirm dialog
  if (confirm) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[11px] text-muted-foreground">
          {enabled ? "Cancel autopay?" : "Enable autopay?"}
        </span>
        <button
          onClick={toggle}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[11px] font-medium bg-destructive/10 text-destructive px-2 py-0.5 rounded-full hover:bg-destructive/20 transition-colors"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 sm:flex sm:justify-end">
      {done ? (
        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ {enabled ? "Autopay enabled" : "Autopay cancelled"}
        </span>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
            enabled
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
          }`}
        >
          {enabled ? (
            <><X className="h-3 w-3" /> Cancel autopay</>
          ) : (
            <><RefreshCw className="h-3 w-3" /> Re-enable autopay</>
          )}
        </button>
      )}
    </div>
  );
}