export interface CloudflareContext {
  ip: string;
  country: string;
  threatScore: number;
  isBot: boolean;
}

export function getCloudflareContext(requestHeaders: Headers): CloudflareContext {
  const ip          = requestHeaders.get("cf-connecting-ip")
                   ?? requestHeaders.get("x-forwarded-for")?.split(",")[0].trim()
                   ?? "unknown";
  const country     = requestHeaders.get("cf-ipcountry") ?? "unknown";
  const threatScore = parseInt(requestHeaders.get("cf-threat-score") ?? "0", 10);
  // cf-worker sets this when Cloudflare's bot detection fires
  const isBot       = requestHeaders.get("cf-worker") === "true"
                   || threatScore > 50;

  return { ip, country, threatScore, isBot };
}

export function isRequestSuspicious(ctx: CloudflareContext): { blocked: boolean; reason?: string } {
  // Block high threat score IPs
  if (ctx.threatScore > 50) {
    return { blocked: true, reason: "Request blocked due to suspicious activity." };
  }

  // Optionally block specific countries (add yours as needed)
  const BLOCKED_COUNTRIES: string[] = [
    // e.g. "KP", "CU" — add only if your SaaS legally can't serve them
  ];
  if (BLOCKED_COUNTRIES.includes(ctx.country)) {
    return { blocked: true, reason: "Service not available in your region." };
  }

  return { blocked: false };
}