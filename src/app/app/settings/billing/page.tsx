import { PLANS, formatPrice } from "@/lib/stripe";
import { getUserSubscription } from "@/lib/actions/stripe";
import {
  Check, Zap, Download, CreditCard, Calendar,
  Shield, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/checkout/checkout-button";
import { stackServerApp } from "@/stack";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import Stripe from "stripe";
import { ManageButton } from "@/components/checkout/manage-button";
import { AutopayToggle } from "@/components/checkout/autopay-toggle";
import BillingsPage from "@/components/billing/BillingsPage";
import { CurrencyProvider } from "@/providers/CurrencyProvider";
import { CurrencySelector } from "@/components/checkout/CurrencySelector";
import { PlanCardClient } from "@/components/checkout/PlanCardClient";
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: `Billing & plans — ${process.env.APP_NAME}`,
};

// ─── Stripe helpers (unchanged) ───────────────────────────────────────────────
async function fetchInvoices(stripeCustomerId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { data } = await stripe.invoices.list({ customer: stripeCustomerId, limit: 5 });
  return data.map((inv) => ({
    id: inv.id,
    date: new Date(inv.created * 1000).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    }),
    description: inv.lines?.data?.[0]?.description ?? "Subscription",
    amount: inv.amount_paid / 100,
    status: inv.status,
    pdfUrl: inv.invoice_pdf,
  }));
}

async function fetchPaymentMethod(stripeSubscriptionId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ["default_payment_method"],
  });
  const pm = subscription.default_payment_method;
  if (!pm || typeof pm === "string" || pm.type !== "card") return null;
  return {
    brand: pm.card!.brand,
    last4: pm.card!.last4,
    expMonth: pm.card!.exp_month,
    expYear: pm.card!.exp_year,
  };
}

function brandLabel(brand: string) {
  const map: Record<string, string> = {
    visa: "Visa", mastercard: "Mastercard", amex: "Amex",
    discover: "Discover", rupay: "RuPay", unionpay: "UnionPay",
    jcb: "JCB", diners: "Diners",
  };
  return map[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

// ─── Banner (unchanged) ───────────────────────────────────────────────────────
function ActiveBanner({ subscription, paymentMethod }: any) {
  if (!subscription) return null;
  const isCancelling = subscription.cancelAtPeriodEnd;
  const billingDate = new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  const planLabel = subscription.plan.charAt(0) + subscription.plan.slice(1).toLowerCase();

  return (
    <div className={cn(
      "mb-8 rounded-2xl border px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5",
      isCancelling
        ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
        : "border-border bg-card"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
          isCancelling ? "bg-amber-100 dark:bg-amber-900/40" : "bg-primary/10"
        )}>
          {isCancelling
            ? <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            : <Shield className="h-5 w-5 text-primary" />}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Current plan</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold">{planLabel}</p>
            {isCancelling ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Cancels {billingDate}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {subscription.stripeSubscriptionId}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 sm:gap-8">
        {paymentMethod && (
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1 sm:justify-end">
              <CreditCard className="h-3 w-3" />
              Autopay
            </p>
            <div className="flex items-center gap-1.5 sm:justify-end">
              <span className="text-sm font-medium">{brandLabel(paymentMethod.brand)}</span>
              <span className="text-sm text-muted-foreground">•••• {paymentMethod.last4}</span>
              <span className="text-[11px] text-muted-foreground">
                {String(paymentMethod.expMonth).padStart(2, "0")}/{String(paymentMethod.expYear).slice(-2)}
              </span>
            </div>
            <AutopayToggle isAutopayOn={!subscription.cancelAtPeriodEnd} />
          </div>
        )}
        <div className="text-left sm:text-right">
          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1 sm:justify-end">
            <Calendar className="h-3 w-3" />
            {isCancelling ? "Access until" : "Next billing"}
          </p>
          <p className="text-sm font-medium">{billingDate}</p>
        </div>
        <ManageButton />
      </div>
    </div>
  );
}

// ─── Invoice row (unchanged) ──────────────────────────────────────────────────
function InvoiceRow({ invoice }: any) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border last:border-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{invoice.description}</p>
          <p className="text-xs text-muted-foreground">{invoice.date}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
          <Check className="h-3 w-3" />
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
        {invoice.pdfUrl && (
          <a
            href={invoice.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function BillingPage() {
  const user = await stackServerApp.getUser();
  const subscription = user ? await getUserSubscription(user.id) : null;
  const currentPlanId = subscription?.plan?.toLowerCase() ?? null;

  const [invoices, paymentMethod] = await Promise.all([
    subscription?.stripeCustomerId
      ? fetchInvoices(subscription.stripeCustomerId)
      : Promise.resolve([]),
    subscription?.stripeSubscriptionId
      ? fetchPaymentMethod(subscription.stripeSubscriptionId)
      : Promise.resolve(null),
  ]);

  // Serialise plan data for the client component (no functions/env vars)
  const planData = PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    prices: p.prices,           // { inr: 129900, usd: 2400, … }
    interval: p.interval,
    features: p.features,
    highlight: p.highlight ?? false,
    cta: p.cta,
    isCurrentPlan:
      !!subscription &&
      subscription.status === "ACTIVE" &&
      currentPlanId === p.id,
  }));

  return (
      <DashboardLayout>
        <div className="container mx-auto max-w-8xl px-4 py-10">

          {/* Header row with currency selector */}
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Billing &amp; plans</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage your subscription and billing details.
              </p>
            </div>
            {/* ── Currency switcher ── */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Currency</span>
              <CurrencySelector />
            </div>
          </div>

          <ActiveBanner subscription={subscription} paymentMethod={paymentMethod} />

          {/* Plan cards — client component reads currency from context */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {planData.map((plan) => (
              <PlanCardClient
                key={plan.id}
                plan={plan}
                hasActiveSubscription={!!subscription}
                isLoggedIn={!!user}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Billing history</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download past invoices for your records.
              </p>
            </div>
            <div className="px-6">
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No invoices yet.
                </p>
              )}
            </div>
          </div>

        </div>
        <BillingsPage />
      </DashboardLayout>
  );
}