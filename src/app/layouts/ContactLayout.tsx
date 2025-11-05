'use client';

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ThemeProvider } from "next-themes";
import { Toaster } from 'react-hot-toast';
import NextTopLoader from 'nextjs-toploader'
import { usePathname } from "next/navigation";
import GMBAuthWrapper from "../wrapper/GMBAuthWrapper";
import { APIProvider } from "@vis.gl/react-google-maps";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function ContactLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

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
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant={pathname === "/app/scan" ? "sidebar" : "inset"} />
        <SidebarInset>
          {<SiteHeader />}
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className={`flex flex-col gap-4 md:gap-6 ${noPadding ? "" : "py-4 md:py-6 px-4 lg:px-6"}`}>
                {/* <APIProvider apiKey={process.env.NEXT_PUBLIC_PLACES_KEY}><GMBAuthWrapper>{children}</GMBAuthWrapper></APIProvider> */}
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}
