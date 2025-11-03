'use client';
import { ThemeProvider } from "next-themes";
import { Toaster } from 'react-hot-toast';
import NextTopLoader from 'nextjs-toploader'
import { usePathname } from "next/navigation";
import Navbar from "@/components/frontend/Navbar";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();


    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Navbar />
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

            {children}
        </ThemeProvider>
    )
}
