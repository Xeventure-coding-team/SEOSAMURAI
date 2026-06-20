'use client';
import { ThemeProvider } from "next-themes";
import { Toaster } from 'react-hot-toast';
import NextTopLoader from 'nextjs-toploader'
import Navbar from "@/components/frontend/Navbar";
import Footer from "@/components/frontend/Footer";
import MarketingLayout from "./MarketingLayout";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: DashboardLayoutProps) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Navbar />

            <Toaster
                position="top-right"
                reverseOrder={false}
                containerStyle={{ zIndex: 9999 }}
                toastOptions={{
                    duration: 4000,
                    className: "!rounded-xl !shadow-lg !border !text-sm !font-medium",
                    style: {
                        background: "var(--background)",
                        color: "var(--foreground)",
                        borderColor: "var(--border)",
                        padding: "12px 16px",
                        gap: "10px",
                    },
                    success: {
                        iconTheme: { primary: "#10b981", secondary: "white" },
                        style: {
                            borderColor: "#10b98130",
                            background: "var(--background)",
                        },
                    },
                    error: {
                        iconTheme: { primary: "#ef4444", secondary: "white" },
                        style: {
                            borderColor: "#ef444430",
                            background: "var(--background)",
                        },
                    },
                    loading: {
                        iconTheme: { primary: "var(--foreground)", secondary: "transparent" },
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

            <MarketingLayout>
                {children}
            </MarketingLayout>
            <Footer />
        </ThemeProvider>
    )
}
