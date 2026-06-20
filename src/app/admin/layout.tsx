import { stackServerApp } from "@/stack";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AdminNav from "@/components/admin/admin-nav";
import Logo from "@/components/Logo";
import NextTopLoader from "nextjs-toploader";


export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const permission = await user.getPermission("access_admin_dashboard");
  if (!permission) redirect("/app/dashboard");

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  const initials = (user.displayName ?? "AD")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-muted/30">

      <NextTopLoader
        color="var(--primary)"
        initialPosition={0.08}
        crawlSpeed={200}
        height={3}
        crawl={true}
        showSpinner={true}
        easing="ease"
        speed={200}
        shadow="0 0 10px var(--primary),0 0 5px var(--primary)"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex h-14 items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <Logo />
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex">
                Admin
              </Badge>
            </div>

            {/* Nav — client component handles mobile sheet + active state */}
            <AdminNav
              initials={initials}
              displayName={user.displayName ?? "Admin"}
              email={user.primaryEmail ?? ""}
            />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-screen-xl px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}