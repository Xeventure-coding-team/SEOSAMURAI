"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, Mail } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  displayName?: string | null;
  signedUpAt: string; // ISO date
}

interface NewsletterSubscribersTableProps {
  /**
   * Fetches subscriber data. Wire this to your own server action or API route —
   * e.g. an endpoint that calls stackServerApp.listUsers() server-side and
   * filters by clientMetadata.marketing === true, since clientMetadata
   * generally isn't readable in bulk from the client SDK.
   */
  fetchSubscribers: () => Promise<Subscriber[]>;
}

export function NewsletterSubscribersTable({
  fetchSubscribers,
}: NewsletterSubscribersTableProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchSubscribers()
      .then((data) => {
        if (!cancelled) setSubscribers(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load subscribers. Try refreshing.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchSubscribers]);

  const filtered = useMemo(() => {
    if (!subscribers) return [];
    const q = query.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        s.displayName?.toLowerCase().includes(q)
    );
  }, [subscribers, query]);

  const handleExportCsv = () => {
    if (!filtered.length) return;
    const header = "Email,Name,Signed up\n";
    const rows = filtered
      .map((s) =>
        [s.email, s.displayName ?? "", new Date(s.signedUpAt).toISOString()]
          .map((field) => `"${field.replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Newsletter subscribers</h2>
          {subscribers && (
            <Badge variant="secondary" className="font-normal">
              {subscribers.length}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={!filtered.length}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by email or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Signed up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers === null &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))}

            {subscribers !== null && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {query
                    ? "No subscribers match your search."
                    : "No one has subscribed to the newsletter yet."}
                </TableCell>
              </TableRow>
            )}

            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.displayName || "—"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(s.signedUpAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}