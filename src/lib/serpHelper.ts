const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place/textsearch/json";

interface PlacesResult {
  found: boolean;
  rank: number | null;
  competitors: string[];
  total: number;
  message: string;
  success: boolean;
}

/**
 * Find local business rank using Google Places Text Search.
 *
 * @param keyword   - e.g. "digital marketing courses"
 * @param location  - e.g. "Wayanad, Kerala, India"
 * @param businessName - e.g. "Xeventure IT Solutions"
 */
export async function getLocalRank(
  keyword: string,
  location: string,
  businessName: string
): Promise<PlacesResult> {
  const apiKey = process.env.PLACES_KEY;

  if (!apiKey) {
    throw new Error("PLACES_KEY environment variable is not set");
  }

  const query = `${keyword} in ${location}`;
  const url = new URL(PLACES_API_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("type", "establishment");
  url.searchParams.set("language", "en");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === "REQUEST_DENIED") {
      throw new Error(`Places API denied: ${data.error_message}`);
    }

    if (data.status === "OVER_QUERY_LIMIT") {
      throw new Error("Places API quota exceeded — check console.cloud.google.com");
    }

    const results: { name: string }[] = data.results || [];
    const competitors = results.map((r) => r.name);

    // Find rank using fuzzy match (same logic as your PHP)
    const rank = findRank(competitors, businessName);

    return {
      success: true,
      found: rank > 0,
      rank: rank > 0 ? rank : null,
      competitors,
      total: competitors.length,
      message:
        rank > 0
          ? `${businessName} found at position #${rank}`
          : `${businessName} not found in top ${competitors.length} results`,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Places API timeout for keyword: ${keyword}`);
    }
    throw error;
  }
}

function findRank(businesses: string[], target: string): number {
  const t = target.toLowerCase().trim();

  for (let i = 0; i < businesses.length; i++) {
    const b = businesses[i].toLowerCase().trim();

    if (b === t) return i + 1;
    if (b.includes(t) || t.includes(b)) return i + 1;

    // Word overlap ≥ 60%
    const tw = t.split(" ").filter((w) => w.length > 2);
    const bw = b.split(" ").filter((w) => w.length > 2);
    let hits = 0;
    for (const word of tw) {
      if (bw.some((bWord) => bWord.includes(word))) hits++;
    }
    if (tw.length > 0 && hits >= Math.ceil(tw.length * 0.6)) return i + 1;
  }

  return 0;
}