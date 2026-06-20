"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusIcon,
  Pencil,
  Trash2,
  Globe,
  Loader2,
  FileText,
  Eye,
  Copy,
  Check,
  Search,
  Calendar,
  Clock,
  X,
  RefreshCw,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";

interface Post {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  coverImage: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Not set";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Invalid date";
  }
};

const getTimeAgo = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateString);
  } catch {
    return "Invalid date";
  }
};

function PostSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-16 w-24 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  );
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishId, setPublishId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "PUBLISHED" | "DRAFT">("all");

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blog/all");
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      const sanitized = data.map((post: any) => ({
        ...post,
        createdAt: post.createdAt || new Date().toISOString(),
        updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
        publishedAt: post.publishedAt || null,
      }));
      setPosts(sanitized);
      setFilteredPosts(sanitized);
    } catch {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  useEffect(() => {
    let filtered = posts;
    if (statusFilter !== "all") filtered = filtered.filter((p) => p.status === statusFilter);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.slug.toLowerCase().includes(term) ||
          p.metaDescription?.toLowerCase().includes(term)
      );
    }
    setFilteredPosts(filtered);
  }, [searchTerm, posts, statusFilter]);

  const handlePublish = async () => {
    if (!publishId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/blog/${publishId}`, { method: "PUT" });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setPosts((p) => p.map((post) => (post.id === publishId ? { ...post, ...updated, status: "PUBLISHED" } : post)));
      toast.success("Post published!");
    } catch {
      toast.error("Failed to publish post.");
    } finally {
      setActionLoading(false);
      setPublishId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/blog/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPosts((p) => p.filter((post) => post.id !== deleteId));
      toast.success("Post deleted.");
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setActionLoading(false);
      setDeleteId(null);
    }
  };

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/blog/${slug}`);
    setCopiedSlug(slug);
    toast.success("Link copied!");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;
  const draftCount = posts.filter((p) => p.status === "DRAFT").length;

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <TabsList className="h-10">
              <TabsTrigger value="all" className="gap-2">
                <span>All</span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {posts.length}
                </span>
              </TabsTrigger>

              <TabsTrigger value="PUBLISHED" className="gap-2">
                <span>Published</span>
                <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600">
                  {publishedCount}
                </span>
              </TabsTrigger>

              <TabsTrigger value="DRAFT" className="gap-2">
                <span>Drafts</span>
                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600">
                  {draftCount}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Right: search + actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search posts…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchPosts} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>

            <Link href="/admin/blog/new">
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </Link>
          </div>
        </div>

        {/* List */}
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No posts found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "No posts match your current filters. Try adjusting your search criteria."
                  : "Create your first blog post to get started with content management."}
              </p>
              {(searchTerm || statusFilter !== "all") ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                  className="gap-2"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all filters
                </Button>
              ) : (
                <Link href="/admin/blog/new">
                  <Button size="sm" className="gap-2 shadow-sm">
                    <PlusIcon className="h-4 w-4" />
                    New post
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="group relative flex items-center gap-5 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  {/* Thumbnail */}
                  <div className="relative h-16 w-24 rounded-md overflow-hidden shrink-0 bg-muted border border-border/50 shadow-sm">
                    {post.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                        <FileText className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="font-medium text-sm text-foreground truncate">{post.title}</h4>
                      <Badge
                        variant={post.status === "PUBLISHED" ? "default" : "secondary"}
                        className="text-[10px] px-2 py-0 h-5 font-medium uppercase tracking-wide"
                      >
                        {post.status === "PUBLISHED" ? "Published" : "Draft"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {/* Slug with copy */}
                      <div className="flex items-center gap-1.5 font-mono text-[11px] bg-muted/30 px-1.5 py-0.5 rounded">
                        <span className="truncate max-w-[180px]">/blog/{post.slug}</span>
                        <button
                          onClick={() => copyLink(post.slug)}
                          className="hover:text-foreground transition-colors p-0.5 rounded hover:bg-background"
                          aria-label="Copy link"
                        >
                          {copiedSlug === post.slug
                            ? <Check className="h-3 w-3 text-emerald-500" />
                            : <Copy className="h-3 w-3" />}
                        </button>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {post.status === "PUBLISHED" && post.publishedAt
                            ? formatDate(post.publishedAt)
                            : `Created ${formatDate(post.createdAt)}`}
                        </span>
                      </div>

                      {/* Time ago */}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {post.status === "PUBLISHED" && post.publishedAt
                            ? getTimeAgo(post.publishedAt)
                            : getTimeAgo(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-52">
                        {post.status === "PUBLISHED" && (
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View post
                            </Link>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/blog/${post.id}`}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit post
                          </Link>
                        </DropdownMenuItem>

                        {post.status === "DRAFT" && (
                          <DropdownMenuItem
                            onClick={() => setPublishId(post.id)}
                            className="cursor-pointer"
                          >
                            <Globe className="mr-2 h-4 w-4 text-emerald-600" />
                            Publish
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => setDeleteId(post.id)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Publish Dialog */}
        <Dialog open={!!publishId} onOpenChange={() => !actionLoading && setPublishId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish this post?</DialogTitle>
              <DialogDescription>
                This post will be publicly visible on your blog. You can still edit it after publishing.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPublishId(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={actionLoading}>
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={!!deleteId} onOpenChange={() => !actionLoading && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this post?</DialogTitle>
              <DialogDescription>
                This cannot be undone. The post and its cover image will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}