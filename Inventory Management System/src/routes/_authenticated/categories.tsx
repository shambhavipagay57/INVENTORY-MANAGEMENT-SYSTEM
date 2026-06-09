import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({ meta: [{ title: "Categories — Stockwise" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const prods = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const productCount = (id: string) => (prods.data ?? []).filter((p) => p.category_id === id).length;
  const valueOf = (id: string) =>
    (prods.data ?? []).filter((p) => p.category_id === id).reduce((s, p) => s + Number(p.price) * p.quantity, 0);

  const createMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("categories").insert({ owner_id: u.user.id, name: name.trim(), slug });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created");
      setCreating(false); setName("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Category deleted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">Organize products and surface category analytics.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> New category</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(cats.data ?? []).map((c) => (
          <div key={c.id} className="surface group rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium tracking-tight">{c.name}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => { if (confirm(`Delete category "${c.name}"? Products are kept but uncategorized.`)) delMut.mutate(c.id); }}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{c.slug}</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold tracking-tight">{productCount(c.id)}</div>
                <div className="text-[11px] text-muted-foreground">products</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">₹{Math.round(valueOf(c.id)).toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-muted-foreground">stock value</div>
              </div>
            </div>
          </div>
        ))}
        {(cats.data ?? []).length === 0 && !cats.isLoading && (
          <div className="surface col-span-full rounded-xl p-10 text-center text-sm text-muted-foreground">
            No categories yet. Create one to start organizing products.
          </div>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>Give it a clear name — slug is generated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Laptops" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!name.trim() || createMut.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
