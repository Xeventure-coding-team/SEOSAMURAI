import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { prisma } from "../lib/prisma";

async function main() {
  const sub = await prisma.subscription.create({
    data: {
      stackUserId: "47ce824e-055e-46c7-ae1b-243e52501c7f",
      stripeCustomerId: "cus_test_manual",
      stripeSubscriptionId: "sub_test_manual",
      stripePriceId: "price_test_manual",
      stripeCurrentPeriodEnd: new Date("2026-06-04"),
      status: "ACTIVE",
      plan: "STARTER",
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.usage.create({
    data: {
      subscriptionId: sub.id,
      stackUserId: "47ce824e-055e-46c7-ae1b-243e52501c7f",
      periodStart: new Date(),
      periodEnd: new Date("2026-06-04"),
    },
  });

  console.log("✅ Done!", sub.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());