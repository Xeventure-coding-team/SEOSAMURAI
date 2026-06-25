import crypto from "crypto";

const RAW_KEY = process.env.SETTINGS_ENCRYPTION_KEY;
if (!RAW_KEY || RAW_KEY.length !== 64) {
  throw new Error(
    "SETTINGS_ENCRYPTION_KEY must be a 64-char hex string. Generate with `openssl rand -hex 32`."
  );
}
const KEY = Buffer.from(RAW_KEY, "hex");
const ALGO = "aes-256-gcm";

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function last4(key: string): string {
  return key.slice(-4);
}