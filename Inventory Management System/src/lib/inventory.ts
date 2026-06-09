import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  sku: string;
  description: string | null;
  image_url: string | null;
  price: number;
  quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  category?: Category | null;
};

export type Movement = {
  id: string;
  product_id: string;
  movement_type: "IN" | "OUT";
  quantity: number;
  reason: string | null;
  balance_after: number;
  created_at: string;
  product?: Pick<Product, "id" | "name" | "sku"> | null;
};

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(id,name,slug,created_at)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchMovements(limit = 200): Promise<Movement[]> {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, product:products(id,name,sku)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Movement[];
}

export async function adjustStock(opts: {
  productId: string;
  type: "IN" | "OUT";
  quantity: number;
  reason?: string;
}) {
  const { error } = await supabase.rpc("adjust_stock", {
    p_product_id: opts.productId,
    p_type: opts.type,
    p_quantity: opts.quantity,
    p_reason: opts.reason ?? "",
  });
  if (error) throw error;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function seedSampleData(userId: string) {
  const categories = [
    "Laptops", "Smartphones", "Accessories", "Audio Devices",
    "Gaming", "Networking", "Storage Devices", "Smart Home",
  ];
  const catRows = categories.map((name) => ({ owner_id: userId, name, slug: slugify(name) }));
  const { data: cats, error: cErr } = await supabase
    .from("categories")
    .upsert(catRows, { onConflict: "owner_id,slug" })
    .select();
  if (cErr) throw cErr;
  const byName = new Map(cats!.map((c) => [c.name, c.id]));

  const products: Array<{
    name: string; sku: string; cat: string; price: number; qty: number; threshold: number; desc: string;
  }> = [
    { name: "MacBook Air M3 13\"", sku: "APL-MBA-M3-13", cat: "Laptops", price: 1299, qty: 24, threshold: 5, desc: "Apple Silicon, 16GB / 512GB" },
    { name: "Dell XPS 15 OLED", sku: "DEL-XPS-15-OLED", cat: "Laptops", price: 2199, qty: 8, threshold: 5, desc: "Intel Core Ultra, RTX 4060" },
    { name: "ThinkPad X1 Carbon Gen 12", sku: "LEN-X1C-G12", cat: "Laptops", price: 1899, qty: 3, threshold: 5, desc: "Business ultrabook" },
    { name: "iPhone 16 Pro 256GB", sku: "APL-IP16P-256", cat: "Smartphones", price: 1099, qty: 42, threshold: 10, desc: "Titanium, A18 Pro" },
    { name: "Samsung Galaxy S26 Ultra", sku: "SAM-S26U-512", cat: "Smartphones", price: 1399, qty: 15, threshold: 10, desc: "512GB, Snapdragon" },
    { name: "Google Pixel 10 Pro", sku: "GOO-PX10P-128", cat: "Smartphones", price: 999, qty: 0, threshold: 8, desc: "Tensor G5" },
    { name: "AirPods Pro 3", sku: "APL-APP3", cat: "Audio Devices", price: 249, qty: 67, threshold: 20, desc: "ANC, USB-C" },
    { name: "Sony WH-1000XM6", sku: "SNY-WH1000XM6", cat: "Audio Devices", price: 449, qty: 12, threshold: 10, desc: "Industry-leading ANC" },
    { name: "Bose QuietComfort Ultra", sku: "BOS-QCU", cat: "Audio Devices", price: 429, qty: 4, threshold: 8, desc: "Immersive audio" },
    { name: "USB-C 100W Charger", sku: "ACC-USBC-100W", cat: "Accessories", price: 39, qty: 180, threshold: 50, desc: "GaN, 3-port" },
    { name: "Thunderbolt 4 Dock", sku: "ACC-TB4-DOCK", cat: "Accessories", price: 299, qty: 22, threshold: 10, desc: "14-in-1" },
    { name: "PlayStation 6 Console", sku: "SNY-PS6", cat: "Gaming", price: 599, qty: 6, threshold: 10, desc: "Pre-order stock" },
    { name: "NVIDIA RTX 6090 GPU", sku: "NVD-RTX6090", cat: "Gaming", price: 1999, qty: 2, threshold: 5, desc: "Flagship GPU" },
    { name: "Xbox Series X Pro", sku: "MSX-XSXP", cat: "Gaming", price: 549, qty: 11, threshold: 8, desc: "Next-gen console" },
    { name: "TP-Link Archer AXE300", sku: "TPL-AXE300", cat: "Networking", price: 399, qty: 18, threshold: 8, desc: "Wi-Fi 7 router" },
    { name: "Ubiquiti Dream Router 7", sku: "UBQ-UDR7", cat: "Networking", price: 279, qty: 9, threshold: 6, desc: "Wi-Fi 7, UniFi" },
    { name: "Samsung T9 Portable SSD 2TB", sku: "SAM-T9-2TB", cat: "Storage Devices", price: 219, qty: 33, threshold: 15, desc: "USB 3.2 Gen 2x2" },
    { name: "WD Black SN850X 4TB", sku: "WDC-SN850X-4TB", cat: "Storage Devices", price: 329, qty: 14, threshold: 8, desc: "PCIe 4.0 NVMe" },
    { name: "Philips Hue Starter Kit", sku: "PHI-HUE-START", cat: "Smart Home", price: 199, qty: 27, threshold: 12, desc: "Color, hub included" },
    { name: "Nest Learning Thermostat 4", sku: "GOO-NEST-4", cat: "Smart Home", price: 279, qty: 1, threshold: 5, desc: "Smart climate control" },
  ];

  const rows = products.map((p) => ({
    owner_id: userId,
    category_id: byName.get(p.cat) ?? null,
    name: p.name,
    sku: p.sku,
    description: p.desc,
    price: p.price,
    quantity: p.qty,
    low_stock_threshold: p.threshold,
  }));
  const { data: inserted, error: pErr } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "owner_id,sku" })
    .select();
  if (pErr) throw pErr;

  // Seed a few historical movements (insert directly — RLS allows owner)
  const movements: Array<{
    owner_id: string; product_id: string; movement_type: "IN" | "OUT"; quantity: number; reason: string; balance_after: number; created_at: string;
  }> = [];
  const now = Date.now();
  for (const p of inserted!.slice(0, 12)) {
    const days = 14;
    let balance = p.quantity;
    for (let i = 0; i < 5; i++) {
      const isIn = Math.random() > 0.55;
      const qty = Math.max(1, Math.floor(Math.random() * 8));
      const delta = isIn ? qty : -Math.min(qty, balance);
      balance += delta;
      movements.push({
        owner_id: userId,
        product_id: p.id,
        movement_type: delta >= 0 ? "IN" : "OUT",
        quantity: Math.abs(delta) || 1,
        reason: isIn ? "Supplier delivery" : "Customer purchase",
        balance_after: Math.max(0, balance),
        created_at: new Date(now - Math.floor(Math.random() * days) * 86400000).toISOString(),
      });
    }
  }
  if (movements.length) {
    await supabase.from("stock_movements").insert(movements);
  }
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
