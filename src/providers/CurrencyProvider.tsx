"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { detectCurrency, type SupportedCurrency } from "@/lib/stripe";

interface CurrencyContextValue {
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "preferred_currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>("inr");

  // Hydrate from localStorage (or auto-detect) on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SupportedCurrency | null;
    setCurrencyState(stored ?? detectCurrency());
  }, []);

  const setCurrency = (c: SupportedCurrency) => {
    localStorage.setItem(STORAGE_KEY, c);
    setCurrencyState(c);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}