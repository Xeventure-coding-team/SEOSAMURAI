import { Metadata } from 'next';
import { prisma } from '../../../../lib/prisma';
import { ChangelogDisplay } from '@/components/changelog_client/ChangelogDisplay';
import MainLayout from '@/app/layouts/MainLayout';
import { createMetadata } from '../../../../lib/metadata';
import { Rss } from 'lucide-react';

export const metadata = createMetadata({
  title: "Changelog",
  description: "Stay up to date with the latest changes, features, and improvements.",
  slug: "/changelog",
});

export default async function ChangelogPage() {
  const entries = await prisma.changeLog.findMany({
    orderBy: { releaseDate: 'desc' }
  });

  return (
    <MainLayout>
      <main className="container mx-auto px-4 lg:py-24 py-12">
        {/* Header */}
        <div className="mb-12 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Rss className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              What's new
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Changelog
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground max-w-lg">
            New features, improvements, and fixes — shipped and documented as they land.
          </p>
        </div>

        <ChangelogDisplay entries={entries} />
      </main>
    </MainLayout>
  );
}