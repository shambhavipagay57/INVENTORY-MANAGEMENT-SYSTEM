
-- Deny UPDATE/DELETE on stock_movements (audit log immutability)
CREATE POLICY "no updates on movements" ON public.stock_movements
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "no deletes on movements" ON public.stock_movements
  FOR DELETE TO authenticated USING (false);

-- Switch adjust_stock to SECURITY INVOKER (RLS already scopes products & movements to owner)
CREATE OR REPLACE FUNCTION public.adjust_stock(p_product_id uuid, p_type movement_type, p_quantity integer, p_reason text)
 RETURNS stock_movements
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
$function$;
