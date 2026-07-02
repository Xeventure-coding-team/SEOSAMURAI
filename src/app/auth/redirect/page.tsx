import { stackServerApp } from "@/stack";
import { redirect } from "next/navigation";

export default async function AuthRedirectPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });

  const canAccessAdminDashboard = await user.getPermission(
    "access_admin_dashboard"
  );

  if (canAccessAdminDashboard) {
    redirect("/admin/dashboard");
  }

  redirect("/app/dashboard");
}