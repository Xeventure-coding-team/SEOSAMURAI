import { prisma } from "../../../../../lib/prisma";
import { requireAccess } from "../../../../../lib/require-access";


export async function GET() {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      coverImage: true,
      metaDescription: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return Response.json(posts);
}