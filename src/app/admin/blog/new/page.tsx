import { PostForm } from "@/components/blog/post-form";

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New post</h1>
      <PostForm />
    </div>
  );
}