import { slugify } from "@/lib/utils";
import { prisma } from "../../../../lib/prisma";
import { requireAccess } from "../../../../lib/require-access";
import { uploadToImageKit } from "../../../../lib/imagekit";

export async function GET() {
    const posts = await prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            metaDescription: true,
            publishedAt: true,
        },
    });
    return Response.json(posts);
}

export async function POST(req: Request) {
    const { error, user } = await requireAccess("access_admin_dashboard");
    if (error) return error;

    const formData = await req.formData();

    const title = formData.get("title") as string;
    const body = formData.get("body") as string;
    const metaTitle = formData.get("metaTitle") as string | null;
    const metaDescription = formData.get("metaDescription") as string | null;
    const metaKeywords = formData.get("metaKeywords") as string | null;
    const categories = JSON.parse((formData.get("categories") as string) || "[]");
    const tags = JSON.parse((formData.get("tags") as string) || "[]");
    const coverFile = formData.get("coverImage") as File | null;

    // Upload cover image if provided
    let coverImage: string | null = null;

    if (coverFile) {
        const buffer = Buffer.from(await coverFile.arrayBuffer());
        coverImage = await uploadToImageKit(buffer, coverFile.name);
    }

    const post = await prisma.blogPost.create({
        data: {
            title,
            body,
            slug: slugify(title),
            coverImage,
            metaTitle,
            metaDescription,
            metaKeywords,
            categories,
            tags,
            authorId: user.id,
        },
    });

    return Response.json(post, { status: 201 });
}