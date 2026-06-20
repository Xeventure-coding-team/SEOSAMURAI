'use client';

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "next-themes";
import { Toaster } from 'react-hot-toast';
import NextTopLoader from 'nextjs-toploader'
import { usePathname, useRouter } from "next/navigation";
import GMBAuthWrapper from "../wrapper/GMBAuthWrapper";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useStackApp, useUser } from "@hexclave/next"
import { useEffect, useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const user = useUser({ or: 'redirect' });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!user) return;

    user.getPermission('access_admin_dashboard').then((permission) => {
      if (permission) {
        router.replace('/admin/dashboard');
        // Don't setAuthChecked — keep blocked while redirecting
      } else {
        setAuthChecked(true);
      }
    });
  }, [user, router]);

  // Block everything until user is loaded AND permission check is done
  if (!user || !authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-col items-center gap-5 p-8">
              {/* Spinner */}
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-primary" />
              </div>

              {/* Text */}
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-semibold">
                  Preparing your workspace
                </h2>
                <p className="text-sm text-muted-foreground">
                  Checking your account and permissions...
                </p>
              </div>

              {/* Progress bars */}
              <div className="w-full space-y-3">
                <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
                <div className="h-2 w-4/5 animate-pulse rounded-full bg-muted" />
                <div className="h-2 w-3/5 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const noPadding =
    ["/app/settings", "/app/scan"].some(p => pathname.startsWith(p)) ||
    /^\/app\/locations\/[^\/]+\/manage$/.test(pathname);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster
        containerStyle={{ zIndex: 9999 }}
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          className: "border rounded-lg shadow-md",
          style: {
            background: "var(--background)",
            color: "var(--foreground)",
            borderColor: "var(--border)",
          },
        }}
      />

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

      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className={`flex flex-col gap-4 md:gap-6 ${noPadding ? "" : "py-4 md:py-6 px-4 lg:px-6"}`}>
                <APIProvider apiKey={process.env.NEXT_PUBLIC_PLACES_KEY}>
                  <GMBAuthWrapper>{children}</GMBAuthWrapper>
                </APIProvider>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}