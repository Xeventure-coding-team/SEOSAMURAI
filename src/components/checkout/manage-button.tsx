"use client";

import { ExternalLink } from "lucide-react";

export function ManageButton() {
  async function handleClick() {
    const res = await fetch("/api/billing-portal", { method: "POST" });
    const { url, error } = await res.json();
    if (url) window.location.href = url;
    else console.error("Billing portal error:", error);
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors whitespace-nowrap"
    >
      <ExternalLink className="h-4 w-4" />
      Manage
    </button>
  );
}