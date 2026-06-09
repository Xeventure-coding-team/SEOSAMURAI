import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") }); // also tries .env.local

const STACK_API_BASE = "https://api.hexclave.com/api/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID;
const SECRET_KEY = process.env.HEXCLAVE_SECRET_SERVER_KEY;
const PERMISSION_ID = "access_admin_dashboard";

// ─── Validate env ────────────────────────────────────────────────────────────

if (!PROJECT_ID || !SECRET_KEY) {
  console.error("❌ Missing env variables.");
  console.error("   Make sure NEXT_PUBLIC_HEXCLAVE_PROJECT_ID and HEXCLAVE_SECRET_SERVER_KEY are set in .env");
  process.exit(1);
}

const input = process.argv[2];
if (!input) {
  console.error("❌ Please provide an email or user ID.");
  console.error("   Usage: npx tsx scripts/make-admin.ts <email-or-user-id>");
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const headers = {
  "Content-Type": "application/json",
  "x-stack-project-id": PROJECT_ID,
  "x-stack-secret-server-key": SECRET_KEY,
  "x-stack-access-type": "server",
};

async function apiRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${STACK_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${error}`);
  }

  return res.status === 204 ? null : res.json();
}

// ─── Find user by email or ID ─────────────────────────────────────────────────

async function findUser(input: string): Promise<{ id: string; displayName: string; primaryEmail: string }> {
  const isEmail = input.includes("@");

  if (isEmail) {
    // List users and filter by email
    const data = await apiRequest("GET", `/users?limit=100`);
    const user = data?.items?.find((u: any) =>
      u.primary_email?.toLowerCase() === input.toLowerCase()
    );
    if (!user) throw new Error(`No user found with email: ${input}`);
    return {
      id: user.id,
      displayName: user.display_name ?? "(no name)",
      primaryEmail: user.primary_email,
    };
  } else {
    // Direct lookup by ID
    const user = await apiRequest("GET", `/users/${input}`);
    return {
      id: user.id,
      displayName: user.display_name ?? "(no name)",
      primaryEmail: user.primary_email,
    };
  }
}

// ─── Grant permission ─────────────────────────────────────────────────────────

async function grantAdminPermission(userId: string) {
  await apiRequest(
    "POST",
    `/project-permissions/${userId}/${PERMISSION_ID}`,
    {}
  );
}

// ─── Check existing permissions ───────────────────────────────────────────────

async function hasAdminPermission(userId: string): Promise<boolean> {
  try {
    const data = await apiRequest("GET", `/project-permissions?user_id=${userId}`);
    return data?.items?.some((p: any) => p.id === PERMISSION_ID) ?? false;
  } catch {
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔐 Stack Auth - Make Admin\n");
  console.log(`   Looking up user: ${input}`);

  let user: { id: string; displayName: string; primaryEmail: string };

  try {
    user = await findUser(input);
  } catch (err: any) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }

  console.log(`   ✅ Found: ${user.displayName} <${user.primaryEmail}>`);
  console.log(`   ID: ${user.id}`);

  // Check if already admin
  const alreadyAdmin = await hasAdminPermission(user.id);
  if (alreadyAdmin) {
    console.log(`\n⚠️  User already has '${PERMISSION_ID}' permission. Nothing to do.\n`);
    process.exit(0);
  }

  // Grant permission
  try {
    await grantAdminPermission(user.id);
    console.log(`\n✅ Successfully granted '${PERMISSION_ID}' to ${user.primaryEmail}`);
    console.log(`   Next login will redirect to /admin/**\n`);
  } catch (err: any) {
    console.error(`\n❌ Failed to grant permission: ${err.message}`);
    process.exit(1);
  }
}

main();