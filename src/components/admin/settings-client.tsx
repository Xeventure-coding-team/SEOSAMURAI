"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, TriangleAlert, Sparkles, Settings as SettingsIcon } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AIProvidersSection from "../ai/AIProvidersSection";

interface SiteSettings {
  maintenanceMode: boolean;
  maintenanceBanner: string | null;
  registrationOpen: boolean;
  siteName: string | null;
  supportEmail: string | null;
}

const DEFAULTS: SiteSettings = {
  maintenanceMode: false,
  maintenanceBanner: null,
  registrationOpen: true,
  siteName: null,
  supportEmail: null,
};

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 py-4">
      <div className="space-y-0.5 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        {title}
      </p>
      <Separator className="mb-1" />
      <div className="divide-y">{children}</div>
    </div>
  );
}

export default function SettingsClient() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => toast.error("Couldn't load settings."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const promise = fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }).then((r) => {
      if (!r.ok) throw new Error();
    });

    toast.promise(promise, {
      loading: "Saving…",
      success: "Settings saved.",
      error: "Couldn't save settings.",
    });

    try {
      await promise;
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading settings…
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

      {/* Maintenance warning banner - shown globally */}
      {settings.maintenanceMode && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 mb-6">
          <TriangleAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Maintenance mode is active. Your site is not accessible to users.
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            General Settings
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Providers
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Settings */}
        <TabsContent value="general" className="space-y-8">
          <Section title="General">
            <SettingRow label="Site name" description="Shown in emails and the browser tab.">
              <Input
                value={settings.siteName ?? ""}
                onChange={(e) => set("siteName", e.target.value)}
                placeholder="My App"
                className="w-52 h-8 text-sm"
              />
            </SettingRow>

            <SettingRow label="Support email" description="Where users reach you for help.">
              <Input
                type="email"
                value={settings.supportEmail ?? ""}
                onChange={(e) => set("supportEmail", e.target.value)}
                placeholder="support@example.com"
                className="w-52 h-8 text-sm"
              />
            </SettingRow>
          </Section>

          <Section title="Access">
            <SettingRow
              label="Open registration"
              description="Allow new users to sign up."
            >
              <Switch
                checked={settings.registrationOpen}
                onCheckedChange={(v) => set("registrationOpen", v)}
              />
            </SettingRow>
          </Section>

          <Section title="Maintenance">
            <SettingRow
              label="Maintenance mode"
              description="Takes the site offline for all non-admin users."
            >
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(v) => set("maintenanceMode", v)}
              />
            </SettingRow>

            <SettingRow
              label="Banner message"
              description="Shown on the maintenance page."
            >
              <Input
                value={settings.maintenanceBanner ?? ""}
                onChange={(e) => set("maintenanceBanner", e.target.value)}
                placeholder="Back soon…"
                disabled={!settings.maintenanceMode}
                className="w-52 h-8 text-sm"
              />
            </SettingRow>
          </Section>

          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save changes
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: AI Providers */}
        <TabsContent value="ai">
          <AIProvidersSection />
        </TabsContent>
      </Tabs>
    </>
  );
}