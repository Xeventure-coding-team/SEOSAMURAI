import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
    try {
        // Fetch all major dashboard data in parallel

        const user = await stackServerApp.getUser();
        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [
            balance,
            customers,
            charges,
            subscriptions,
            invoices,
            products,
            payouts,
            disputes,
            refunds,
            balanceTransactions,
        ] = await Promise.all([
            // Current account balance (available + pending)
            stripe.balance.retrieve(),

            // Recent customers (last 10)
            stripe.customers.list({ limit: 10 }),

            // Recent charges (last 10)
            stripe.charges.list({ limit: 10 }),

            // Active subscriptions (last 10)
            stripe.subscriptions.list({ limit: 10, status: "all" }),

            // Recent invoices (last 10)
            stripe.invoices.list({ limit: 10 }),

            // All products
            stripe.products.list({ limit: 10, active: true }),

            // Recent payouts
            stripe.payouts.list({ limit: 10 }),

            // Open disputes
            stripe.disputes.list({ limit: 10 }),

            // Recent refunds
            stripe.refunds.list({ limit: 10 }),

            // Balance transaction history
            stripe.balanceTransactions.list({ limit: 20 }),
        ]);

        // --- Aggregated stats ---
        const totalRevenue = charges.data
            .filter((c) => c.status === "succeeded")
            .reduce((sum, c) => sum + c.amount, 0);

        const mrr = subscriptions.data
            .filter((s) => s.status === "active")
            .reduce((sum, s) => {
                const item = s.items.data[0];
                if (!item?.price?.unit_amount) return sum;
                const amount = item.price.unit_amount;
                const interval = item.price.recurring?.interval;
                // Normalize to monthly
                if (interval === "year") return sum + amount / 12;
                if (interval === "week") return sum + amount * 4;
                return sum + amount;
            }, 0);

        const stats = {
            totalCustomers: customers.data.length,
            activeSubscriptions: subscriptions.data.filter(
                (s) => s.status === "active"
            ).length,
            openDisputes: disputes.data.filter((d) => d.status === "needs_response")
                .length,
            totalRefunded: refunds.data.reduce((sum, r) => sum + (r.amount ?? 0), 0),
            recentRevenue: totalRevenue, // in smallest currency unit (cents)
            mrr, // estimated monthly recurring revenue (cents)
        };

        return NextResponse.json({
            ok: true,
            fetchedAt: new Date().toISOString(),
            stats,
            balance: {
                available: balance.available,
                pending: balance.pending,
                livemode: balance.livemode,
            },
            customers: customers.data.map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                currency: c.currency,
                created: c.created,
                metadata: c.metadata,
            })),
            charges: charges.data.map((c) => ({
                id: c.id,
                amount: c.amount,
                currency: c.currency,
                status: c.status,
                description: c.description,
                customerEmail: c.billing_details?.email,
                created: c.created,
                refunded: c.refunded,
                disputeId: typeof c.dispute === "string" ? c.dispute : c.dispute?.id,
            })),
            subscriptions: subscriptions.data.map((s) => ({
                id: s.id,
                status: s.status,
                customerId: s.customer,
                currentPeriodStart: s.current_period_start,
                currentPeriodEnd: s.current_period_end,
                cancelAtPeriodEnd: s.cancel_at_period_end,
                items: s.items.data.map((item) => ({
                    priceId: item.price.id,
                    amount: item.price.unit_amount,
                    currency: item.price.currency,
                    interval: item.price.recurring?.interval,
                })),
            })),
            invoices: invoices.data.map((inv) => ({
                id: inv.id,
                status: inv.status,
                amountDue: inv.amount_due,
                amountPaid: inv.amount_paid,
                currency: inv.currency,
                customerId: inv.customer,
                customerEmail: inv.customer_email,
                dueDate: inv.due_date,
                created: inv.created,
                hostedInvoiceUrl: inv.hosted_invoice_url,
            })),
            products: products.data.map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                active: p.active,
                images: p.images,
                created: p.created,
                metadata: p.metadata,
            })),
            payouts: payouts.data.map((p) => ({
                id: p.id,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                arrivalDate: p.arrival_date,
                method: p.method,
                description: p.description,
                created: p.created,
            })),
            disputes: disputes.data.map((d) => ({
                id: d.id,
                amount: d.amount,
                currency: d.currency,
                status: d.status,
                reason: d.reason,
                chargeId: typeof d.charge === "string" ? d.charge : d.charge.id,
                created: d.created,
                dueBy: d.evidence_details?.due_by,
            })),
            refunds: refunds.data.map((r) => ({
                id: r.id,
                amount: r.amount,
                currency: r.currency,
                status: r.status,
                reason: r.reason,
                chargeId: r.charge,
                created: r.created,
            })),
            balanceTransactions: balanceTransactions.data.map((bt) => ({
                id: bt.id,
                amount: bt.amount,
                fee: bt.fee,
                net: bt.net,
                currency: bt.currency,
                type: bt.type,
                status: bt.status,
                description: bt.description,
                created: bt.created,
            })),
        });
    } catch (err) {
        const error = err as Stripe.errors.StripeError;
        return NextResponse.json(
            {
                ok: false,
                error: error.message ?? "Failed to fetch Stripe data",
                type: error.type,
                code: error.code,
            },
            { status: error.statusCode ?? 500 }
        );
    }
}