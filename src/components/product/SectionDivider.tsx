interface SectionDividerProps {
    label?: string;
}

export default function SectionDivider({ label }: SectionDividerProps) {
    if (!label) {
        return (
            <div
                className="my-20 h-px w-full"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, transparent, var(--border) 15%, var(--border) 85%, transparent)",
                }}
            />
        );
    }

    return (
        <div className="my-20 flex items-center gap-4">
            <div
                className="h-px flex-1"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, transparent, var(--border))",
                }}
            />
            <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </span>
            <div
                className="h-px flex-1"
                style={{
                    backgroundImage:
                        "linear-gradient(to left, transparent, var(--border))",
                }}
            />
        </div>
    );
}