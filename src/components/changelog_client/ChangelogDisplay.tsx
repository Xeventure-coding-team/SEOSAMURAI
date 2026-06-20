import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  X,
  Trash2,
  Shield,
  AlertCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChangelogEntry {
  id: string;
  title: string;
  version: string;
  body: string;
  type?: "added" | "fixed" | "changed" | "removed" | "security" | null;
  releaseDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ChangelogDisplayProps {
  entries: ChangelogEntry[];
  title?: string;
  showMetadata?: boolean;
  searchTerm?: string;
}

const typeConfig = {
  added: {
    icon: Plus,
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Added",
  },
  fixed: {
    icon: AlertCircle,
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
    label: "Fixed",
  },
  changed: {
    icon: Pencil,
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    label: "Changed",
  },
  removed: {
    icon: Trash2,
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dot: "bg-red-500",
    label: "Removed",
  },
  security: {
    icon: Shield,
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    dot: "bg-violet-500",
    label: "Security",
  },
};

function highlightText(text: string, term: string): React.ReactNode {
  if (!term.trim()) return text;
  const parts = text.split(new RegExp(`(${term})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark
        key={i}
        className="bg-yellow-200/80 dark:bg-yellow-800/40 text-inherit rounded-[2px] px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function parseBody(body: string) {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function ChangelogDisplay({
  entries,
  title = "Changelog",
  showMetadata = true,
  searchTerm = "",
}: ChangelogDisplayProps) {
  const fmt = (d: Date | string) => format(new Date(d), "MMM d, yyyy");

  // ── Empty state ────────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5">
          <FileText className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Nothing here yet</p>
          <p className="text-sm text-muted-foreground">
            Releases will appear here once they're documented.
          </p>
        </div>
      </div>
    );
  }

  // ── Timeline ───────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Vertical rail — hidden on mobile, visible md+ */}
      <div
        className="absolute left-[11px] top-2 bottom-2 hidden md:block w-px bg-border"
        aria-hidden="true"
      />

      <ol className="space-y-0">
        {entries.map((entry, idx) => {
          const type = (entry.type ?? "changed") as keyof typeof typeConfig;
          const config = typeConfig[type] ?? typeConfig.changed;
          const Icon = config.icon;
          const lines = parseBody(entry.body);
          const isLast = idx === entries.length - 1;

          return (
            <li
              key={entry.id}
              className={cn(
                "relative md:pl-10",
                !isLast && "pb-10"
              )}
            >
              {/* Timeline dot */}
              <span
                className={cn(
                  "absolute left-0 top-[18px] hidden md:flex h-[23px] w-[23px] items-center justify-center rounded-full ring-4 ring-background",
                  config.dot
                )}
                aria-hidden="true"
              >
                <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />
              </span>

              {/* Card */}
              <div className="group rounded-xl border border-border bg-card transition-all duration-200 hover:border-border/80 hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-black/20">
                {/* ── Header ── */}
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Type badge — mobile shows dot inline */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                        config.badge
                      )}
                    >
                      <Icon className="h-3 w-3" strokeWidth={2.5} />
                      {config.label}
                    </Badge>

                    <h3 className="text-base font-semibold leading-snug text-foreground">
                      {searchTerm ? highlightText(entry.title, searchTerm) : entry.title}
                    </h3>
                  </div>

                  {/* Version + date */}
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono font-medium text-foreground/70">
                      v{entry.version}
                    </span>
                    <span className="text-border">|</span>
                    <time dateTime={new Date(entry.releaseDate).toISOString()}>
                      {fmt(entry.releaseDate)}
                    </time>
                  </div>
                </div>

                <Separator />

                {/* ── Body ── */}
                <div className="px-5 py-4">
                  <ul className="space-y-2">
                    {lines.map((line, i) => {
                      const isBullet = /^[-•*]\s/.test(line);
                      const clean = isBullet
                        ? line.replace(/^[-•*]\s/, "")
                        : line;

                      return (
                        <li
                          key={i}
                          className={cn(
                            "flex gap-2.5 text-sm leading-relaxed text-muted-foreground",
                            isBullet ? "items-start" : "items-baseline"
                          )}
                        >
                          {isBullet && (
                            <span
                              className={cn(
                                "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full",
                                config.dot,
                                "opacity-60"
                              )}
                              aria-hidden="true"
                            />
                          )}
                          <span>
                            {searchTerm ? highlightText(clean, searchTerm) : clean}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}