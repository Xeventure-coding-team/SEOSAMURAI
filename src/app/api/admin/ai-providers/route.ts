import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { encrypt, last4 } from "../../../../../lib/crypto";
import { requireAccess } from "../../../../../lib/require-access";

const VALID = ["openai", "gemini", "claude", "deepseek"];

export async function GET() {
  const providers = await prisma.aIProviderConfig.findMany({
    orderBy: { provider: "asc" },
  });

  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  return NextResponse.json(
    providers.map((p) => ({
      id: p.id,
      provider: p.provider,
      model: p.model,
      enabled: p.enabled,
      isActive: p.isActive,
      maskedKey: p.apiKeyLast4 ? `•••• ${p.apiKeyLast4}` : null,
    }))
  );
}

export async function POST(req: Request) {
  const { provider, apiKey, model, enabled } = await req.json();

  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  if (!VALID.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  const existing = await prisma.aIProviderConfig.findUnique({ where: { provider } });
  if (existing) {
    return NextResponse.json(
      { error: "This provider already has a config. Use PATCH to edit it." },
      { status: 409 }
    );
  }

  const created = await prisma.aIProviderConfig.create({
    data: {
      provider,
      apiKeyEncrypted: encrypt(apiKey),
      apiKeyLast4: last4(apiKey),
      model: model ?? null,
      enabled: enabled ?? true,
    },
  });

  return NextResponse.json({
    id: created.id,
    provider: created.provider,
    model: created.model,
    enabled: created.enabled,
    isActive: false,
    maskedKey: `•••• ${created.apiKeyLast4}`,
  });
}