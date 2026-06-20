import { prisma } from "../../../../../lib/prisma";
import { requireAccess } from "../../../../../lib/require-access";

const CACHE_TTL_MS = 1000 * 60 * 60 * 5; // 5 hours
const CACHE_KEY = "clarity_analytics";
const CLARITY_URL = "https://www.clarity.ms/export-data/api/v1/project-live-insights";

async function fetchClarity(dimension: string) {
  const res = await fetch(
    `${CLARITY_URL}?numOfDays=3&dimension1=${dimension}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLARITY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`Clarity API error ${res.status} for ${dimension}`);
  const json = await res.json();
  console.log(`[Clarity raw - ${dimension}]:`, JSON.stringify(json[0])); // log first item
  return json;
}

export async function GET() {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  const cached = await prisma.apiCache.findUnique({ where: { key: CACHE_KEY } });

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return Response.json(cached.data);
  }
  try {
    const [traffic, byCountry, byDevice] = await Promise.all([
      fetchClarity("browser"),
      fetchClarity("country"),
      fetchClarity("device"),
    ]);

    const data = { traffic, byCountry, byDevice };

    await prisma.apiCache.upsert({
      where: { key: CACHE_KEY },
      update: { data, fetchedAt: new Date() },
      create: { key: CACHE_KEY, data, fetchedAt: new Date() },
    });

    return Response.json(data);
  } catch (e: any) {
    // Return stale data if available, otherwise null
    if (cached) {
      const ageHours = ((Date.now() - cached.fetchedAt.getTime()) / 1000 / 60 / 60).toFixed(1);
      return Response.json(cached.data);
    }

    return Response.json(null);
  }
}