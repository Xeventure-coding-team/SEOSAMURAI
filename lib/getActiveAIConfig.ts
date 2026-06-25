import { decrypt } from "./crypto";
import { prisma } from "./prisma";

export async function getActiveAIConfig() {
  const config = await prisma.aIProviderConfig.findFirst({
    where: { isActive: true, enabled: true },
  });
  if (!config?.apiKeyEncrypted) return null;

  return {
    provider: config.provider,
    model: config.model,
    apiKey: decrypt(config.apiKeyEncrypted),
  };
}