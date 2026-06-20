import { slugify } from "@/lib/utils";
import { uploadToImageKit } from "../../../../../lib/imagekit";
import { prisma } from "../../../../../lib/prisma";
import { requireAccess } from "../../../../../lib/require-access";


type Params = { params: { id: string } };

// GET — single post
export async function GET(_: Request, { params }: Params) {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(post);
}

// PATCH — edit post
export async function PATCH(req: Request, { params }: Params) {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  const formData = await req.formData();

  const title           = formData.get("title") as string | null;
  const body            = formData.get("body") as string | null;
  const metaTitle       = formData.get("metaTitle") as string | null;
  const metaDescription = formData.get("metaDescription") as string | null;
  const metaKeywords    = formData.get("metaKeywords") as string | null;
  const categories      = formData.get("categories") ? JSON.parse(formData.get("categories") as string) : undefined;
  const tags            = formData.get("tags") ? JSON.parse(formData.get("tags") as string) : undefined;
  const coverFile       = formData.get("coverImage") as File | null;

  let coverImage: string | undefined;
  if (coverFile) {
    const buffer = Buffer.from(await coverFile.arrayBuffer());
    coverImage = await uploadToImageKit(buffer, coverFile.name);
  }

  const post = await prisma.blogPost.update({
    where: { id: params.id },
    data: {
      ...(title           && { title, slug: slugify(title) }),
      ...(body            && { body }),
      ...(metaTitle       && { metaTitle }),
      ...(metaDescription && { metaDescription }),
      ...(metaKeywords    && { metaKeywords }),
      ...(categories      && { categories }),
      ...(tags            && { tags }),
      ...(coverImage      && { coverImage }),
    },
  });

  return Response.json(post);
}

// DELETE — remove post
export async function DELETE(_: Request, { params }: Params) {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  await prisma.blogPost.delete({ where: { id: params.id } });
  return Response.json({ success: true });
}

// PUT — publish post
export async function PUT(_: Request, { params }: Params) {
  const { error } = await requireAccess("access_admin_dashboard");
  if (error) return error;

  const post = await prisma.blogPost.update({
    where: { id: params.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  return Response.json(post);
}