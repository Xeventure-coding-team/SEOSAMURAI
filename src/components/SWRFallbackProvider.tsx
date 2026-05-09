"use client";

import { SWRConfig, mutate } from "swr";
import { UsageData } from "@/lib/use-usage";
import { useEffect } from "react";

export default function SWRFallbackProvider({
  usageFallback,
  children,
}: {
  usageFallback: UsageData | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = () => mutate("/api/usage")
    window.addEventListener("usage-changed", handler)
    return () => window.removeEventListener("usage-changed", handler)
  }, [])

  return (
    <SWRConfig value={{
      fallback: { "/api/usage": usageFallback },
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30_000, 
    }}>
      {children}
    </SWRConfig>
  );
}