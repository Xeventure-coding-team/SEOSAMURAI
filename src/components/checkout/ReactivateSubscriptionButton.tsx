"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ReactivateSubscriptionButton({ subscriptionId }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleReactivate() {
    setLoading(true);
    const res = await fetch("/api/subscription/reactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleReactivate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Reactivate plan
    </button>
  );
}