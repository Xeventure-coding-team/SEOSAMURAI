import Link from "next/link";
import { Button } from "../ui/button";

interface CTABarProps {
    boldText: string;
    lightText: string;
    buttonLabel: string;
    href: string;
}

export default function CTABar({
    boldText,
    lightText,
    buttonLabel,
    href,
}: CTABarProps) {
    return (
        <section className="bg-primary py-5">
            <div className="container">
                <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-4">
                    <p className="text-base text-primary-foreground">
                        <span className="font-semibold tracking-tight">
                            {boldText}
                        </span>
                        <span className="mx-2 text-primary-foreground/40">•</span>
                        <span className="text-primary-foreground/80">
                            {lightText}
                        </span>
                    </p>

                    <Button
                        asChild
                        variant="secondary"
                        className="font-medium"
                    >
                        <Link href={href}>{buttonLabel}</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}