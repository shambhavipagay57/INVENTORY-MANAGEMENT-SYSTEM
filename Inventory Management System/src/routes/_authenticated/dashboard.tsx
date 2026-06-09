import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, IndianRupee,
  Package, TrendingUp,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fetchCategories, fetchMovements, fetchProducts } from "@/lib/inventory";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Stockwise" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const movements = useQuery({ queryKey: ["movements"], queryFn: () => fetchMovements(50) });

  const stats = useMemo(() => {
    const items = products.data ?? [];
    const totalValue = items.reduce((s, p) => s + Number(p.price) * p.quantity, 0);
    const lowStock = items.filter((p) => p.quantity > 0 && p.quantity <= p.low_stock_threshold);
    const outStock = items.filter((p) => p.quantity === 0);
    const healthy = items.length - lowStock.length - outStock.length;
    const healthScore = items.length ? Math.round((healthy / items.length) * 100) : 100;
    return {
      totalProducts: items.length,
      totalValue,
      lowStockCount: lowStock.length,
      outStockCount: outStock.length,
      healthScore,
      lowStock,
    };
  }, [products.data]);

  const categoryChart = useMemo(() => {
    const map = new Map<string, { name: string; count: number; value: number }>();
    (products.data ?? []).forEach((p) => {
      const name = p.category?.name ?? "Uncategorized";
      const e = map.get(name) ?? { name, count: 0, value: 0 };
      e.count += 1;
      e.value += Number(p.price) * p.quantity;
      map.set(name, e);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [products.data]);

  const movementChart = useMemo(() => {
    const buckets = new Map<string, { day: string; IN: number; OUT: number }>();
    const days = 14;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10);
      buckets.set(key, { day: key, IN: 0, OUT: 0 });
    }
    (movements.data ?? []).forEach((m) => {
      const key = m.created_at.slice(5, 10);
      const b = buckets.get(key);
      if (b) b[m.movement_type] += m.quantity;
    });
    return Array.from(buckets.values());
  }, [movements.data]);

  const chartColors = ["oklch(0.66 0.21 290)", "oklch(0.7 0.16 200)", "oklch(0.78 0.16 75)", "oklch(0.7 0.16 155)", "oklch(0.65 0.2 340)", "oklch(0.7 0.18 30)", "oklch(0.65 0.18 250)", "oklch(0.72 0.14 130)"];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Inventory health at a glance.</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Package} label="Total products" value={stats.totalProducts.toLocaleString()} delta="+all SKUs tracked" tone="default" />
        <KpiCard icon={IndianRupee} label="Inventory value" value={`₹${stats.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} delta="Live valuation" tone="default" />
        <KpiCard icon={AlertTriangle} label="Low stock" value={stats.lowStockCount.toString()} delta="Below threshold" tone="warning" />
        <KpiCard icon={Boxes} label="Out of stock" value={stats.outStockCount.toString()} delta="Restock needed" tone={stats.outStockCount > 0 ? "destructive" : "default"} />
      </div>

      {/* Health score + charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface rounded-xl p-5 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Inventory health</h3>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight">{stats.healthScore}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <Progress value={stats.healthScore} className="mt-4" />
          <p className="mt-3 text-xs text-muted-foreground">
            Score reflects share of SKUs with healthy stock above their threshold.
          </p>
        </div>

        <div className="surface rounded-xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Stock movement — last 14 days</h3>
            <span className="text-xs text-muted-foreground">IN vs OUT</span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movementChart} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.008 270)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "oklch(0.66 0.01 270)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.66 0.01 270)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.006 270)", border: "1px solid oklch(0.26 0.008 270)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="IN" fill="oklch(0.7 0.16 155)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="OUT" fill="oklch(0.62 0.22 25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface rounded-xl p-5 lg:col-span-1">
          <h3 className="text-sm font-medium text-muted-foreground">Category mix (by value)</h3>
          <div className="mt-3 h-[240px]">
            {categoryChart.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {categoryChart.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.006 270)", border: "1px solid oklch(0.26 0.008 270)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 space-y-1.5">
            {categoryChart.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                  <span className="text-muted-foreground">{c.name}</span>
                </div>
                <span className="font-mono">₹{Math.round(c.value).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface rounded-xl p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Recent activity</h3>
            <Badge variant="outline" className="text-xs">{movements.data?.length ?? 0}</Badge>
          </div>
          <div className="divide-y divide-border/60">
            {(movements.data ?? []).slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <div className={`grid h-7 w-7 place-items-center rounded-md ${m.movement_type === "IN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {m.movement_type === "IN" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{m.product?.name ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{m.reason || "Manual adjustment"} · {formatDistanceToNow(new Date(m.created_at))} ago</p>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm ${m.movement_type === "IN" ? "text-success" : "text-destructive"}`}>
                    {m.movement_type === "IN" ? "+" : "−"}{m.quantity}
                  </div>
                  <div className="text-[11px] text-muted-foreground">bal {m.balance_after}</div>
                </div>
              </div>
            ))}
            {(movements.data ?? []).length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">No movements yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Low stock alerts */}
      {stats.lowStock.length > 0 && (
        <div className="surface rounded-xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-medium">Low stock alerts</h3>
            <Badge variant="outline" className="text-xs">{stats.lowStock.length}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.lowStock.slice(0, 6).map((p) => (
              <div key={p.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <Badge variant="outline" className="border-warning/50 text-warning">{p.quantity} left</Badge>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{p.sku}</p>
                <Progress value={(p.quantity / Math.max(p.low_stock_threshold, 1)) * 100} className="mt-2 h-1" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, delta, tone,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; delta: string; tone: "default" | "warning" | "destructive" }) {
  const toneCls = tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="surface rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{delta}</p>
    </div>
  );
}
