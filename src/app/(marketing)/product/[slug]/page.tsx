import { notFound } from "next/navigation";
import { siteConfig, getProductBySlug, getSlug } from "@/config/site"; // adjust path to wherever siteConfig lives
import MockupDisplay from "@/components/MockupDisplay";
import MainLayout from "@/app/layouts/MainLayout";

export function generateStaticParams() {
    return siteConfig.products.map((p) => ({ slug: getSlug(p) }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const product = getProductBySlug(params.slug);
    if (!product) return {};
    return {
        title: `${product.title} | ${siteConfig.name}`,
        description: product.desc,
    };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
    const product = getProductBySlug(params.slug);
    if (!product) return notFound();

    const Icon = product.icon;

    let Content: React.ComponentType | null = null;
    try {
        Content = (await import(`@/content/products/${params.slug}.mdx`)).default;
    } catch {
        Content = null;
    }

    return (
        <MainLayout>
            <main>
                <div className="container">
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-16 mx-auto lg:py-14 py-12">
                        <div>
                            <Icon className="w-10 h-10 mb-4 text-primary" />
                            <h1 className="text-5xl font-bold mb-3">{product.title}</h1>
                            <p className="text-muted-foreground text-lg">{product.longDesc}</p>
                        </div>
                        <MockupDisplay
                            feature={{ id: params.slug, slug: params.slug, label: product.title }}
                        />
                    </div>
                </div>


                {Content && (
                    <article className="prose prose-neutral dark:prose-invert max-w-none
  prose-headings:font-semibold
  prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
  prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-2
  prose-p:text-muted-foreground prose-p:leading-relaxed
  prose-img:rounded-xl prose-img:border prose-img:border-border
  prose-li:text-muted-foreground
">
                        <Content />
                    </article>
                )}
            </main>
        </MainLayout>
    );
}