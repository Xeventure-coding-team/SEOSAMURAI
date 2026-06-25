import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

// PUT: { provider } — makes this provider the only active one
export async function PUT(req: Request) {
  const { provider } = await req.json();

  const target = await prisma.aIProviderConfig.findUnique({ where: { provider } });
  if (!target) {
    return NextResponse.json({ error: "Provider has no config" }, { status: 404 });
  }
  if (!target.enabled) {
    return NextResponse.json({ error: "Provider is disabled" }, { status: 400 });
  }

  // atomic: unset everyone, then set the chosen one — no window where 2 are active
  await prisma.$transaction([
    prisma.aIProviderConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    }),
    prisma.aIProviderConfig.update({
      where: { provider },
      data: { isActive: true },
    }),
  ]);

  return NextResponse.json({ ok: true, activeProvider: provider });
}