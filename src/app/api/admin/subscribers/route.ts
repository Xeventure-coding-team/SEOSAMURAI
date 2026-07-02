import { stackServerApp } from "@/stack";
import { NextResponse } from "next/server";
import { requireAccess } from "../../../../../lib/require-access";

type NotificationPreference = {
  notification_category_id: string;
  notification_category_name: string;
  enabled: boolean;
  can_disable: boolean;
};

async function hasMarketingEnabled(userId: string) {
  const projectId =
    process.env.HEXCLAVE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID;

  const secretServerKey = process.env.HEXCLAVE_SECRET_SERVER_KEY;

  if (!projectId || !secretServerKey) {
    throw new Error("Missing Hexclave environment variables");
  }

  const res = await fetch(
    `https://api.hexclave.com/api/v1/emails/notification-preference/${encodeURIComponent(
      userId
    )}`,
    {
      headers: {
        "X-Hexclave-Access-Type": "server",
        "X-Hexclave-Project-Id": projectId,
        "X-Hexclave-Secret-Server-Key": secretServerKey,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch notification preferences for ${userId}`);
  }

  const data: { items: NotificationPreference[] } = await res.json();

  const marketing = data.items.find(
    (item) => item.notification_category_name === "Marketing"
  );

  return marketing?.enabled === true;
}

export async function GET() {
  const currentUser = await stackServerApp.getUser();

  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canAccessAdmin = await currentUser.getPermission(
    "access_admin_dashboard"
  );

  if (!canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await stackServerApp.listUsers();

  const subscribers = (
    await Promise.all(
      users.map(async (u) => {
        const marketingEnabled = await hasMarketingEnabled(u.id);

        if (!marketingEnabled) {
          return null;
        }

        return {
          id: u.id,
          email: u.primaryEmail,
          displayName: u.displayName,
          signedUpAt: u.signedUpAt,
        };
      })
    )
  ).filter(Boolean);

  return NextResponse.json(subscribers);
}