
-- ENUM
CREATE TYPE public.movement_type AS ENUM ('IN','OUT');

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, slug)
);
CREATE INDEX ON public.categories(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own categories" ON public.categories FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, sku)
);
CREATE INDEX ON public.products(owner_id);
CREATE INDEX ON public.products(category_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products" ON public.products FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- STOCK MOVEMENTS (immutable history)
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  movement_type public.movement_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.stock_movements(owner_id, created_at DESC);
CREATE INDEX ON public.stock_movements(product_id, created_at DESC);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own movements read" ON public.stock_movements FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);
-- inserts only via function (we still allow direct insert with check for safety)
CREATE POLICY "own movements insert" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Atomic stock adjustment function
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_id UUID,
  p_type public.movement_type,
  p_quantity INTEGER,
  p_reason TEXT
) RETURNS public.stock_movements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner UUID := auth.uid();
  v_product public.products%ROWTYPE;
  v_new_qty INTEGER;
  v_movement public.stock_movements;
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;

  SELECT * INTO v_product FROM public.products
    WHERE id = p_product_id AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;

  IF p_type = 'IN' THEN
    v_new_qty := v_product.quantity + p_quantity;
  ELSE
    v_new_qty := v_product.quantity - p_quantity;
    IF v_new_qty < 0 THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
  END IF;

  UPDATE public.products SET quantity = v_new_qty WHERE id = p_product_id;

  INSERT INTO public.stock_movements(owner_id, product_id, movement_type, quantity, reason, balance_after)
  VALUES (v_owner, p_product_id, p_type, p_quantity, p_reason, v_new_qty)
  RETURNING * INTO v_movement;

  RETURN v_movement;
END;
$$;
GRANT EXECUTE ON FUNCTION public.adjust_stock(UUID, public.movement_type, INTEGER, TEXT) TO authenticated;
