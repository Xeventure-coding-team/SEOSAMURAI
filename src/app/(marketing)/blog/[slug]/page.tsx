import { prisma } from '../../../../../lib/prisma';
import MainLayout from '@/app/layouts/MainLayout';
import { createMetadata } from '../../../../../lib/metadata';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ShareButtons from '@/components/blog_client/ShareButtons';

function getReadingTime(body: string): string {
    const wordsPerMinute = 200;
    const words = body.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
}

function formatDate(date: Date | null): string {
    if (!date) return 'Draft';
    return new Date(date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

// remove inline color/font/background styles that CMS rich-text paste tends to leave behind,
// since inline styles override the prose-* Tailwind classes (higher CSS specificity)
function stripInlineStyles(html: string) {
    return html.replace(/style="[^"]*"/gi, (styleAttr) => {
        const cleaned = styleAttr
            .replace(/color\s*:\s*[^;"]+;?/gi, '')
            .replace(/background(-color)?\s*:\s*[^;"]+;?/gi, '')
            .replace(/font-family\s*:\s*[^;"]+;?/gi, '');
        // drop the attribute entirely if nothing useful is left
        return cleaned.trim() === 'style=""' ? '' : cleaned;
    });
}

// crude heading extraction for a table of contents — assumes body is HTML with <h2>/<h3> tags
function extractHeadings(html: string) {
    const matches = [...html.matchAll(/<h([23])[^>]*>(.*?)<\/h[23]>/gi)];
    return matches.map((m, i) => {
        const level = parseInt(m[1], 10);
        const text = m[2].replace(/<[^>]+>/g, '');
        const id = `heading-${i}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
        return { level, text, id };
    });
}

// inject ids into heading tags so the TOC can link to them
function addHeadingIds(html: string, headings: ReturnType<typeof extractHeadings>) {
    let i = 0;
    return html.replace(/<h([23])([^>]*)>(.*?)<\/h[23]>/gi, (full, level, attrs, inner) => {
        const heading = headings[i];
        i++;
        if (!heading) return full;
        return `<h${level}${attrs} id="${heading.id}">${inner}</h${level}>`;
    });
}

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
    const { slug } = await params;

    const post = await prisma.blogPost.findUnique({
        where: { slug, status: 'PUBLISHED' },
    });

    if (!post) {
        return createMetadata({
            title: 'Post not found',
            description: '',
            slug: `/blog/${slug}`,
        });
    }

    return createMetadata({
        title: post.metaTitle || post.title,
        description: post.metaDescription || post.body?.substring(0, 160) || '',
        slug: `/blog/${post.slug}`,
        ogImage: post.coverImage || undefined, // Use cover image as OG image, or fallback to default
    });
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;

    const post = await prisma.blogPost.findUnique({
        where: { slug, status: 'PUBLISHED' },
    });

    if (!post) {
        notFound();
    }

    const [relatedPosts, allPublished] = await Promise.all([
        prisma.blogPost.findMany({
            where: {
                status: 'PUBLISHED',
                slug: { not: post.slug },
                categories: { hasSome: post.categories || [] },
            },
            orderBy: { publishedAt: 'desc' },
            take: 3,
        }),
        prisma.blogPost.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { publishedAt: 'desc' },
            select: { slug: true, title: true, publishedAt: true },
        }),
    ]);

    const currentIndex = allPublished.findIndex((p) => p.slug === post.slug);
    const prevPost = currentIndex < allPublished.length - 1 ? allPublished[currentIndex + 1] : null;
    const nextPost = currentIndex > 0 ? allPublished[currentIndex - 1] : null;

    const cleanedBody = stripInlineStyles(post.body || '');
    const headings = extractHeadings(cleanedBody);
    const bodyWithIds = addHeadingIds(cleanedBody, headings);
    const readingTime = getReadingTime(post.body || '');

    return (
        <MainLayout>
            <article className="container mx-auto px-6 py-16">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                    <Link href="/" className="hover:text-foreground">Home</Link>
                    <span>/</span>
                    <Link href="/blog" className="hover:text-foreground">Blog</Link>
                    <span>/</span>
                    <span className="text-foreground truncate max-w-[200px]">{post.title}</span>
                </nav>

                {/* Header */}
                <div className="max-w-5xl mx-auto mb-10">
                    {post.categories && post.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-5">
                            {post.categories.map((category) => (
                                <span
                                    key={category}
                                    className="inline-block text-xs font-semibold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-full"
                                >
                                    {category}
                                </span>
                            ))}
                        </div>
                    )}
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-5 leading-tight">
                        {post.title}
                    </h1>
                    {post.metaDescription && (
                        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                            {post.metaDescription}
                        </p>
                    )}

                    {/* Author + meta row */}
                    <div className="flex flex-wrap items-center justify-between gap-4 py-5 border-y border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                                R
                            </div>
                            <div>
                                <div className="text-sm font-medium text-foreground">Rankerly Team</div>
                                <div className="text-xs text-muted-foreground">
                                    {formatDate(post.publishedAt)} · {readingTime}
                                </div>
                            </div>
                        </div>

                        {/* Share */}
                        <ShareButtons title={post.title} />
                    </div>
                </div>

                {/* Cover Image */}
                {post.coverImage && (
                    <div className="max-w-5xl mx-auto mb-12 rounded-2xl overflow-hidden border border-border bg-muted">
                        <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-auto object-cover"
                        />
                    </div>
                )}

                {/* Body + TOC layout */}
                <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_240px] gap-12">
                    <div className="max-w-3xl">
                        <div
                            className="prose prose-neutral max-w-none
                prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-24
                prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-muted-foreground prose-p:leading-relaxed
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-foreground
                prose-blockquote:border-l-primary prose-blockquote:text-foreground
                prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-muted prose-pre:border prose-pre:border-border
                prose-img:rounded-xl prose-img:border prose-img:border-border
                prose-li:text-muted-foreground
                prose-hr:border-border"
                            dangerouslySetInnerHTML={{ __html: bodyWithIds }}
                        />

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-border">
                                {post.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Author bio card */}
                        <div className="mt-12 rounded-2xl border border-border bg-card p-6 flex items-start gap-4">
                            <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                                R
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-foreground mb-1">Written by the Rankerly Team</div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    We help local businesses improve their visibility across Google Maps, search, and AI answers — one practical guide at a time.
                                </p>
                            </div>
                        </div>

                        {/* Prev / Next navigation */}
                        <div className="grid sm:grid-cols-2 gap-4 mt-10">
                            {prevPost ? (
                                <Link
                                    href={`/blog/${prevPost.slug}`}
                                    className="rounded-2xl border border-border bg-card p-5 flex flex-col"
                                >
                                    <span className="text-xs text-muted-foreground mb-1.5">← Previous</span>
                                    <span className="text-sm font-medium text-foreground line-clamp-2">{prevPost.title}</span>
                                </Link>
                            ) : (
                                <div />
                            )}
                            {nextPost && (
                                <Link
                                    href={`/blog/${nextPost.slug}`}
                                    className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:items-end sm:text-right"
                                >
                                    <span className="text-xs text-muted-foreground mb-1.5">Next →</span>
                                    <span className="text-sm font-medium text-foreground line-clamp-2">{nextPost.title}</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Sticky table of contents */}
                    {headings.length > 0 && (
                        <aside className="hidden lg:block">
                            <div className="sticky top-24">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                                    On this page
                                </div>
                                <ul className="space-y-2.5 border-l border-border">
                                    {headings.map((heading) => (
                                        <li
                                            key={heading.id}
                                            style={{ paddingLeft: heading.level === 3 ? '1.5rem' : '1rem' }}
                                        >
                                            <a
                                                href={`#${heading.id}`}
                                                className="text-sm text-muted-foreground hover:text-foreground transition-colors -ml-px border-l border-transparent hover:border-primary pl-3 block leading-snug"
                                            >
                                                {heading.text}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </aside>
                    )}
                </div>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="max-w-5xl mx-auto mt-20 pt-12 border-t border-border">
                        <h2 className="text-xl font-bold text-foreground mb-6">Related Posts</h2>
                        <div className="grid sm:grid-cols-3 gap-6">
                            {relatedPosts.map((related) => (
                                <Link
                                    href={`/blog/${related.slug}`}
                                    key={related.id}
                                    className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col"
                                >
                                    {related.coverImage ? (
                                        <div className="relative h-32 overflow-hidden bg-muted">
                                            <img
                                                src={related.coverImage}
                                                alt={related.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-32 bg-gradient-to-br from-primary/5 via-muted to-background" />
                                    )}
                                    <div className="p-4">
                                        <div className="text-xs text-muted-foreground mb-1.5">
                                            {formatDate(related.publishedAt)}
                                        </div>
                                        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                                            {related.title}
                                        </h3>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </article>
        </MainLayout>
    );
}