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
        {(Object.entries(CURRENCY_CONFIG) as [SupportedCurrency, (typeof CURRENCY_CONFIG)[SupportedCurrency]][]).map(
          ([key, cfg]) => (
            <SelectItem key={key} value={key} className="text-xs">
              {cfg.symbol} {cfg.code}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );
}