import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  AlertCircle,
  FileText,
  Link,
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
    badge: "bg-emerald-500 text-white border-transparent hover:bg-emerald-600",
    label: "Added",
    dot: "bg-emerald-500",
  },
  fixed: {
    icon: AlertCircle,
    badge: "bg-blue-500 text-white border-transparent hover:bg-blue-600",
    label: "Fixed",
    dot: "bg-blue-500",
  },
  changed: {
    icon: Pencil,
    badge: "bg-amber-500 text-white border-transparent hover:bg-amber-600",
    label: "Changed",
    dot: "bg-amber-500",
  },
  removed: {
    icon: Trash2,
    badge: "bg-red-500 text-white border-transparent hover:bg-red-600",
    label: "Removed",
    dot: "bg-red-500",
  },
  security: {
    icon: Shield,
    badge: "bg-violet-500 text-white border-transparent hover:bg-violet-600",
    label: "Security",
    dot: "bg-violet-500",
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

// Splits body into prose paragraphs and grouped bullet lists
function parseBody(body: string) {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  type Segment =
    | { kind: "paragraph"; text: string }
    | { kind: "bullets"; items: string[] };

  const segments: Segment[] = [];

  for (const line of lines) {
    const isBullet = /^[-•*]\s/.test(line);
    const clean = isBullet ? line.replace(/^[-•*]\s/, "") : line;

    if (isBullet) {
      const last = segments[segments.length - 1];
      if (last?.kind === "bullets") {
        last.items.push(clean);
      } else {
        segments.push({ kind: "bullets", items: [clean] });
      }
    } else {
      segments.push({ kind: "paragraph", text: clean });
    }
  }

  return segments;
}

// Group entries by release date (YYYY-MM-DD)
function groupByDate(entries: ChangelogEntry[]) {
  const groups = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const key = format(new Date(entry.releaseDate), "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    dateKey: key,
    date: items[0].releaseDate,
    // Use version from first entry in the group as the label
    version: items[0].version,
    entries: items,
  }));
}

// Slugify a date for anchor IDs
function dateSlug(d: Date | string) {
  return format(new Date(d), "yyyy-MM-dd");
}

export function ChangelogDisplay({
  entries,
  title = "Changelog",
  showMetadata = true,
  searchTerm = "",
}: ChangelogDisplayProps) {
  const fmtDate = (d: Date | string) =>
    format(new Date(d), "MMMM d, yyyy");

  // ── Empty state ──────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5">
          <FileText className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">No releases yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Changelog entries will appear here once they're published.
          </p>
        </div>
      </div>
    );
  }

  const groups = groupByDate(entries);

  // ── Grouped flat layout ──────────────────────────────────────────────────
  return (
    <div className="space-y-10">
      {groups.map((group, index) => {
        const slug = dateSlug(group.date);

        return (
          <section key={group.dateKey} id={slug} className="scroll-mt-6">
            {/* Date heading */}
            <div className="flex items-baseline gap-3 mb-4 group/heading">
              <a
                href={`#${slug}`}
                className="flex items-baseline gap-3 no-underline"
                aria-label={`Link to ${fmtDate(group.date)}`}
              >
                <h2 className="text-xl font-bold text-foreground">
                  {fmtDate(group.date)}
                </h2>
                <span className="text-sm text-muted-foreground font-mono">
                  v{group.version}
                </span>
                <Link
                  className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover/heading:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
              </a>
            </div>

            {/* Entries for this date */}
            <div className="space-y-5">
              {group.entries.map((entry) => {
                const type = (entry.type ?? "changed") as keyof typeof typeConfig;
                const config = typeConfig[type] ?? typeConfig.changed;
                const Icon = config.icon;
                const segments = parseBody(entry.body);

                return (
                  <div key={entry.id}>
                    {/* Type badge + title */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge
                        className={cn(
                          "rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                          config.badge
                        )}
                      >
                        {config.label}
                      </Badge>
                      {entry.title && (
                        <span className="text-sm font-medium text-foreground">
                          {searchTerm
                            ? highlightText(entry.title, searchTerm)
                            : entry.title}
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="space-y-2 pl-0">
                      {segments.map((seg, i) => {
                        if (seg.kind === "paragraph") {
                          return (
                            <p
                              key={i}
                              className="text-sm leading-relaxed text-muted-foreground"
                            >
                              {searchTerm
                                ? highlightText(seg.text, searchTerm)
                                : seg.text}
                            </p>
                          );
                        }

                        return (
                          <ul key={i} className="space-y-1 ml-1">
                            {seg.items.map((item, j) => (
                              <li
                                key={j}
                                className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                              >
                                <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
                                <span>
                                  {searchTerm
                                    ? highlightText(item, searchTerm)
                                    : item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

         {index < groups.length - 1 && (
  <div className="mt-10 border-t border-border/60" />
)}

          </section>
        );
      })}
    </div>
  );
}