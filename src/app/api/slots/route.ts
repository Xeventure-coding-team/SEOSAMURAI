import { NextRequest, NextResponse } from "next/server";
import { canAddSlot } from "@/lib/slots";
import { stackServerApp } from "@/stack";

export async function GET(req: NextRequest) {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resource = req.nextUrl.searchParams.get("resource") as "locations" | "websites" | null;
  if (!resource || !["locations", "websites"].includes(resource)) {
    return NextResponse.json({ error: "Invalid resource" }, { status: 400 });
  }

  const result = await canAddSlot(user.id, resource);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}