import type { BusinessInfo } from "./types";

export function parseOpeningHours(bi: BusinessInfo): string[] | null {
  const raw = bi._rawLocationData?.opening_hours;
  if (raw?.weekday_text?.length) return raw.weekday_text;

  const oh = bi.openingHours as any;
  if (!oh) return null;

  if (Array.isArray(oh.weekday_text) && oh.weekday_text.length) return oh.weekday_text;

  if (typeof oh === "object" && !Array.isArray(oh)) {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const lines: string[] = [];
    for (const day of days) {
      if (oh[day]) {
        const v = oh[day];
        const label = day.charAt(0).toUpperCase() + day.slice(1);
        lines.push(
          v.isClosed
            ? `${label}: Closed`
            : `${label}: ${v.open || "--"} – ${v.close || "--"}`
        );
      }
    }
    return lines.length ? lines : null;
  }

  return null;
}

export function isOpenNow(bi: BusinessInfo): boolean | null {
  const raw = bi._rawLocationData?.opening_hours;
  if (raw && typeof raw.open_now === "boolean") return raw.open_now;
  const oh = bi.openingHours as any;
  if (oh && typeof oh.open_now === "boolean") return oh.open_now;
  return null;
}

export function buildGmbReviewsUrl(placeId?: string, businessName?: string, address?: string): string | undefined {
  if (placeId) {
    return `https://search.google.com/local/reviews?placeid=${placeId}`;
  }
  if (businessName) {
    const q = encodeURIComponent([businessName, address].filter(Boolean).join(" "));
    return `https://www.google.com/maps/search/${q}`;
  }
  return undefined;
}