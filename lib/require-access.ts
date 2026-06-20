import { stackServerApp } from "@/stack";
import { NextResponse } from "next/server";

type Permission =
  | "access_admin_dashboard"
  | "manage_blog"             
  | "manage_users";

export async function requireAccess(permission?: Permission) {
  const user = await stackServerApp.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (permission) {
    const perm = await user.getPermission(permission);
    if (!perm) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  return { user };
}