"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { RichEditor } from "./rich-editor";
import { CoverUpload } from "./cover-upload";
import {
  X,
  Loader2,
  Save,
  Globe,
  ArrowLeft,
  AlertCircle,
  Hash,
  Tag,
  Image as ImageIcon,
  Search,
  TrendingUp,
  Eye,
  FileText,
  Layers,
  CheckCircle2,
  Circle,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface PostFormProps {
  initialData?: {
    id: string;
    title: string;
    body: string;
    slug: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    categories: string[];
    tags: string[];
    coverImage?: string;
    status?: "DRAFT" | "PUBLISHED";
  };
}

function SeoCheck({ label, done, points }: { label: string; done: boolean; points: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">+{points}</span>
    </div>
  );
}

function SerpPreview({ title, description, slug }: { title: string; description: string; slug: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://yoursite.com";
  const url = `${origin}/blog/${slug || "your-post-slug"}`;
  const displayTitle = title.length > 60 ? title.slice(0, 57) + "…" : title || "Post Title";
  const displayDesc =
    description.length > 160
      ? description.slice(0, 157) + "…"
      : description || "No meta description — add one to control what appears here in search results.";
  const breadcrumb = url.replace(/^https?:\/\//, "").split("/").join(" › ");

  return (
    <div className="rounded-lg border bg-background p-4 space-y-1">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
          G
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium leading-tight truncate">
            {origin.replace(/^https?:\/\//, "")}
          </p>
          <p className="text-xs text-muted-foreground leading-tight truncate">{breadcrumb}</p>
        </div>
      </div>
      <p className="text-[#1a0dab] dark:text-[#8ab4f8] text-lg font-normal leading-snug truncate">
        {displayTitle}
      </p>
      <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed line-clamp-2">
        {displayDesc}
      </p>
    </div>
  );
}

export function PostForm({ initialData }: PostFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const isPublished = initialData?.status === "PUBLISHED";
  const [activeTab, setActiveTab] = useState("content");

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(initialData?.coverImage ?? "");
  const [metaTitle, setMetaTitle] = useState(initialData?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initialData?.metaDescription ?? "");
  const [metaKeywords, setMetaKeywords] = useState(initialData?.metaKeywords ?? "");
  const [categories, setCategories] = useState<string[]>(initialData?.categories ?? []);
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [catInput, setCatInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(
    JSON.stringify({ title, body, metaTitle, metaDescription, metaKeywords, categories, tags })
  );

  const generateSlug = useCallback(
    (text: string) =>
      text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 100),
    []
  );

  const slugPreview = useMemo(() => {
    if (title && !isEdit) return generateSlug(title);
    return initialData?.slug || "";
  }, [title, isEdit, initialData?.slug, generateSlug]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Title is required";
    else if (title.length > 120) errors.title = "Title must be less than 120 characters";
    if (!body.trim()) errors.body = "Content is required";
    else if (body.length < 100) errors.body = "Content should be at least 100 characters";
    if (metaDescription && metaDescription.length > 160)
      errors.metaDescription = "Meta description should be less than 160 characters";
    if (metaTitle && metaTitle.length > 70)
      errors.metaTitle = "Meta title should be less than 70 characters";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [title, body, metaDescription, metaTitle]);

  const autoSave = useCallback(async () => {
    if (!isEdit || !title || !body) return;
    const currentState = JSON.stringify({ title, body, metaTitle, metaDescription, metaKeywords, categories, tags });
    if (currentState === lastSavedRef.current) return;
    const formData = new FormData();
    formData.append("title", title);
    formData.append("body", body);
    formData.append("metaTitle", metaTitle);
    formData.append("metaDescription", metaDescription);
    formData.append("metaKeywords", metaKeywords);
    formData.append("categories", JSON.stringify(categories));
    formData.append("tags", JSON.stringify(tags));
    if (coverFile) formData.append("coverImage", coverFile);
    try {
      const res = await fetch(`/api/blog/${initialData!.id}`, { method: "PATCH", body: formData });
      if (res.ok) {
        lastSavedRef.current = currentState;
        setShowSavedIndicator(true);
        setTimeout(() => setShowSavedIndicator(false), 2000);
      }
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  }, [isEdit, title, body, metaTitle, metaDescription, metaKeywords, categories, tags, coverFile, initialData]);

  useEffect(() => {
    if (!isEdit) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(autoSave, 3000);
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
  }, [title, body, metaTitle, metaDescription, metaKeywords, categories, tags, coverFile, autoSave, isEdit]);

  const addItem = useCallback((type: "cat" | "tag") => {
    if (type === "cat" && catInput.trim()) {
      setCategories((p) => [...new Set([...p, catInput.trim()])]);
      setCatInput("");
    }
    if (type === "tag" && tagInput.trim()) {
      setTags((p) => [...new Set([...p, tagInput.trim()])]);
      setTagInput("");
    }
  }, [catInput, tagInput]);

  const removeItem = useCallback((type: "cat" | "tag", value: string) => {
    if (type === "cat") setCategories((p) => p.filter((c) => c !== value));
    else setTags((p) => p.filter((t) => t !== value));
  }, []);

  const handleSave = useCallback(async (publish = false) => {
    if (!validateForm()) {
      toast.error("Please fix the errors before saving");
      const firstError = Object.keys(validationErrors)[0];
      if (firstError === "title" || firstError === "body") setActiveTab("content");
      if (firstError?.includes("meta")) setActiveTab("seo");
      return;
    }
    publish ? setPublishing(true) : setSaving(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("body", body);
    formData.append("metaTitle", metaTitle);
    formData.append("metaDescription", metaDescription);
    formData.append("metaKeywords", metaKeywords);
    formData.append("categories", JSON.stringify(categories));
    formData.append("tags", JSON.stringify(tags));
    if (coverFile) formData.append("coverImage", coverFile);
    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/blog/${initialData!.id}`, { method: publish ? "PUT" : "PATCH", body: formData });
      } else {
        res = await fetch("/api/blog", { method: "POST", body: formData });
      }
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Something went wrong");
      }
      const data = await res.json();
      if (publish) {
        toast.success("Post published!");
        router.push("/admin/blog");
      } else {
        toast.success(isEdit ? "Changes saved!" : "Draft saved!");
        if (!isEdit && data.id) router.push(`/admin/blog/${data.id}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save post");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }, [title, body, metaTitle, metaDescription, metaKeywords, categories, tags, coverFile, isEdit, initialData, router, validateForm, validationErrors]);

  const seoChecks = useMemo(() => [
    { label: "Title is 30–60 characters", done: title.length >= 30 && title.length <= 60, points: 20 },
    { label: "Meta description is 120–160 characters", done: metaDescription.length >= 120 && metaDescription.length <= 160, points: 20 },
    { label: "Keywords added", done: !!metaKeywords.trim(), points: 15 },
    { label: "Post has a category", done: categories.length > 0, points: 15 },
    { label: "Post has tags", done: tags.length > 0, points: 10 },
    { label: "Cover image uploaded", done: !!(coverFile || coverPreview), points: 10 },
    { label: "Content is 300+ characters", done: body.length > 300, points: 10 },
  ], [title, metaDescription, metaKeywords, categories, tags, coverFile, coverPreview, body]);

  const seoScore = useMemo(
    () => seoChecks.filter((c) => c.done).reduce((acc, c) => acc + c.points, 0),
    [seoChecks]
  );

  const handleCoverChange = useCallback((file: File | null) => {
    setCoverFile(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
  }, []);

  const navItems = [
    { id: "content", label: "Content", icon: FileText },
    { id: "media", label: "Media", icon: ImageIcon },
    { id: "organization", label: "Organize", icon: Layers },
    { id: "seo", label: "SEO", icon: Search },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Page header — no sticky, no fixed ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div>
              <h1 className="text-xl font-semibold">
                {isEdit ? "Edit Post" : "New Post"}
              </h1>
              {isEdit && isPublished && (
                <p className="text-xs text-muted-foreground">
                  Published · changes go live immediately
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showSavedIndicator && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving || publishing}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                  {isEdit ? "Save" : "Save draft"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save without publishing</TooltipContent>
            </Tooltip>

            {(!isEdit || !isPublished) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={() => handleSave(true)} disabled={saving || publishing}>
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Globe className="h-4 w-4 mr-1.5" />}
                    Publish
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Publish this post publicly</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ── Validation banner ── */}
        {Object.keys(validationErrors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Fix these errors before saving:</p>
              <ul className="list-disc list-inside space-y-0.5 text-sm">
                {Object.values(validationErrors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full">
            {navItems.map(({ id, label, icon: Icon }) => {
              const hasError =
                id === "content"
                  ? !!(validationErrors.title || validationErrors.body)
                  : id === "seo"
                  ? !!(validationErrors.metaTitle || validationErrors.metaDescription)
                  : false;
              return (
                <TabsTrigger key={id} value={id} className="gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {hasError && <AlertCircle className="h-3 w-3 text-destructive" />}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* ── CONTENT ── */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Title</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  placeholder="Enter an engaging title…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                  className={cn(validationErrors.title && "border-destructive")}
                  autoFocus
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{title.length}/120</span>
                  {slugPreview && (
                    <span className="font-mono bg-muted rounded px-1.5 py-0.5 truncate max-w-[260px]">
                      /blog/{slugPreview}
                    </span>
                  )}
                </div>
                {validationErrors.title && (
                  <p className="text-xs text-destructive">{validationErrors.title}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
                <CardDescription>Write your post content below</CardDescription>
              </CardHeader>
              <CardContent>
                <RichEditor value={body} onChange={setBody} />
                {validationErrors.body && (
                  <p className="text-xs text-destructive mt-2">{validationErrors.body}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MEDIA ── */}
          <TabsContent value="media">
            <div className="max-w-xl">
              <Card>
                <CardHeader>
                  <CardTitle>Cover Image</CardTitle>
                  <CardDescription>
                    Shown at the top of your post and in link previews
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CoverUpload value={coverFile} onChange={handleCoverChange} />
                  {coverPreview && !coverFile && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Current image</p>
                      <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverPreview} alt="Current cover" className="h-full w-full object-cover" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── ORGANIZATION ── */}
          <TabsContent value="organization">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-4 w-4" /> Categories
                  </CardTitle>
                  <CardDescription>Group your post by topic</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add category…"
                      value={catInput}
                      onChange={(e) => setCatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem("cat"))}
                    />
                    <Button type="button" variant="outline" onClick={() => addItem("cat")}>Add</Button>
                  </div>
                  <div className="min-h-20 flex flex-wrap gap-1.5 rounded-md border bg-muted/40 p-3">
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground m-auto">No categories yet</p>
                    ) : (
                      categories.map((c) => (
                        <Badge key={c} variant="secondary" className="gap-1 pr-1.5">
                          {c}
                          <button onClick={() => removeItem("cat", c)} className="rounded hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Tags
                  </CardTitle>
                  <CardDescription>Help readers find related content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag…"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem("tag"))}
                    />
                    <Button type="button" variant="outline" onClick={() => addItem("tag")}>Add</Button>
                  </div>
                  <div className="min-h-20 flex flex-wrap gap-1.5 rounded-md border bg-muted/40 p-3">
                    {tags.length === 0 ? (
                      <p className="text-xs text-muted-foreground m-auto">No tags yet</p>
                    ) : (
                      tags.map((t) => (
                        <Badge key={t} variant="outline" className="gap-1 pr-1.5">
                          {t}
                          <button onClick={() => removeItem("tag", t)} className="rounded hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SEO ── */}
          <TabsContent value="seo">
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Fields */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-4 w-4" /> Search Engine Settings
                    </CardTitle>
                    <CardDescription>
                      Control how your post appears in search results
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="metaTitle">Meta title</Label>
                        <span className={cn("text-xs", metaTitle.length > 60 ? "text-amber-500" : "text-muted-foreground")}>
                          {metaTitle.length}/70
                        </span>
                      </div>
                      <Input
                        id="metaTitle"
                        placeholder="Defaults to post title if left empty"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value.slice(0, 70))}
                        className={validationErrors.metaTitle ? "border-destructive" : ""}
                      />
                      <Progress value={(metaTitle.length / 70) * 100} className="h-1" />
                      {validationErrors.metaTitle && (
                        <p className="text-xs text-destructive">{validationErrors.metaTitle}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Ideal: 30–60 characters</p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="metaDesc">Meta description</Label>
                        <span className={cn("text-xs", metaDescription.length > 155 ? "text-amber-500" : "text-muted-foreground")}>
                          {metaDescription.length}/160
                        </span>
                      </div>
                      <Textarea
                        id="metaDesc"
                        placeholder="Summarise your post in 1–2 sentences…"
                        rows={3}
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value.slice(0, 160))}
                        className={validationErrors.metaDescription ? "border-destructive" : ""}
                      />
                      <Progress value={(metaDescription.length / 160) * 100} className="h-1" />
                      {validationErrors.metaDescription && (
                        <p className="text-xs text-destructive">{validationErrors.metaDescription}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Ideal: 120–160 characters</p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="keywords">Focus keywords</Label>
                      <Input
                        id="keywords"
                        placeholder="e.g. next.js, react, tutorial"
                        value={metaKeywords}
                        onChange={(e) => setMetaKeywords(e.target.value.slice(0, 200))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Comma-separated. Used in{" "}
                        <code className="bg-muted rounded px-1 text-xs">&lt;meta name="keywords"&gt;</code>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Score + Preview */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> SEO Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-end gap-2">
                      <span className={cn(
                        "text-4xl font-bold tabular-nums",
                        seoScore >= 70 ? "text-green-600 dark:text-green-400"
                          : seoScore >= 40 ? "text-amber-500"
                          : "text-muted-foreground"
                      )}>
                        {seoScore}
                      </span>
                      <span className="text-muted-foreground text-sm mb-1.5">/100</span>
                    </div>
                    <Progress value={seoScore} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {seoScore >= 70
                        ? "Great — your post is well optimised."
                        : seoScore >= 40
                        ? "Getting there — a few more tweaks will help."
                        : "Complete the checklist to improve your score."}
                    </p>
                    <Separator />
                    <div className="space-y-2">
                      {seoChecks.map((c) => <SeoCheck key={c.label} {...c} />)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Search Result Preview
                    </CardTitle>
                    <CardDescription>How your post may appear on Google</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SerpPreview
                      title={metaTitle || title}
                      description={metaDescription}
                      slug={slugPreview}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}