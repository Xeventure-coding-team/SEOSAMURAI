import MainLayout from '@/app/layouts/MainLayout';
import Link from 'next/link';
import { createMetadata } from '../../../../lib/metadata';

export const metadata = createMetadata({
  title: 'About Rankerly',
  description:
    'Rankerly helps multi-location businesses improve their visibility on Google Maps, local search, and AI answers.',
  slug: '/about',
});

export default function AboutPage() {
  return (
    <MainLayout>
      <section className="container mx-auto px-6 py-20 max-w-3xl">
        {/* Header */}
        <div className="mb-12">
          <span className="inline-block text-xs font-semibold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-full mb-5">
            About Us
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-5 leading-tight">
            We help local businesses get found.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Rankerly is a local SEO platform built for multi-location businesses
            who want to show up where it matters — Google Maps, local search,
            and now, AI-powered answers.
          </p>
        </div>

        {/* The problem */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">The problem with local SEO tools</h2>
          <div className="prose prose-neutral max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed">
            <p>
              Most local SEO tools were built with a single storefront in mind.
              They work fine if you&apos;re managing one listing, one address,
              one set of reviews. But the moment a business grows past one
              location, the cracks start to show. Rankings get tracked city by
              city in separate spreadsheets. Listings drift out of sync.
              Review responses fall behind. And nobody on the team has a clear
              picture of which locations are actually performing and which are
              quietly losing visibility.
            </p>
            <p>
              We saw this pattern play out again and again with multi-location
              brands — franchises, regional service businesses, chains with a
              handful of branches — all stitching together tools that were
              never designed for their scale. So we built Rankerly to be the
              tool we wished existed: one dashboard, every location, real
              visibility into what&apos;s working and what isn&apos;t.
            </p>
          </div>
        </div>

        {/* What we do */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">What Rankerly does</h2>
          <div className="prose prose-neutral max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed mb-6">
            <p>
              Rankerly brings local search visibility into one place. Instead
              of guessing how your locations are performing, you get a clear,
              ongoing view of rankings, listing health, and reputation across
              every market you operate in — and increasingly, how your
              business shows up in AI-generated answers, not just traditional
              search results.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold text-foreground mb-1.5">Local rank tracking</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                See exactly where each location ranks in Google Maps and local
                search, broken down by city and keyword.
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold text-foreground mb-1.5">Listing management</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Keep business information consistent and accurate across every
                location, without manual spreadsheet wrangling.
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold text-foreground mb-1.5">AI visibility</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Track how your business shows up in AI-powered answers, a
                fast-growing source of discovery alongside search.
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold text-foreground mb-1.5">Multi-location reporting</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Roll up performance across all locations, or drill into one
                branch at a time — whichever view you need.
              </div>
            </div>
          </div>
        </div>

        {/* Who it's for */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Who we build for</h2>
          <div className="prose prose-neutral max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed">
            <p>
              Rankerly is built for businesses that operate in more than one
              place — franchise owners, regional service providers,
              multi-branch healthcare and retail chains, and agencies managing
              local SEO on behalf of multiple clients. If your growth depends
              on showing up consistently across many local markets at once,
              Rankerly is built around that exact problem, not bolted onto a
              single-location tool as an afterthought.
            </p>
          </div>
        </div>

        {/* Stats / values row */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-2xl font-bold text-foreground mb-1">Multi-location</div>
            <div className="text-sm text-muted-foreground">Built for brands with many locations, not just one.</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-2xl font-bold text-foreground mb-1">AI-ready</div>
            <div className="text-sm text-muted-foreground">Track visibility in AI answers, not just search results.</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-2xl font-bold text-foreground mb-1">Built by SEOs</div>
            <div className="text-sm text-muted-foreground">Made by people who've actually run local SEO campaigns.</div>
          </div>
        </div>

        {/* Where we're headed */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Where we&apos;re headed</h2>
          <div className="prose prose-neutral max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed">
            <p>
              Local search is changing faster than it has in years. AI answers
              are becoming a real discovery channel alongside Maps and
              traditional search results, and the businesses that adapt early
              will have a real advantage. We&apos;re building Rankerly to stay
              ahead of that shift — not just tracking where the puck is today,
              but where local visibility is heading next, so the businesses
              using Rankerly aren&apos;t caught off guard by it.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-foreground mb-1">
              Have questions or feedback?
            </div>
            <p className="text-sm text-muted-foreground">
              We&apos;d love to hear from you.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Contact us
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}