import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, MoreHorizontal, Plus, Search, ArrowDownUp } from "lucide-react";
import { adjustStock, downloadCSV, fetchCategories, fetchProducts, toCSV, type Product } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — Stockwise" }] }),
  component: ProductsPage,
});

type StockFilter = "all" | "in" | "low" | "out";

function ProductsPage() {
  const qc = useQueryClient();
  const productsQ = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [adjusting, setAdjusting] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const items = productsQ.data ?? [];
    return items.filter((p) => {
      if (q && !(p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()))) return false;
      if (cat !== "all" && p.category_id !== cat) return false;
      if (stock === "out" && p.quantity !== 0) return false;
      if (stock === "low" && !(p.quantity > 0 && p.quantity <= p.low_stock_threshold)) return false;
      if (stock === "in" && !(p.quantity > p.low_stock_threshold)) return false;
      return true;
    });
  }, [productsQ.data, q, cat, stock]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product deleted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  function exportCSV() {
    const rows = filtered.map((p) => ({
      sku: p.sku, name: p.name, category: p.category?.name ?? "",
      price: p.price, quantity: p.quantity, low_stock_threshold: p.low_stock_threshold,
      value: Number(p.price) * p.quantity, updated_at: p.updated_at,
    }));
    downloadCSV(`products-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Manage inventory items and stock levels.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> New product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="surface flex flex-wrap items-center gap-3 rounded-xl p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(catsQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={stock} onValueChange={(v) => setStock(v as StockFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="in">Healthy</TabsTrigger>
            <TabsTrigger value="low">Low</TabsTrigger>
            <TabsTrigger value="out">Out</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="surface overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsQ.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><div className="h-6 animate-pulse rounded bg-muted/40" /></TableCell></TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                No products match your filters. Try clearing them or create a new product.
              </TableCell></TableRow>
            ) : filtered.map((p) => {
              const status = p.quantity === 0 ? "out" : p.quantity <= p.low_stock_threshold ? "low" : "in";
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="line-clamp-1 text-xs text-muted-foreground">{p.description}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{p.category?.name ?? "—"}</span></TableCell>
                  <TableCell className="text-right font-mono">₹{Number(p.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-mono">{p.quantity}</TableCell>
                  <TableCell>
                    {status === "out" ? <Badge variant="outline" className="border-destructive/50 text-destructive">Out of stock</Badge>
                      : status === "low" ? <Badge variant="outline" className="border-warning/50 text-warning">Low stock</Badge>
                      : <Badge variant="outline" className="border-success/50 text-success">In stock</Badge>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setAdjusting(p)}>
                          <ArrowDownUp className="mr-2 h-4 w-4" /> Adjust stock
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(p)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => {
                          if (confirm(`Delete "${p.name}"? This also removes its movement history.`)) deleteMut.mutate(p.id);
                        }}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ProductDialog open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} product={editing} categories={catsQ.data ?? []} />
      <AdjustStockDialog open={!!adjusting} onClose={() => setAdjusting(null)} product={adjusting} />
    </div>
  );
}

function ProductDialog({
  open, onClose, product, categories,
}: { open: boolean; onClose: () => void; product: Product | null; categories: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState<string>(product?.category_id ?? "none");
  const [price, setPrice] = useState<string>(product ? String(product.price) : "0");
  const [quantity, setQuantity] = useState<string>(product ? String(product.quantity) : "0");
  const [threshold, setThreshold] = useState<string>(product ? String(product.low_stock_threshold) : "5");
  const [description, setDescription] = useState<string>(product?.description ?? "");

  // reset when product changes
  useMemoReset([product?.id, open], () => {
    setName(product?.name ?? "");
    setSku(product?.sku ?? "");
    setCategoryId(product?.category_id ?? "none");
    setPrice(product ? String(product.price) : "0");
    setQuantity(product ? String(product.quantity) : "0");
    setThreshold(product ? String(product.low_stock_threshold) : "5");
    setDescription(product?.description ?? "");
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const payload = {
        owner_id: u.user.id,
        name: name.trim(),
        sku: sku.trim(),
        category_id: categoryId === "none" ? null : categoryId,
        price: Number(price),
        quantity: Number(quantity),
        low_stock_threshold: Number(threshold),
        description: description.trim() || null,
      };
      if (isEdit && product) {
        // Don't allow quantity edits here — must go through adjust_stock
        const { quantity: _q, ...rest } = payload;
        const { error } = await supabase.from("products").update(rest).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(isEdit ? "Product updated" : "Product created");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Quantity changes happen via Adjust stock to keep history auditable." : "Add a new SKU to your inventory."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantity</Label>
              <Input id="qty" type="number" min="0" step="1" value={quantity} disabled={isEdit} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thr">Low threshold</Label>
              <Input id="thr" type="number" min="0" step="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !name.trim() || !sku.trim()}>
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustStockDialog({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product | null }) {
  const qc = useQueryClient();
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");

  useMemoReset([product?.id, open], () => {
    setType("IN");
    setQty("1");
    setReason("");
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!product) return;
      await adjustStock({ productId: product.id, type, quantity: Number(qty), reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Stock adjusted");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Adjustment failed"),
  });

  const reasonsIn = ["Supplier delivery", "Customer return", "Warehouse adjustment"];
  const reasonsOut = ["Customer purchase", "Damaged", "Lost / shrinkage"];
  const presets = type === "IN" ? reasonsIn : reasonsOut;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{product?.name} · current: <span className="font-mono">{product?.quantity}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as "IN" | "OUT")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="IN">Stock in</TabsTrigger>
              <TabsTrigger value="OUT">Stock out</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-1.5">
            <Label htmlFor="aqty">Quantity</Label>
            <Input id="aqty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" placeholder="e.g. Supplier delivery" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presets.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)}
                  className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        {type === "OUT" && product && Number(qty) > product.quantity && (
          <p className="text-xs text-destructive">Out quantity cannot exceed current stock ({product.quantity}).</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={
              mut.isPending ||
              Number(qty) <= 0 ||
              (type === "OUT" && !!product && Number(qty) > product.quantity)
            }
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// tiny helper to re-run a setter block when deps change
function useMemoReset(deps: unknown[], fn: () => void) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { fn(); }, deps);
}
