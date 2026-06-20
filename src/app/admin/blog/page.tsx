import PageHeader from "@/components/admin/page-header";
import BlogListPage from "@/components/blog/blog-list";

export default async function page() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Blog Posts"
                description="Manage, publish, and organize your blog content."
            />
            <BlogListPage />
        </div>
    );
}