"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, KeyRound, Trash2, Plus, X, AlertTriangle, CheckCircle, Circle } from "lucide-react";
import toast from "react-hot-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const PROVIDERS = [
  { id: "openai", label: "OpenAI (GPT)" },
  { id: "gemini", label: "Google Gemini" },
  { id: "claude", label: "Anthropic Claude" },
  { id: "deepseek", label: "DeepSeek" },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

interface ProviderConfig {
  id: string;
  provider: ProviderId;
  model: string | null;
  enabled: boolean;
  isActive: boolean;
  maskedKey: string | null;
}

export default function AIProvidersSection() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const [addingProvider, setAddingProvider] = useState<ProviderId | "">("");
  const [addKey, setAddKey] = useState("");
  const [addModel, setAddModel] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editModel, setEditModel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = () => {
    fetch("/api/admin/ai-providers")
      .then((r) => r.json())
      .then(setConfigs)
      .catch(() => toast.error("Couldn't load AI providers."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const configuredIds = new Set(configs.map((c) => c.provider));
  const availableToAdd = PROVIDERS.filter((p) => !configuredIds.has(p.id));

  const handleAdd = async () => {
    if (!addingProvider || !addKey) {
      toast.error("Pick a provider and enter an API key.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/ai-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: addingProvider, apiKey: addKey, model: addModel || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Provider added.");
      setAddingProvider("");
      setAddKey("");
      setAddModel("");
      load();
    } catch {
      toast.error("Couldn't add provider.");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (c: ProviderConfig) => {
    setEditingId(c.id);
    setEditKey("");
    setEditModel(c.model ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditKey("");
    setEditModel("");
  };

  const handleSaveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/ai-providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: editModel || null, apiKey: editKey || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Provider updated.");
      cancelEdit();
      load();
    } catch {
      toast.error("Couldn't update provider.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleEnabled = async (c: ProviderConfig, enabled: boolean) => {
    setConfigs((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, enabled, isActive: enabled ? x.isActive : false } : x
      )
    );
    const res = await fetch(`/api/admin/ai-providers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      toast.error("Couldn't update provider.");
      load(); // resync on failure
    } else if (!enabled && c.isActive) {
      toast("This was your primary model — no provider is active now.", { icon: "⚠️" });
    }
  };

  const handleRemove = async (c: ProviderConfig) => {
    if (!confirm(`Remove the ${c.provider} configuration? This deletes its stored API key.`)) return;
    const promise = fetch(`/api/admin/ai-providers/${c.id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error();
    });
    toast.promise(promise, {
      loading: "Removing…",
      success: "Provider removed.",
      error: "Couldn't remove provider.",
    });
    await promise;
    load();
  };

  const handleActivate = async (provider: ProviderId) => {
    const promise = fetch("/api/admin/ai-providers/activate", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    }).then((r) => {
      if (!r.ok) throw new Error();
    });

    toast.promise(promise, {
      loading: "Switching primary model…",
      success: `${provider} is now the primary model.`,
      error: "Couldn't switch provider.",
    });

    await promise;
    load(); // refetch — isActive now reflects the new state for all rows
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading providers…
      </div>
    );
  }

  const noneActive = configs.some((c) => c.enabled) && !configs.some((c) => c.isActive);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div>
          <div className="mb-3 space-y-1">
            <p className="text-md font-semibold uppercase tracking-widest text-muted-foreground">
              AI Providers
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose the AI services that power smart reply generation, review responses, and content enhancement. Manage provider settings to optimize quality, <br /> performance, and automation.
            </p>
          </div>
          <Separator className="mb-3" />

          {configs.length === 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              No providers configured yet. Add one below.
            </p>
          )}

          {noneActive && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 mb-3">
              <AlertTriangle className="h-3.5 w-3.5" />
              No primary AI model is set. Comment replies and post enhancement won't work until you activate one below.
            </div>
          )}

          {/* TWO COLUMN LAYOUT - Providers list on left, Add form on right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* LEFT COLUMN - Provider Cards (takes 2/3 of the space) */}
            <div className="lg:col-span-2 space-y-3">
              {configs.map((c) => {
                const meta = PROVIDERS.find((p) => p.id === c.provider);
                const isEditing = editingId === c.id;
                return (
                  <div key={c.id} className="rounded-lg border px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-border"}`}
                        />
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                          {meta?.label ?? c.provider}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Active/Inactive Toggle Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={c.isActive ? "default" : "outline"}
                              size="sm"
                              className={`h-7 text-xs ${c.isActive
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "hover:bg-muted"
                                }`}
                              onClick={() => handleActivate(c.provider)}
                              disabled={!c.enabled}
                            >
                              {c.isActive ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Circle className="h-3 w-3 mr-1" />
                                  Inactive
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {!c.enabled
                              ? "Enable this provider before setting it as primary"
                              : c.isActive
                                ? "This is the primary model currently used for comment replies and post enhancement"
                                : `Set ${meta?.label ?? c.provider} as the primary model`}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Switch
                                checked={c.enabled}
                                onCheckedChange={(v) => handleToggleEnabled(c, v)}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {c.enabled
                              ? "Disable this provider"
                              : "Enable this provider so it can be used or set as primary"}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleRemove(c)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Remove this provider and delete its stored API key
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {!isEditing ? (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">
                              Model: {c.model || "default"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            {c.model
                              ? `Requests to ${meta?.label ?? c.provider} use the "${c.model}" model`
                              : "No specific model set — the provider's default will be used"}
                          </TooltipContent>
                        </Tooltip>
                        <span className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">Key: {c.maskedKey}</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              Only the last 4 characters are shown — the full key is encrypted at rest
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => startEdit(c)}
                                className="text-primary hover:underline"
                              >
                                Edit
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              Update the model or replace the API key
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 rounded-md bg-muted/40 p-3">
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Model</p>
                            <Input
                              value={editModel}
                              onChange={(e) => setEditModel(e.target.value)}
                              placeholder="e.g. gpt-4o"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">New API key (optional)</p>
                            <Input
                              type="password"
                              value={editKey}
                              onChange={(e) => setEditKey(e.target.value)}
                              placeholder="Leave blank to keep current key"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                <X className="h-3.5 w-3.5 mr-1" /> Cancel
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Discard these changes</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" disabled={savingEdit} onClick={() => handleSaveEdit(c.id)}>
                                {savingEdit && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                                Save
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Save changes — leave the key field blank to keep the existing key
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* RIGHT COLUMN - Add Provider Form (takes 1/3 of the space) */}
            <div className="lg:col-span-1">
              {availableToAdd.length > 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-4 space-y-4 sticky top-4">
                  <div>
                    <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" /> Add a provider
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Configure a new AI provider
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <select
                            value={addingProvider}
                            onChange={(e) => setAddingProvider(e.target.value as ProviderId)}
                            className="w-full h-8 text-sm rounded-md border bg-background px-2"
                          >
                            <option value="">Select provider…</option>
                            {availableToAdd.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Only providers without an existing configuration are listed
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Model (optional)</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            value={addModel}
                            onChange={(e) => setAddModel(e.target.value)}
                            placeholder="e.g. gpt-4o"
                            className="h-8 text-sm"
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          e.g. "gpt-4o", "gemini-1.5-pro", "claude-sonnet-4-6" — leave blank to use the provider default
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">API key</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            type="password"
                            value={addKey}
                            onChange={(e) => setAddKey(e.target.value)}
                            placeholder="Enter API key"
                            className="h-8 text-sm"
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Stored encrypted (AES-256-GCM) — never saved or displayed in plain text
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleAdd}
                      disabled={adding}
                      className="w-full"
                    >
                      {adding && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Add provider
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">All providers configured</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All available AI providers have been added
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}