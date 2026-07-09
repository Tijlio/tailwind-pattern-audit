import clsx from "clsx";

export function FeatureCard({ selected = false }: { selected?: boolean }) {
  return (
    <article
      className={clsx(
        ["rounded-md", "border", "bg-white"],
        { "p-4 text-sm": selected },
        "shadow-sm",
      )}
    >
      <h3 className="text-sm font-medium text-slate-950">Insight card</h3>
      <p className="text-sm text-slate-600">Reusable project card.</p>
    </article>
  );
}

export function CompactFeatureCard() {
  return (
    <article className={clsx("shadow-sm text-sm p-4 bg-white border rounded-md")}>
      Compact duplicate.
    </article>
  );
}
