"use client";

import PageHeader from "@/components/admin/page-header";
import { NewsletterSubscribersTable } from "@/components/admin/newsletter-subscribers-table";

async function getSubscribers() {
  const res = await fetch("/api/admin/subscribers", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load subscribers");
  return res.json();
}

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Subscribers"
        description="Everyone who's opted in to receive newsletter and marketing emails."
      />
      <div className="mt-8">
        <NewsletterSubscribersTable fetchSubscribers={getSubscribers} />
      </div>
    </div>
  );
}