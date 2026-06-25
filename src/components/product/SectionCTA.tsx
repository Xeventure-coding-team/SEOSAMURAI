import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    <section className="my-24">
      <Card className="overflow-hidden border bg-gradient-to-br from-primary/5 via-card to-card">
        <CardContent className="flex flex-col items-center text-center md:px-16 md:py-1^">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            {subtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}