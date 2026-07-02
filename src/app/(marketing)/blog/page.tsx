import { prisma } from '../../../../lib/prisma';
import MainLayout from '@/app/layouts/MainLayout';
import { createMetadata } from '../../../../lib/metadata';
import Link from 'next/link';

export const metadata = createMetadata({
  title: "Blog",
  description: "High rankings and visibility can make or break a local business. Practical guides to help you improve rankings and visibility across Google Maps, search, and AI answers.",
  slug: "/blog",
});

function getReadingTime(body: string): string {
  const wordsPerMinute = 200;
  const words = body.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

function formatDate(date: Date | null): string {
  if (!date) return 'Draft';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function BlogPage() {
  const allPosts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
  });

  if (allPosts.length === 0) {
    return (
      <MainLayout>
        <div className="bg-gradient-to-b from-muted/50 to-background">
          <div className="container mx-auto px-6 py-24 text-center">
            <span className="inline-block text-xs font-semibold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-full mb-5">
              Local SEO Blog
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Insights for ranking higher, everywhere.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
              Practical guides to help you improve rankings and visibility across Google Maps, search, and AI answers — no marketing background needed.
            </p>
            <div className="rounded-2xl border border-border bg-muted/30 py-16">
              <h2 className="text-xl font-semibold text-foreground mb-1">Nothing published yet</h2>
              <p className="text-muted-foreground">Check back soon — new guides are on the way.</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const featuredPost = allPosts[0];
  const remainingPosts = allPosts.slice(1);
  const sidebarPosts = remainingPosts.slice(0, 2);
  const gridPosts = remainingPosts.slice(2);

  const allCategories = ['All', ...Array.from(new Set(allPosts.flatMap((post) => post.categories || [])))];

  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-muted/50 to-background border-b border-border">
        <div className="mx-auto px-6 pt-20 pb-12 container">
          <span className="inline-block text-xs font-semibold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-full mb-5">
            Local SEO Blog
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 max-w-2xl">
            Insights for ranking higher, everywhere.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            High rankings and visibility can make or break a local business. Practical guides to help you improve visibility across Google Maps, search, and AI answers.
          </p>
        </div>
      </div>

      <div className="mx-auto px-6 py-12 container">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-14">
          {allCategories.map((category) => (
            <button
              key={category}
              className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                category === 'All'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured Section */}
        <div className="mb-20">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Featured Post */}
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden"
            >
              {featuredPost.coverImage && (
                <div className="relative h-72 overflow-hidden bg-muted">
                  <img
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-7">
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  <span className="inline-flex items-center gap-1.5 text-primary font-medium text-xs uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Latest
                  </span>
                  <span>·</span>
                  <span>{formatDate(featuredPost.publishedAt)}</span>
                  <span>·</span>
                  <span>{getReadingTime(featuredPost.body || '')}</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3 leading-snug">
                  {featuredPost.title}
                </h2>
                <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                  {featuredPost.metaDescription || (featuredPost.body?.substring(0, 150) + '...') || ''}
                </p>
              </div>
            </Link>

            {/* Side Posts */}
            {sidebarPosts.length > 0 && (
              <div className="flex flex-col gap-6">
                {sidebarPosts.map((post) => (
                  <Link
                    href={`/blog/${post.slug}`}
                    key={post.id}
                    className="flex-1 rounded-2xl border border-border bg-card p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <span className="text-muted-foreground font-medium uppercase tracking-wide">
                          {post.categories?.[0] || 'Article'}
                        </span>
                        <span>·</span>
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                      <h3 className="font-semibold text-foreground line-clamp-3 leading-snug">
                        {post.title}
                      </h3>
                    </div>
                    <span className="mt-4 text-xs text-muted-foreground">{getReadingTime(post.body || '')}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Posts Grid */}
        {gridPosts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-foreground">All Posts</h2>
              <span className="text-sm text-muted-foreground">{gridPosts.length} articles</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {gridPosts.map((post) => (
                <Link
                  href={`/blog/${post.slug}`}
                  key={post.id}
                  className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col"
                >
                  {post.coverImage ? (
                    <div className="relative h-44 overflow-hidden bg-muted">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-44 bg-gradient-to-br from-primary/5 via-muted to-background" />
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span className="text-muted-foreground font-medium uppercase tracking-wide">
                        {post.categories?.[0] || 'Article'}
                      </span>
                      <span>·</span>
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                      {post.metaDescription || (post.body?.substring(0, 120) + '...') || ''}
                    </p>
                    <span className="mt-auto text-xs text-muted-foreground">{getReadingTime(post.body || '')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}