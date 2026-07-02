import { NextResponse } from "next/server";
import { encrypt, last4 } from "../../../../../../lib/crypto";
import { prisma } from "../../../../../../lib/prisma";
import { requireAccess } from "../../../../../../lib/require-access";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { apiKey, model, enabled } = await req.json();

  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  const data: Record<string, unknown> = {};
  if (typeof model !== "undefined") data.model = model;
  if (typeof enabled !== "undefined") data.enabled = enabled;
  if (apiKey) {
    data.apiKeyEncrypted = encrypt(apiKey);
    data.apiKeyLast4 = last4(apiKey);
  }
  // disabling a provider can't leave it active
  if (enabled === false) data.isActive = false;

  try {
    const updated = await prisma.aIProviderConfig.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      provider: updated.provider,
      model: updated.model,
      enabled: updated.enabled,
      isActive: updated.isActive,
      maskedKey: updated.apiKeyLast4 ? `•••• ${updated.apiKeyLast4}` : null,
    });
  } catch {
    return NextResponse.json({ error: "Provider config not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;
  try {
    await prisma.aIProviderConfig.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Provider config not found" }, { status: 404 });
  }
}