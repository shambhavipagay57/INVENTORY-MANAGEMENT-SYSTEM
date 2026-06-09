import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Download,
  Layers,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stockwise — Inventory OS for modern retail" },
      { name: "description", content: "Real-time stock tracking, movement history, low-stock alerts, and analytics. Built for teams that move." },
      { property: "og:title", content: "Stockwise — Inventory OS" },
      { property: "og:description", content: "Real-time stock tracking, movement history, low-stock alerts, and analytics." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Stockwise</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/auth" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/auth"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden px-6 py-24 md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.66_0.21_290/0.22),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Built for fast-moving inventory teams
            </span>
          </div>

          <h1 className="mb-8 text-5xl font-semibold leading-[0.95] tracking-tighter md:text-7xl">
            Inventory operations,
            <br />
            <span className="bg-gradient-to-r from-primary to-[oklch(0.65_0.22_330)] bg-clip-text text-transparent">
              finally clean.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Track every unit. Audit every movement. Catch low stock before it costs you. Stockwise is the
            inventory OS your team wishes they had.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 sm:w-auto"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              className="w-full rounded-md border border-border bg-card/60 px-6 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent sm:w-auto"
            >
              View live demo
            </Link>
          </div>
        </div>
      </header>

      {/* Bento Feature Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-32">
        <div className="grid auto-rows-[180px] grid-cols-1 gap-4 md:grid-cols-6">
          {/* Live analytics — hero tile */}
          <div className="group surface relative overflow-hidden rounded-2xl p-8 md:col-span-4 md:row-span-2">
            <div className="absolute right-0 top-0 p-8">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
            <div className="flex h-full flex-col justify-end">
              <h3 className="mb-2 text-2xl font-semibold">Live analytics</h3>
              <p className="max-w-sm text-muted-foreground">
                Inventory value, stock velocity, category mix — updated as it happens with zero latency.
              </p>
            </div>
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
          </div>

          {/* Immutable — tall */}
          <div className="surface rounded-2xl p-8 md:col-span-2 md:row-span-3">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">Immutable movements</h3>
            <p className="text-muted-foreground">
              Every IN and OUT is logged with reason codes, balance verification, and a timestamp that
              cannot be altered.
            </p>
          </div>

          {/* Guardrails */}
          <div className="surface rounded-2xl p-8 md:col-span-2 md:row-span-2">
            <div className="mb-6 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Low-stock guardrails</h3>
            <p className="text-sm text-muted-foreground">
              Per-product thresholds with surfaced warnings on the dashboard and instant alerts.
            </p>
          </div>

          {/* Atomic */}
          <div className="surface rounded-2xl p-8 md:col-span-2 md:row-span-2">
            <div className="mb-6 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Atomic adjustments</h3>
            <p className="text-sm text-muted-foreground">
              Stock can only change through audited transactions. No silent edits, no manual mistakes.
            </p>
          </div>

          {/* Export */}
          <div className="surface flex items-center gap-5 rounded-2xl p-6 md:col-span-3 md:row-span-1">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Export anywhere</h3>
              <p className="text-sm text-muted-foreground">One-click CSV exports for any filtered slice.</p>
            </div>
          </div>

          {/* Categories */}
          <div className="surface flex items-center gap-5 rounded-2xl p-6 md:col-span-3 md:row-span-1">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Categories & search</h3>
              <p className="text-sm text-muted-foreground">Filter by category, health, or fuzzy SKU lookup.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-border/60 px-8 py-8 md:flex-row">
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Stockwise</div>
        <div className="flex items-center gap-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Crafted for operators
          </span>
          <div className="flex gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <div className="h-1.5 w-1.5 rounded-full bg-muted" />
            <div className="h-1.5 w-1.5 rounded-full bg-muted" />
          </div>
        </div>
      </footer>
    </div>
  );
}
