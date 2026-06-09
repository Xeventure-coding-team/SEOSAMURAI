"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  ArrowDownLeft,
  Repeat2,
  Package,
  Banknote,
  Activity,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BalanceAmount { amount: number; currency: string }
interface Customer { id: string; name: string | null; email: string | null; currency: string | null; created: number }
interface Charge { id: string; amount: number; currency: string; status: string; description: string | null; customerEmail: string | null; created: number; refunded: boolean }
interface Subscription { id: string; status: string; customerId: string; currentPeriodEnd: number; cancelAtPeriodEnd: boolean; items: { priceId: string; amount: number | null; currency: string; interval: string | undefined }[] }
interface Invoice { id: string; status: string | null; amountDue: number; amountPaid: number; currency: string; customerEmail: string | null; dueDate: number | null; created: number; hostedInvoiceUrl: string | null }
interface Product { id: string; name: string; description: string | null; active: boolean; created: number }
interface Payout { id: string; amount: number; currency: string; status: string; arrivalDate: number; method: string; created: number }
interface Dispute { id: string; amount: number; currency: string; status: string; reason: string; chargeId: string; created: number; dueBy: number | null }
interface Refund { id: string; amount: number; currency: string; status: string | null; reason: string | null; created: number }
interface BalanceTransaction { id: string; amount: number; fee: number; net: number; currency: string; type: string; status: string; description: string | null; created: number }

interface DashboardData {
  ok: boolean;
  fetchedAt: string;
  stats: { totalCustomers: number; activeSubscriptions: number; openDisputes: number; totalRefunded: number; recentRevenue: number; mrr: number };
  balance: { available: BalanceAmount[]; pending: BalanceAmount[] };
  customers: Customer[];
  charges: Charge[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  products: Product[];
  payouts: Payout[];
  disputes: Dispute[];
  refunds: Refund[];
  balanceTransactions: BalanceTransaction[];
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (amount: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2 }).format(amount / 100);

const fmtBalances = (entries: BalanceAmount[]) =>
  entries.length === 0 ? "—" : entries.map((b) => fmt(b.amount, b.currency)).join(" · ");

const sumByCurrency = (items: { amount: number; currency: string }[]): Record<string, number> =>
  items.reduce<Record<string, number>>((acc, { amount, currency }) => {
    acc[currency] = (acc[currency] ?? 0) + amount;
    return acc;
  }, {});

const fmtDate = (unix: number) => {
  if (!unix || unix <= 0) return "—";
  return new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ─── Export Helpers ──────────────────────────────────────────────────────────

const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header]?.toString() || '';
      return `"${value.replace(/"/g, '""')}"`;
    }).join(','))
  ];
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToExcel = (data: any[], filename: string) => {
  if (!data.length) return;
  
  // Create HTML table for Excel
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      let value = row[header]?.toString() || '';
      // Remove HTML tags and clean for Excel
      value = value.replace(/<[^>]*>/g, '');
      return value;
    })
  );
  
  const htmlContent = `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${filename}</title>
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusTone = "green" | "amber" | "blue" | "red" | "muted";

const statusTone = (status: string): StatusTone => {
  const tones: Record<string, StatusTone> = {
    succeeded: "green", active: "green", paid: "green", won: "green",
    pending: "amber", in_transit: "amber", under_review: "amber",
    open: "blue", trialing: "blue",
    failed: "red", needs_response: "red", lost: "red",
    canceled: "muted", refunded: "muted", unknown: "muted", inactive: "muted",
  };
  return tones[status] ?? "muted";
};

const toneClasses: Record<StatusTone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  blue:  "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30",
  red:   "bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30",
  muted: "bg-muted text-muted-foreground ring-1 ring-border",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap capitalize ${toneClasses[statusTone(status)]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <Card className="group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent>
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>

          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              accent
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xl font-semibold tracking-tight leading-none">
            {value}
          </div>

          {sub && (
            <p className="text-xs text-muted-foreground truncate">
              {sub}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SectionSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="space-y-px">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-border/50">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <CheckCircle2 className="w-7 h-7 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Multi-currency value ─────────────────────────────────────────────────────

function MultiCurrencyValue({ map }: { map: Record<string, number> }) {
  const entries = Object.entries(map);
  if (entries.length === 0) return <span className="text-muted-foreground text-sm font-sans font-normal">—</span>;
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      {entries.map(([cur, amt]) => <span key={cur}>{fmt(amt, cur)}</span>)}
    </div>
  );
}

// ─── Shared table styles ──────────────────────────────────────────────────────

const TH = "h-10 px-4 text-xs font-semibold text-foreground bg-muted/50 whitespace-nowrap";
const TD = "px-4 py-3 text-sm";

// ─── Main component ───────────────────────────────────────────────────────────

export default function StripeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("charges");

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/stripe/dashboard");
      const json: DashboardData = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Unknown error");
      setData(json);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const revenueMap = data
    ? sumByCurrency(data.charges.filter((c) => c.status === "succeeded").map((c) => ({ amount: c.amount, currency: c.currency })))
    : {};

  const mrrMap = data
    ? sumByCurrency(
        data.subscriptions.filter((s) => s.status === "active").flatMap((s) =>
          s.items.filter((item) => item.amount != null).map((item) => {
            const monthly = item.interval === "year" ? item.amount! / 12 : item.interval === "week" ? item.amount! * 4 : item.amount!;
            return { amount: Math.round(monthly), currency: item.currency };
          })
        )
      )
    : {};

  // Export handlers for each tab
  const handleExportCSV = () => {
    if (!data) return;
    
    let exportData: any[] = [];
    let filename = `stripe_${activeTab}`;
    
    switch(activeTab) {
      case "charges":
        exportData = data.charges.map(c => ({
          ID: c.id,
          Customer: c.customerEmail || "—",
          Description: c.description || "—",
          Amount: fmt(c.amount, c.currency),
          Currency: c.currency.toUpperCase(),
          Status: c.refunded ? "refunded" : c.status,
          Date: fmtDate(c.created)
        }));
        break;
      case "subscriptions":
        exportData = data.subscriptions.map(s => ({
          ID: s.id,
          Amount: s.items[0]?.amount ? fmt(s.items[0].amount, s.items[0].currency) : "—",
          Currency: s.items[0]?.currency?.toUpperCase() || "—",
          Interval: s.items[0]?.interval || "—",
          Status: s.cancelAtPeriodEnd ? "canceled" : s.status,
          RenewalDate: s.currentPeriodEnd > 0 ? fmtDate(s.currentPeriodEnd) : "—"
        }));
        break;
      case "invoices":
        exportData = data.invoices.map(inv => ({
          ID: inv.id,
          Customer: inv.customerEmail || "—",
          AmountDue: fmt(inv.amountDue, inv.currency),
          AmountPaid: fmt(inv.amountPaid, inv.currency),
          Currency: inv.currency.toUpperCase(),
          Status: inv.status || "unknown",
          Date: fmtDate(inv.created)
        }));
        break;
      case "customers":
        exportData = data.customers.map(c => ({
          ID: c.id,
          Name: c.name || "—",
          Email: c.email || "—",
          Currency: c.currency || "—",
          Created: fmtDate(c.created)
        }));
        break;
      case "products":
        exportData = data.products.map(p => ({
          ID: p.id,
          Name: p.name,
          Description: p.description || "—",
          Status: p.active ? "active" : "inactive",
          Created: fmtDate(p.created)
        }));
        break;
      case "payouts":
        exportData = data.payouts.map(p => ({
          ID: p.id,
          Amount: fmt(p.amount, p.currency),
          Currency: p.currency.toUpperCase(),
          Method: p.method,
          Status: p.status,
          ArrivalDate: fmtDate(p.arrivalDate)
        }));
        break;
      case "disputes":
        exportData = data.disputes.map(d => ({
          ID: d.id,
          Amount: fmt(d.amount, d.currency),
          Currency: d.currency.toUpperCase(),
          Reason: d.reason.replace(/_/g, " "),
          Status: d.status,
          DueBy: d.dueBy ? fmtDate(d.dueBy) : "—"
        }));
        break;
      case "refunds":
        exportData = data.refunds.map(r => ({
          ID: r.id,
          Amount: fmt(r.amount, r.currency),
          Currency: r.currency.toUpperCase(),
          Reason: r.reason?.replace(/_/g, " ") || "—",
          Status: r.status || "unknown",
          Date: fmtDate(r.created)
        }));
        break;
      case "transactions":
        exportData = data.balanceTransactions.map(bt => ({
          ID: bt.id,
          Type: bt.type.replace(/_/g, " "),
          Gross: fmt(bt.amount, bt.currency),
          Fee: fmt(bt.fee, bt.currency),
          Net: fmt(bt.net, bt.currency),
          Currency: bt.currency.toUpperCase(),
          Status: bt.status,
          Date: fmtDate(bt.created)
        }));
        break;
    }
    
    exportToCSV(exportData, filename);
  };
  
  const handleExportExcel = () => {
    if (!data) return;
    
    let exportData: any[] = [];
    let filename = `stripe_${activeTab}`;
    
    switch(activeTab) {
      case "charges":
        exportData = data.charges.map(c => ({
          ID: c.id,
          Customer: c.customerEmail || "—",
          Description: c.description || "—",
          Amount: fmt(c.amount, c.currency),
          Currency: c.currency.toUpperCase(),
          Status: c.refunded ? "refunded" : c.status,
          Date: fmtDate(c.created)
        }));
        break;
      case "subscriptions":
        exportData = data.subscriptions.map(s => ({
          ID: s.id,
          Amount: s.items[0]?.amount ? fmt(s.items[0].amount, s.items[0].currency) : "—",
          Currency: s.items[0]?.currency?.toUpperCase() || "—",
          Interval: s.items[0]?.interval || "—",
          Status: s.cancelAtPeriodEnd ? "canceled" : s.status,
          RenewalDate: s.currentPeriodEnd > 0 ? fmtDate(s.currentPeriodEnd) : "—"
        }));
        break;
      case "invoices":
        exportData = data.invoices.map(inv => ({
          ID: inv.id,
          Customer: inv.customerEmail || "—",
          AmountDue: fmt(inv.amountDue, inv.currency),
          AmountPaid: fmt(inv.amountPaid, inv.currency),
          Currency: inv.currency.toUpperCase(),
          Status: inv.status || "unknown",
          Date: fmtDate(inv.created)
        }));
        break;
      case "customers":
        exportData = data.customers.map(c => ({
          ID: c.id,
          Name: c.name || "—",
          Email: c.email || "—",
          Currency: c.currency || "—",
          Created: fmtDate(c.created)
        }));
        break;
      case "products":
        exportData = data.products.map(p => ({
          ID: p.id,
          Name: p.name,
          Description: p.description || "—",
          Status: p.active ? "active" : "inactive",
          Created: fmtDate(p.created)
        }));
        break;
      case "payouts":
        exportData = data.payouts.map(p => ({
          ID: p.id,
          Amount: fmt(p.amount, p.currency),
          Currency: p.currency.toUpperCase(),
          Method: p.method,
          Status: p.status,
          ArrivalDate: fmtDate(p.arrivalDate)
        }));
        break;
      case "disputes":
        exportData = data.disputes.map(d => ({
          ID: d.id,
          Amount: fmt(d.amount, d.currency),
          Currency: d.currency.toUpperCase(),
          Reason: d.reason.replace(/_/g, " "),
          Status: d.status,
          DueBy: d.dueBy ? fmtDate(d.dueBy) : "—"
        }));
        break;
      case "refunds":
        exportData = data.refunds.map(r => ({
          ID: r.id,
          Amount: fmt(r.amount, r.currency),
          Currency: r.currency.toUpperCase(),
          Reason: r.reason?.replace(/_/g, " ") || "—",
          Status: r.status || "unknown",
          Date: fmtDate(r.created)
        }));
        break;
      case "transactions":
        exportData = data.balanceTransactions.map(bt => ({
          ID: bt.id,
          Type: bt.type.replace(/_/g, " "),
          Gross: fmt(bt.amount, bt.currency),
          Fee: fmt(bt.fee, bt.currency),
          Net: fmt(bt.net, bt.currency),
          Currency: bt.currency.toUpperCase(),
          Status: bt.status,
          Date: fmtDate(bt.created)
        }));
        break;
    }
    
    exportToExcel(exportData, filename);
  };

  const tabs = [
    { value: "charges",       label: "Charges",       icon: CreditCard   },
    { value: "subscriptions", label: "Subscriptions", icon: Repeat2      },
    { value: "invoices",      label: "Invoices",      icon: ArrowDownLeft },
    { value: "customers",     label: "Customers",     icon: Users        },
    { value: "products",      label: "Products",      icon: Package      },
    { value: "payouts",       label: "Payouts",       icon: Banknote     },
    { value: "disputes",      label: "Disputes",      icon: AlertTriangle },
    { value: "refunds",       label: "Refunds",       icon: RefreshCw    },
    { value: "transactions",  label: "Transactions",  icon: Activity     },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Synced {data && new Date(data.fetchedAt).toLocaleString()}</h1>
          </div>
          <div className="flex gap-2">
            {data && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 w-fit">
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2 w-fit">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing} className="gap-2 w-fit">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Available balance"
              value={<MultiCurrencyValue map={sumByCurrency(data.balance.available.map((b) => ({ amount: b.amount, currency: b.currency })))} />}
              sub={data.balance.pending.length > 0 ? `${fmtBalances(data.balance.pending)} pending` : "No pending balance"}
              icon={Banknote} accent
            />
            <StatCard label="MRR" value={<MultiCurrencyValue map={mrrMap} />} sub="Monthly recurring" icon={TrendingUp} accent />
            <StatCard label="Revenue" value={<MultiCurrencyValue map={revenueMap} />} sub="Lifetime charges" icon={CircleDollarSign} />
            <StatCard label="Customers" value={data.stats.totalCustomers.toLocaleString()} sub="Total" icon={Users} />
            <StatCard label="Subscriptions" value={data.stats.activeSubscriptions.toLocaleString()} sub="Active" icon={Repeat2} />
            <StatCard
              label="Disputes"
              value={data.stats.openDisputes.toLocaleString()}
              sub={data.stats.openDisputes > 0 ? "Needs attention" : "All clear"}
              icon={AlertTriangle}
            />
          </div>
        ) : null}

        {/* Tabs */}
        <Tabs defaultValue="charges" onValueChange={setActiveTab}>
          {/* Scrollable tab bar — shadcn default styles, just made scrollable */}
          <div className="overflow-x-auto">
            <TabsList className="w-max min-w-full">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="gap-1.5">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Each tab: Card flush against TabsContent (mt-0), table fills it */}
          {/* Charges */}
          <TabsContent value="charges" className="mt-2">
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                {loading ? <SectionSkeleton cols={5} /> : !data?.charges.length ? <EmptyState message="No charges found" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={TH}>Customer</TableHead>
                        <TableHead className={TH}>Description</TableHead>
                        <TableHead className={TH}>Amount</TableHead>
                        <TableHead className={TH}>Status</TableHead>
                        <TableHead className={`${TH} text-right`}>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.charges.slice(0, 50).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className={`${TD} font-medium max-w-[180px] truncate`}>{c.customerEmail || "—"}</TableCell>
                          <TableCell className={`${TD} text-muted-foreground max-w-[200px] truncate`}>{c.description || "—"}</TableCell>
                          <TableCell className={`${TD} font-mono`}>{fmt(c.amount, c.currency)}</TableCell>
                          <TableCell className={TD}><StatusBadge status={c.refunded ? "refunded" : c.status} /></TableCell>
                          <TableCell className={`${TD} text-right text-muted-foreground whitespace-nowrap`}>{fmtDate(c.created)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Subscriptions */}
          <TabsContent value="subscriptions" className="mt-2">
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                {loading ? <SectionSkeleton cols={5} /> : !data?.subscriptions.length ? <EmptyState message="No subscriptions found" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={TH}>ID</TableHead>
                        <TableHead className={TH}>Amount</TableHead>
                        <TableHead className={TH}>Interval</TableHead>
                        <TableHead className={TH}>Status</TableHead>
                        <TableHead className={`${TH} text-right`}>Renews</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.subscriptions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className={`${TD} font-mono text-muted-foreground text-xs`}>{s.id.slice(0, 14)}…</TableCell>
                          <TableCell className={`${TD} font-mono`}>{s.items[0]?.amount ? fmt(s.items[0].amount, s.items[0].currency) : "—"}</TableCell>
                          <TableCell className={`${TD} capitalize`}>{s.items[0]?.interval || "—"}</TableCell>
                          <TableCell className={TD}><StatusBadge status={s.cancelAtPeriodEnd ? "canceled" : s.status} /></TableCell>
                          <TableCell className={`${TD} text-right text-muted-foreground whitespace-nowrap`}>{s.currentPeriodEnd > 0 ? fmtDate(s.currentPeriodEnd) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Invoices */}
          <TabsContent value="invoices" className="mt-2">
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                {loading ? <SectionSkeleton cols={5} /> : !data?.invoices.length ? <EmptyState message="No invoices found" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={TH}>Customer</TableHead>
                        <TableHead className={TH}>Due</TableHead>
                        <TableHead className={TH}>Paid</TableHead>
                        <TableHead className={TH}>Status</TableHead>
                        <TableHead className={`${TH} text-right`}>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.invoices.slice(0, 50).map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className={`${TD} font-medium max-w-[180px] truncate`}>{inv.customerEmail || "—"}</TableCell>
                          <TableCell className={`${TD} font-mono`}>{fmt(inv.amountDue, inv.currency)}</TableCell>
                          <TableCell className={`${TD} font-mono text-emerald-600 dark:text-emerald-400`}>{fmt(inv.amountPaid, inv.currency)}</TableCell>
                          <TableCell className={TD}><StatusBadge status={inv.status ?? "unknown"} /></TableCell>
                          <TableCell className={`${TD} text-right text-muted-foreground whitespace-nowrap`}>{fmtDate(inv.created)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Customers */}
          <TabsContent value="customers" className="mt-2">
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                {loading ? <SectionSkeleton cols={4} /> : !data?.customers.length ? <EmptyState message="No customers found" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={TH}>Name</TableHead>
                        <TableHead className={TH}>Email</TableHead>
                        <TableHead className={TH}>Currency</TableHead>
                        <TableHead className={`${TH} text-right`}>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.customers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className={`${TD} font-medium`}>{c.name || "—"}</TableCell>
                          <TableCell className={`${TD} text-muted-foreground`}>{c.email || "—"}</TableCell>
                          <TableCell className={`${TD} uppercase text-xs font-mono`}>{c.currency || "—"}</TableCell>
                          <TableCell className={`${TD} text-right text-muted-foreground whitespace-nowrap`}>{fmtDate(c.created)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Products */}
          <TabsContent value="products" className="mt-2">
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                {loading ? <SectionSkeleton cols={4} /> : !data?.products.length ? <EmptyState message="No products found" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={TH}>Name</TableHead>
                        <TableHead className={TH}>Description</TableHead>
                        <TableHead className={TH}>Status</TableHead>
                        <TableHead className={`${TH} text-right`}>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className={`${TD} font-medium`}>{p.name}</TableCell>
                          <TableCell className={`${TD} text-muted-foreground max-w-[240px] truncate`}>{p.description || "—"}</TableCell>
                          <TableCell className={TD}><StatusBadge status={p.active ? "active" : "inactive"} /></TableCell>
                          <TableCell className={`${TD} text-right text-muted-foreground whitespace-nowrap`}>{fmtDate(p.created)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Payouts */}
          <TabsContent value="payouts" className="mt-2">
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                {loading ? <SectionSkeleton cols={4} /> : !data?.payouts.length ? <EmptyState message="No payouts found" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={TH}>Amount</TableHead>
                        <TableHead className={TH}>Method</TableHead>
                        <TableHead className={TH}>Status</TableHead>
                        <TableHead className={`${TH} text-right`}>Arrival Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.payouts.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className={`${TD} font-mono`}>{fmt(p.amount, p.currency)}</TableCell>
                          <TableCell className={`${TD} capitalize`}>{p.method}</TableCell>
                          <TableCell className={TD}><StatusBadge status={p.status} /></TableCell>
                          <TableCell className={`${TD} text-right text-muted-foreground whitespace-nowrap`}>{fmtDate(p.arrivalDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Disputes */}
          <TabsContent value="disputes" className="mt-2">
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                {loading ? <SectionSkeleton cols={4} /> : !data?.disputes.length ? <EmptyState message="No open disputes" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={TH}>Amount</TableHead>
                        <TableHead className={TH}>Reason</TableHead>
                        <TableHead className={TH}>Status</TableHead>
                        <TableHead className={`${TH} text-right`}>Due By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.disputes.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className={`${TD} font-mono`}>{fmt(d.amount, d.currency)}</TableCell>
                          <TableCell className={`${TD} capitalize`}>{d.reason.replace(/_/g, " ")}</TableCell>
                          <TableCell className={TD}><StatusBadge status={d.status} /></TableCell>
                          <TableCell className={`${TD} text-right text-muted-foreground whitespace-nowrap`}>{d.dueBy ? fmtDate(d.dueBy) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Refunds */}
          <TabsContent value="refunds" className="mt-2">
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                {loading ? <SectionSkeleton cols={4} /> : !data?.refunds.length ? <EmptyState message="No refunds found" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={TH}>Amount</TableHead>
                        <TableHead className={TH}>Reason</TableHead>
                        <TableHead className={TH}>Status</TableHead>
                        <TableHead className={`${TH} text-right`}>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.refunds.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className={`${TD} font-mono`}>{fmt(r.amount, r.currency)}</TableCell>
                          <TableCell className={`${TD} capitalize`}>{r.reason?.replace(/_/g, " ") || "—"}</TableCell>
                          <TableCell className={TD}><StatusBadge status={r.status ?? "unknown"} /></TableCell>
                          <TableCell className={`${TD} text-right text-muted-foreground whitespace-nowrap`}>{fmtDate(r.created)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Transactions */}
          <TabsContent value="transactions" className="mt-2">
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                {loading ? <SectionSkeleton cols={6} /> : !data?.balanceTransactions.length ? <EmptyState message="No transactions found" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={TH}>Type</TableHead>
                        <TableHead className={TH}>Gross</TableHead>
                        <TableHead className={TH}>Fee</TableHead>
                        <TableHead className={TH}>Net</TableHead>
                        <TableHead className={TH}>Status</TableHead>
                        <TableHead className={`${TH} text-right`}>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.balanceTransactions.slice(0, 100).map((bt) => (
                        <TableRow key={bt.id}>
                          <TableCell className={`${TD} capitalize text-muted-foreground`}>{bt.type.replace(/_/g, " ")}</TableCell>
                          <TableCell className={`${TD} font-mono`}>{fmt(bt.amount, bt.currency)}</TableCell>
                          <TableCell className={`${TD} font-mono text-red-600 dark:text-red-400`}>-{fmt(bt.fee, bt.currency)}</TableCell>
                          <TableCell className={`${TD} font-mono text-emerald-600 dark:text-emerald-400`}>{fmt(bt.net, bt.currency)}</TableCell>
                          <TableCell className={TD}><StatusBadge status={bt.status} /></TableCell>
                          <TableCell className={`${TD} text-right text-muted-foreground whitespace-nowrap`}>{fmtDate(bt.created)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}