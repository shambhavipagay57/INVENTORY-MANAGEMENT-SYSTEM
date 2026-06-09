import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Download, Search } from "lucide-react";
import { downloadCSV, fetchMovements, toCSV } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Stock History — Stockwise" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const mv = useQuery({ queryKey: ["movements"], queryFn: () => fetchMovements(500) });
  const [q, setQ] = useState("");
  const [type, setType] = useState<"ALL" | "IN" | "OUT">("ALL");

  const filtered = useMemo(() => {
    return (mv.data ?? []).filter((m) => {
      if (type !== "ALL" && m.movement_type !== type) return false;
      if (q && !(m.product?.name?.toLowerCase().includes(q.toLowerCase()) || m.product?.sku?.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [mv.data, q, type]);

  function exportCSV() {
    const rows = filtered.map((m) => ({
      timestamp: m.created_at, type: m.movement_type, product: m.product?.name ?? "", sku: m.product?.sku ?? "",
      quantity: m.quantity, balance_after: m.balance_after, reason: m.reason ?? "",
    }));
    downloadCSV(`stock-history-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock history</h1>
          <p className="text-sm text-muted-foreground">Immutable timeline of every inventory movement.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="surface flex flex-wrap items-center gap-3 rounded-xl p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search product or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Tabs value={type} onValueChange={(v) => setType(v as "ALL" | "IN" | "OUT")}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="IN">Inbound</TabsTrigger>
            <TabsTrigger value="OUT">Outbound</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="surface rounded-xl">
        <ol className="relative divide-y divide-border/60">
          {filtered.map((m) => (
            <li key={m.id} className="flex items-center gap-4 p-4">
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${m.movement_type === "IN" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {m.movement_type === "IN" ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{m.product?.name ?? "—"}</p>
                  <Badge variant="outline" className="font-mono text-[10px]">{m.product?.sku}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{m.reason || "Manual adjustment"} · {format(new Date(m.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
              <div className="text-right">
                <div className={`font-mono ${m.movement_type === "IN" ? "text-success" : "text-destructive"}`}>
                  {m.movement_type === "IN" ? "+" : "−"}{m.quantity}
                </div>
                <div className="text-xs text-muted-foreground">balance {m.balance_after}</div>
              </div>
            </li>
          ))}
          {!mv.isLoading && filtered.length === 0 && (
            <li className="p-16 text-center text-sm text-muted-foreground">No movements match your filters.</li>
          )}
          {mv.isLoading && Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="p-4"><div className="h-8 animate-pulse rounded bg-muted/40" /></li>
          ))}
        </ol>
      </div>
    </div>
  );
}
