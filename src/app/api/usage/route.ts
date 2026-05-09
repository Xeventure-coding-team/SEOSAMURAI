import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { getUsageData } from "@/lib/get-usage-data";
import { syncLocationLimits } from "@/lib/syncLocationLimits";

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncLocationLimits(user.id)

  const data = await getUsageData(user.id);

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}