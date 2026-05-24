type PlaceholderPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  items: string[];
};

export function PlaceholderPage({ title, eyebrow, description, items }: PlaceholderPageProps) {
  return (
    <section className="space-y-6">
      <div className="border-b border-zinc-200 pb-5">
        <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div key={item} className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm font-medium text-ink-950">{item}</p>
            <p className="mt-2 text-sm leading-6 text-ink-500">Placeholder for a later MVP issue.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
