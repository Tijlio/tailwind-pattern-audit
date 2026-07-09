import { FeatureCard } from "../components/feature-card";
import { buttonVariants } from "../components/ui/button";

export default function Page() {
  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-6 py-10">
      <a className="font-medium text-sm py-2 px-4 inline-flex rounded-md items-center" href="/">
        Dashboard
      </a>
      <button className={buttonVariants({ intent: "primary" })}>Create report</button>
      <section className="grid gap-1 rounded-md border bg-white p-4">
        <h2 className="text-sm font-medium text-slate-950">Duplicate section</h2>
        <p className="text-sm text-slate-600">First repeated JSX wrapper.</p>
      </section>
      <section className="bg-white p-4 grid border rounded-md gap-1">
        <h2 className="text-sm font-medium text-slate-950">Duplicate section</h2>
        <p className="text-sm text-slate-600">Second repeated JSX wrapper.</p>
      </section>
      <FeatureCard selected />
      <FeatureCard />
    </main>
  );
}
