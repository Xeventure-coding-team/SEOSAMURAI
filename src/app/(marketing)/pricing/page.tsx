import React from "react";
import { PLANS, formatPrice } from "@/lib/stripe";
import { getUserSubscription } from "@/lib/actions/stripe";
import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckoutButton } from "@/components/checkout/checkout-button";
import { stackServerApp } from "@/stack";
import MainLayout from "@/app/layouts/MainLayout";
import { createMetadata } from "../../../../lib/metadata";

export const metadata = createMetadata({
  title: "Pricing",
  description: "Automate local SEO growth for your Google Business Profile.",
  slug: "/pricing",
});

function getReplyMultiplier(features: string[]) {
  const match = features.find((f) => /AI Review Repl/i.test(f))?.match(/(\d+)x/i);
  return match ? `${match[1]}x` : "—";
}

type Plan = (typeof PLANS)[number];

// Grouped feature rows for better scannability
const FEATURE_GROUPS: {
  group: string;
  rows: { title: string; get: (p: Plan) => React.ReactNode }[];
}[] = [
  {
    group: "Core limits",
    rows: [
      {
        title: "Business locations",
        get: (p) =>
          `${p.limits.locations} location${p.limits.locations > 1 ? "s" : ""}`,
      },
      { title: "Websites", get: (p) => p.limits.websites },
    ],
  },
  {
    group: "Posting & automation",
    rows: [
      { title: "Posts per month", get: (p) => p.limits.postsPerMonth },
      { title: "Scheduled posts", get: (p) => `${p.limits.scheduledPosts} / month` },
      { title: "AI poster images", get: (p) => `${p.limits.aiImage} / month` },
      { title: "Review posters", get: (p) => `${p.limits.reviewPoster} / month` },
      { title: "Bulk posting", get: (p) => p.limits.bulkPosts },
      { title: "Media upload", get: (p) => p.limits.mediaUpload },
    ],
  },
  {
    group: "Tracking & reviews",
    rows: [
      { title: "Geo grid scans", get: (p) => `${p.limits.geoGridScans} / month` },
      { title: "Keywords per location", get: (p) => p.limits.keywordTracking },
      {
        title: "AI review replies",
        get: (p) => `${getReplyMultiplier(p.features)}x`,
      },
      { title: "Review tracking", get: (p) => p.limits.reviewTracking },
    ],
  },
  {
    group: "Insights & health",
    rows: [
      { title: "Competitor insights", get: (p) => p.limits.competitorInsights },
      { title: "Analytics dashboard", get: (p) => p.limits.analytics },
      { title: "Business health monitoring", get: (p) => p.limits.health },
      { title: "Weekly tasks", get: (p) => p.limits.tasks },
      { title: "Task achievements", get: (p) => p.limits.taskAchievements },
      { title: "Task milestones", get: (p) => p.limits.taskMilestones },
    ],
  },
];

function CellValue({ value }: { value: React.ReactNode }) {
  if (typeof value === "boolean") {
    return value ? (
      <>
        <span className="sr-only">Included</span>
        <CheckIcon className="size-5 text-primary inline" aria-hidden="true" />
      </>
    ) : (
      <>
        <span className="sr-only">Not included</span>
        <MinusIcon className="size-5 text-muted-foreground/40 inline" aria-hidden="true" />
      </>
    );
  }
  return <span className="font-medium">{value}</span>;
}

export default async function PricingPage() {
  const user = await stackServerApp.getUser();
  const subscription = user ? await getUserSubscription(user.id) : null;
  const currentPlanId = subscription?.plan?.toLowerCase() ?? null;

  return (
    <MainLayout>
      <main className="container mx-auto px-4 lg:py-24 py-12">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-16">
          <div className="text-base text-primary mb-4 uppercase font-bold tracking-[0.18em]">
            Pricing
          </div>
          <h1 className="font-bold lg:text-6xl md:text-5xl text-4xl mb-4 tracking-tight leading-[1.05] text-foreground">
            Pick your rank.
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            Every plan tracks rankings, replies to reviews, and posts updates
            on autopilot — compare what each one includes below.
          </p>
        </div>

        {/* ─── MOBILE: stacked cards (hidden on md+) ─── */}
        <div className="md:hidden space-y-6">
          {PLANS.map((plan) => {
            const isCurrentPlan =
              !!subscription &&
              subscription.status === "ACTIVE" &&
              currentPlanId === plan.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-2xl border overflow-hidden",
                  plan.highlight
                    ? "border-primary/60 shadow-lg shadow-primary/10"
                    : "border-border"
                )}
              >
                {/* Card header */}
                <div
                  className={cn(
                    "px-5 pt-6 pb-5 relative",
                    plan.highlight
                      ? "bg-[#0B0F19] text-white"
                      : "bg-muted/30"
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-2xl" />
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        plan.highlight ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {plan.name}
                    </span>
                    {plan.highlight && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-white/10 rounded-full px-2 py-0.5">
                        Popular
                      </span>
                    )}
                    {isCurrentPlan && (
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5",
                          plan.highlight
                            ? "bg-white/10 text-white"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        Current
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span
                      className={cn(
                        "text-4xl font-bold tabular-nums",
                        !plan.highlight && "text-foreground"
                      )}
                    >
                      {formatPrice(plan.price)}
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        plan.highlight ? "text-white/60" : "text-muted-foreground"
                      )}
                    >
                      /{plan.interval}
                    </span>
                  </div>

                  <p
                    className={cn(
                      "text-sm leading-snug mb-4",
                      plan.highlight ? "text-white/70" : "text-muted-foreground"
                    )}
                  >
                    {plan.description}
                  </p>

                  <CheckoutButton
                    planId={plan.id}
                    isCurrentPlan={isCurrentPlan}
                    hasActiveSubscription={!!subscription}
                    isHighlight={plan.highlight}
                    isLoggedIn={!!user}
                    textColor={plan.highlight ? "light" : "auto"}
                  />

                </div>

                {/* Feature rows, grouped */}
                <div className="divide-y divide-border">
                  {FEATURE_GROUPS.map((group) => (
                    <div key={group.group}>
                      <div className="px-5 py-2 bg-muted/40">
                        <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
                          {group.group}
                        </span>
                      </div>
                      {group.rows.map((row) => (
                        <div
                          key={row.title}
                          className="flex items-center justify-between px-5 py-3.5 border-t border-border/50"
                        >
                          <span className="text-sm text-foreground/80">
                            {row.title}
                          </span>
                          <div className="text-sm font-medium text-foreground">
                            <CellValue value={row.get(plan)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── DESKTOP: comparison table (hidden on mobile) ─── */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-border">
          <table className="w-full border-collapse min-w-[820px]">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-6 py-6 text-left border-b border-r border-border bg-muted/30 w-1/4 align-bottom"
                >
                  <h3 className="text-foreground font-bold text-xl">Compare plans</h3>
                  <p className="text-sm text-muted-foreground font-normal mt-2 leading-relaxed">
                    Every plan includes rank tracking and review replies.
                  </p>
                </th>
                {PLANS.map((plan) => {
                  const isCurrentPlan =
                    !!subscription &&
                    subscription.status === "ACTIVE" &&
                    currentPlanId === plan.id;

                  return (
                    <th
                      key={plan.id}
                      scope="col"
                      className={cn(
                        "px-6 py-6 text-center border-b border-border align-bottom relative",
                        plan.highlight
                          ? "bg-[#0B0F19] text-white dark:bg-[#05070d]"
                          : "bg-background"
                      )}
                    >
                      {plan.highlight && (
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
                      )}

                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            plan.highlight ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {plan.name}
                        </span>
                        {plan.highlight && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-white/10 rounded-full px-2 py-0.5">
                            Popular
                          </span>
                        )}
                        {isCurrentPlan && (
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5",
                              plan.highlight
                                ? "bg-white/10 text-white"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            Current
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-baseline justify-center gap-1">
                        <span
                          className={cn(
                            "text-3xl md:text-4xl font-bold tabular-nums",
                            !plan.highlight && "text-foreground"
                          )}
                        >
                          {formatPrice(plan.price)}
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            /* FIX: was text-white/50 — bumped to /70 for legibility */
                            plan.highlight ? "text-white/70" : "text-muted-foreground"
                          )}
                        >
                          /{plan.interval}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-xs mt-2 leading-snug max-w-[180px] mx-auto",
                          /* FIX: was text-white/60 — bumped to /75 */
                          plan.highlight ? "text-white/75" : "text-muted-foreground"
                        )}
                      >
                        {plan.description}
                      </p>

                      <div className="mt-5">
                        <CheckoutButton
                          planId={plan.id}
                          isCurrentPlan={isCurrentPlan}
                          hasActiveSubscription={!!subscription}
                          isHighlight={plan.highlight}
                          isLoggedIn={!!user}
                          textColor={plan.highlight ? "light" : "auto"}
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {FEATURE_GROUPS.map((group) => (
                <React.Fragment key={group.group}>
                  {/* Group subheader row */}
                  <tr className="bg-muted/40">
                    <th
                      colSpan={1 + PLANS.length}
                      className="px-6 py-2.5 text-left border border-border"
                    >
                      <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
                        {group.group}
                      </span>
                    </th>
                  </tr>

                  {/* Feature rows */}
                  {group.rows.map((row, idx) => (
                    <tr
                      key={row.title}
                      className={cn(
                        "transition-colors",
                        idx % 2 === 1 ? "bg-muted/20" : "bg-background"
                      )}
                    >
                      <th
                        scope="row"
                        className="px-6 py-4 text-left border border-border"
                      >
                        {/* FIX: was text-foreground (rendered orange) — now explicitly muted */}
                        <span className="text-[13px] md:text-[15px] font-normal text-muted-foreground">
                          {row.title}
                        </span>
                      </th>

                      {PLANS.map((plan) => (
                        <td
                          key={plan.id}
                          className={cn(
                            "px-4 py-4 text-center border border-border",
                            plan.highlight && "bg-primary/5"
                          )}
                        >
                          <div className="text-[13px] md:text-[15px] font-medium text-foreground">
                            <CellValue value={row.get(plan)} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>

            <tfoot>
              <tr className="bg-muted/30">
                <th className="px-6 py-5 border border-border text-left">
                  <div>
                    <h4 className="font-semibold text-foreground">Ready to get started?</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose the plan that fits your business.
                    </p>
                  </div>
                </th>

                {PLANS.map((plan) => {
                  const isCurrentPlan =
                    !!subscription &&
                    subscription.status === "ACTIVE" &&
                    currentPlanId === plan.id;

                  return (
                    <td
                      key={plan.id}
                      className={cn(
                        "px-6 py-5 border border-border text-center",
                        plan.highlight && "bg-primary/5"
                      )}
                    >
                      <CheckoutButton
                        planId={plan.id}
                        isCurrentPlan={isCurrentPlan}
                        hasActiveSubscription={!!subscription}
                        isHighlight={plan.highlight}
                        isLoggedIn={!!user}
                        textColor={plan.highlight ? "light" : "auto"}
                      />
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* FAQ — FIX: increased top margin from mt-24 to mt-32 for breathing room */}
        <div className="max-w-3xl mx-auto mt-32">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight mb-3 text-foreground">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Can't find what you're looking for?{" "}
              <a href="/contact" className="text-primary underline-offset-4 hover:underline">
                Reach out to us
              </a>
              .
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="switch">
              <AccordionTrigger className="text-left text-lg font-semibold py-5">
                Can I switch plans later?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                Yes. Upgrade or downgrade at any time from your billing
                settings — changes apply immediately and we prorate the
                difference.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cancel">
              <AccordionTrigger className="text-left text-lg font-semibold py-5">
                What happens if I cancel?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                You keep access until the end of your current billing period.
                No partial refunds, no surprise charges after that.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="locations">
              <AccordionTrigger className="text-left text-lg font-semibold py-5">
                Do you support multiple Google Business Profile locations?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                Each plan lists its location limit above. Need more than the
                Pro plan covers? Contact us for custom pricing.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="payment">
              <AccordionTrigger className="text-left text-lg font-semibold py-5">
                Which payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                All major credit and debit cards via Stripe, billed in your
                local currency.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>
    </MainLayout>
  );
}