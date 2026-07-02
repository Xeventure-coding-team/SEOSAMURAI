"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type SupportedCurrency, CURRENCY_CONFIG, detectCurrency } from "@/lib/stripe";

interface CurrencyContextValue {
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "usd",
  setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<SupportedCurrency>("usd");

  useEffect(() => {
    // Auto-detect on mount (runs client-side only)
    setCurrency(detectCurrency());
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

// ─── Selector UI ──────────────────────────────────────────────────────────────
export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="currency-select"
        className="text-sm text-muted-foreground font-medium"
      >
        Currency
      </label>
      <div className="relative">
        <select
          id="currency-select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
          className="
            appearance-none
            bg-background
            border border-border
            rounded-lg
            pl-3 pr-8 py-1.5
            text-sm font-medium text-foreground
            cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
            hover:border-primary/60
            transition-colors
          "
        >
          {(Object.entries(CURRENCY_CONFIG) as [SupportedCurrency, typeof CURRENCY_CONFIG[SupportedCurrency]][]).map(
            ([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.symbol} {cfg.code}
              </option>
            )
          )}
        </select>
        
      </div>
    </div>
  );
}

// ─── Price display that reacts to currency context ─────────────────────────
import { formatPrice, type Plan } from "@/lib/stripe";

export function PlanPrice({
  plan,
  className,
}: {
  plan: Plan;
  className?: string;
}) {
  const { currency } = useCurrency();
  const amount = plan.prices[currency] ?? plan.prices["usd"];
  return <span className={className}>{formatPrice(amount, currency)}</span>;
}