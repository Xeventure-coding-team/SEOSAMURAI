import { notFound } from "next/navigation";
import { PostForm } from "@/components/blog/post-form";
import { prisma } from "../../../../../lib/prisma";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit post</h1>
      <PostForm initialData={post} />
    </div>
  );
}