import Link from "next/link";

export default function FeatureCTA({ title = "Ready to get started?" }: { title?: string }) {
  return (
    <section className="rounded-2xl bg-primary/10 border border-primary/20 p-10 text-center my-16">
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      <p className="text-muted-foreground mb-6">
        Start managing your Google Business Profile locations today.
      </p>
      <Link href="/signup" className="btn btn-primary">
        Start Free Trial
      </Link>
    </section>
  );
}