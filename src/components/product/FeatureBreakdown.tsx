interface FeatureItem {
  title: string;
  desc: string;
  icon?: React.ReactNode;
}

export default function FeatureBreakdown({
  items,
}: {
  items: FeatureItem[];
}) {
  return (
   <section className="grid gap-5 md:grid-cols-2 mt-8">
  {items.map((item, i) => (
    <div
      key={i}
      className="h-full rounded-2xl border border-gray-200 bg-card p-6"
    >
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold">
          {(i + 1).toString().padStart(2, "0")}
        </div>

        <h3 className="text-lg font-semibold">
          {item.title}
        </h3>
      </div>

      <p className="text-muted-foreground leading-6">
        {item.desc}
      </p>
    </div>
  ))}
</section>
  );
}