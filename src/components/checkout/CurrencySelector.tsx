"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_CONFIG, type SupportedCurrency } from "@/lib/stripe";
import { useCurrency } from "@/providers/CurrencyProvider";

const CURRENCY_OPTIONS: { value: SupportedCurrency; label: string }[] = [
  { value: "inr", label: "₹ INR" },
  { value: "usd", label: "$ USD" },
  { value: "eur", label: "€ EUR" },
  { value: "aed", label: "د.إ AED" },
];

interface CurrencySelectorProps {
  className?: string;
}

export function CurrencySelector({ className }: CurrencySelectorProps) {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select
      value={currency}
      onValueChange={(val) => setCurrency(val as SupportedCurrency)}
    >
      <SelectTrigger className={className ?? "w-[110px] h-8 text-xs"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}