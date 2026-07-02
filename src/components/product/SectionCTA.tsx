import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionCTAProps {
    title?: string;
    subtitle?: string;
    primaryLabel?: string;
    primaryHref?: string;
    secondaryLabel?: string;
    secondaryHref?: string;
}

export default function SectionCTA({
    title = "Ready to get started?",
    subtitle = "Manage all your Google Business Profile locations from one dashboard.",
    primaryLabel = "Get Started",
    primaryHref = "/signup",
    secondaryLabel = "Talk to sales",
    secondaryHref = "/contact",
}: SectionCTAProps) {
    return (
        <section className="mt-14 mb-14">
            <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center sm:px-12 sm:py-20">
                <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {title}
                </h2>

                <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                    {subtitle}
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Button asChild size="lg" className="rounded-full px-7">
                        <Link href={primaryHref}>
                            {primaryLabel}
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="rounded-full px-7"
                    >
                        <Link href={secondaryHref}>{secondaryLabel}</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}