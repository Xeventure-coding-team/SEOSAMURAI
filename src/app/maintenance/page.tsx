import Logo from "@/components/Logo";
import { prisma } from "../../../lib/prisma";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await prisma.siteSettings.findUnique({
        where: { id: "singleton" },
        select: { maintenanceBanner: true, siteName: true },
    });

    return {
        title: `${settings?.siteName ?? "App"} — Scheduled Maintenance`,
        description:
            settings?.maintenanceBanner ??
            "We're performing scheduled maintenance and will be back shortly.",
        robots: "noindex, nofollow",
    };
}

export const revalidate = 30;

export default async function MaintenancePage() {
    const settings = await prisma.siteSettings.findUnique({
        where: { id: "singleton" },
        select: {
            maintenanceBanner: true,
            siteName: true,
            supportEmail: true,
        },
    });

    const siteName = settings?.siteName ?? "Our platform";
    const message =
        settings?.maintenanceBanner ??
        "We're making improvements to serve you better. Check back shortly.";

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex flex-col">


            {/* Background grid */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.5]"
                style={{
                    backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Edge fade */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: `radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, var(--background) 100%)`,
                }}
            />



            {/* Top bar */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/60 backdrop-blur-sm">
                <Logo />

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                    </span>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-300">
                        Maintenance in progress
                    </span>
                </div>
            </header>

            {/* Main content */}
            <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20 text-center pb-20">
                <div className="max-w-lg mx-auto space-y-8">

                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted border border-border shadow-sm">
                        <svg
                            className="w-7 h-7 text-primary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                            />
                        </svg>
                    </div>

                    {/* Heading */}
                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold tracking-tight">
                            Down for maintenance
                        </h1>
                        <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
                            {message}
                        </p>
                    </div>

                    <div className="w-12 h-px bg-border mx-auto" />

                    {/* Status cards */}
                    <div className="grid grid-cols-3 gap-3 text-left">
                        {[
                            { label: "API", status: "Degraded", color: "amber" },
                            { label: "Dashboard", status: "Offline", color: "red" },
                            { label: "Data sync", status: "Operational", color: "emerald" },
                        ].map(({ label, status, color }) => (
                            <div
                                key={label}
                                className="rounded-xl bg-muted/40 border border-border px-3 py-3 space-y-2 backdrop-blur-sm"
                            >
                                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color === "amber" ? "bg-amber-400" :
                                            color === "red" ? "bg-red-400" :
                                                "bg-emerald-400"
                                        }`} />
                                    <span className={`text-xs font-medium ${color === "amber" ? "text-amber-600 dark:text-amber-300" :
                                            color === "red" ? "text-red-600 dark:text-red-300" :
                                                "text-emerald-600 dark:text-emerald-300"
                                        }`}>
                                        {status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Contact */}
                    {settings?.supportEmail && (
                        <p className="text-sm text-muted-foreground">
                            Need urgent help?{" "}
                            <a
                                href={`mailto:${settings.supportEmail}`}
                                className="text-primary hover:underline underline-offset-2 transition-colors font-medium"
                            >
                                {settings.supportEmail}
                            </a>
                        </p>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-border/60 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
                <p className="text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} {siteName}
                </p>
                <p className="text-xs text-muted-foreground">
                    Page refreshes automatically
                </p>
            </footer>

            <meta httpEquiv="refresh" content="30" />
        </div>
    );
}