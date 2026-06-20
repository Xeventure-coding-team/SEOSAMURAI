"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Pencil, Trash2, X, GitCommitHorizontal, Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface ChangeLog {
  id: string;
  title: string;
  version: string;
  body: string;
  type?: string;
  releaseDate: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  added:    { label: "Added",    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  fixed:    { label: "Fixed",    className: "bg-red-500/10 text-red-600 border-red-500/20" },
  changed:  { label: "Changed",  className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  removed:  { label: "Removed",  className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  security: { label: "Security", className: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
};

const EMPTY_FORM = {
  title: "",
  version: "",
  body: "",
  type: "none",
  releaseDate: new Date().toISOString().split("T")[0],
};

export default function ChangeLogPage() {
  const [changelogs, setChangelogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchChangelogs = async () => {
    try {
      const res = await fetch("/api/admin/changelog");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setChangelogs(data);
    } catch {
      toast.error("Couldn't load changelog entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChangelogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const submitData = {
      ...formData,
      type: formData.type === "none" ? null : formData.type,
    };

    const isEditing = !!editingId;
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `/api/admin/changelog/${editingId}`
      : "/api/admin/changelog";

    const promise = fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submitData),
    }).then(async (res) => {
      if (!res.ok) throw new Error("Request failed");
      resetForm();
      await fetchChangelogs();
    });

    toast.promise(promise, {
      loading: isEditing ? "Saving changes…" : "Creating entry…",
      success: isEditing ? "Entry updated." : "Entry created.",
      error: isEditing ? "Couldn't update entry." : "Couldn't create entry.",
    });

    try {
      await promise;
    } catch {
      // handled by toast.promise
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this changelog entry? This can't be undone.")) return;

    setDeletingId(id);

    // Optimistic removal
    const previous = changelogs;
    setChangelogs((prev) => prev.filter((c) => c.id !== id));

    const promise = fetch(`/api/admin/changelog/${id}`, { method: "DELETE" }).then(
      async (res) => {
        if (!res.ok) throw new Error();
        await fetchChangelogs();
      }
    );

    toast.promise(promise, {
      loading: "Deleting…",
      success: "Entry deleted.",
      error: "Couldn't delete entry.",
    });

    try {
      await promise;
    } catch {
      setChangelogs(previous); // rollback
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (changelog: ChangeLog) => {
    setEditingId(changelog.id);
    setFormData({
      title: changelog.title,
      version: changelog.version,
      body: changelog.body,
      type: changelog.type || "none",
      releaseDate: changelog.releaseDate.split("T")[0],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("Editing entry — make your changes below.", { icon: "✏️" });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading entries…
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: "13px",
            borderRadius: "8px",
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          },
        }}
      />

      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── Left: Form ── */}
          <div className="lg:sticky lg:top-6">
            <Card className={editingId ? "ring-2 ring-primary/30" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                      {editingId ? "Editing entry" : "New entry"}
                    </p>
                    <CardTitle className="text-base">
                      {editingId ? "Update changelog" : "Create changelog"}
                    </CardTitle>
                  </div>
                  {editingId && (
                    <Button variant="ghost" size="sm" onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4 mr-1.5" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs font-medium">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Initial Release"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="version" className="text-xs font-medium">Version</Label>
                      <Input
                        id="version"
                        value={formData.version}
                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                        placeholder="v1.0.0"
                        className="font-mono text-sm"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="releaseDate" className="text-xs font-medium">Release date</Label>
                      <Input
                        id="releaseDate"
                        type="date"
                        value={formData.releaseDate}
                        onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="type" className="text-xs font-medium">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None</SelectItem>
                        <SelectItem value="added">Added</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="changed">Changed</SelectItem>
                        <SelectItem value="removed">Removed</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="body" className="text-xs font-medium">Content</Label>
                    <Textarea
                      id="body"
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      placeholder="Describe what changed in this release…"
                      rows={5}
                      required
                      disabled={submitting}
                      className="resize-none text-sm"
                    />
                  </div>
                </CardContent>

                <CardFooter className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingId ? "Saving…" : "Creating…"}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {editingId ? "Save changes" : "Create entry"}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* ── Right: List ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                {changelogs.length === 0
                  ? "No entries"
                  : `${changelogs.length} entr${changelogs.length === 1 ? "y" : "ies"}`}
              </h2>
            </div>

            <div className="space-y-3">
              {changelogs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                    <GitCommitHorizontal className="h-8 w-8 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No entries yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Create your first changelog entry using the form.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                changelogs.map((log) => {
                  const typeConfig = log.type && log.type !== "none" ? TYPE_CONFIG[log.type] : null;
                  const isDeleting = deletingId === log.id;
                  const isEditing = editingId === log.id;

                  return (
                    <Card
                      key={log.id}
                      className={[
                        "transition-all duration-150",
                        isEditing ? "ring-2 ring-primary/30 shadow-sm" : "hover:shadow-sm",
                        isDeleting ? "opacity-40 pointer-events-none" : "",
                      ].join(" ")}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <p className="font-medium text-sm leading-tight truncate">
                              {log.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border text-muted-foreground">
                                {log.version}
                              </span>
                              {typeConfig && (
                                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${typeConfig.className}`}>
                                  {typeConfig.label}
                                </span>
                              )}
                              <span className="flex items-center text-xs text-muted-foreground/60 gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {new Date(log.releaseDate).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(log)}
                              className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(log.id)}
                              disabled={isDeleting}
                              className="h-7 px-2 text-muted-foreground hover:text-destructive"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 pb-4">
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed">
                          {log.body}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}