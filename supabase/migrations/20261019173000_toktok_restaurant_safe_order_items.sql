CREATE TABLE IF NOT EXISTS public.toktok_restaurant_order_item_feed (
  id uuid PRIMARY KEY REFERENCES public.toktok_order_items(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.toktok_orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.toktok_stores(id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  options_snapshot jsonb,
  notes text,
  line_total numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.toktok_restaurant_order_item_feed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.toktok_restaurant_order_item_feed FROM anon, authenticated;
GRANT SELECT ON public.toktok_restaurant_order_item_feed TO authenticated;
DROP POLICY IF EXISTS toktok_restaurant_order_item_feed_store_read ON public.toktok_restaurant_order_item_feed;
CREATE POLICY toktok_restaurant_order_item_feed_store_read ON public.toktok_restaurant_order_item_feed FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid()) AND p.role='toktok_restaurant'::public.user_role AND p.toktok_store_id=toktok_restaurant_order_item_feed.store_id));
CREATE OR REPLACE FUNCTION public.sync_toktok_restaurant_order_item_feed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_store_id uuid;
BEGIN
  SELECT f.store_id INTO v_store_id FROM public.toktok_restaurant_order_feed f WHERE f.id=NEW.order_id;
  IF v_store_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.toktok_restaurant_order_item_feed (id,order_id,store_id,product_name_snapshot,quantity,unit_price,options_snapshot,notes,line_total)
  VALUES (NEW.id,NEW.order_id,v_store_id,NEW.product_name_snapshot,NEW.quantity,NEW.unit_price,NEW.options_snapshot,NEW.notes,NEW.line_total)
  ON CONFLICT (id) DO UPDATE SET order_id=EXCLUDED.order_id,store_id=EXCLUDED.store_id,product_name_snapshot=EXCLUDED.product_name_snapshot,quantity=EXCLUDED.quantity,unit_price=EXCLUDED.unit_price,options_snapshot=EXCLUDED.options_snapshot,notes=EXCLUDED.notes,line_total=EXCLUDED.line_total;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_toktok_restaurant_order_item_feed() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_toktok_restaurant_order_item_feed ON public.toktok_order_items;
CREATE TRIGGER sync_toktok_restaurant_order_item_feed AFTER INSERT OR UPDATE ON public.toktok_order_items FOR EACH ROW EXECUTE FUNCTION public.sync_toktok_restaurant_order_item_feed();
INSERT INTO public.toktok_restaurant_order_item_feed (id,order_id,store_id,product_name_snapshot,quantity,unit_price,options_snapshot,notes,line_total)
SELECT i.id,i.order_id,f.store_id,i.product_name_snapshot,i.quantity,i.unit_price,i.options_snapshot,i.notes,i.line_total
FROM public.toktok_order_items i JOIN public.toktok_restaurant_order_feed f ON f.id=i.order_id
ON CONFLICT (id) DO UPDATE SET order_id=EXCLUDED.order_id,store_id=EXCLUDED.store_id,product_name_snapshot=EXCLUDED.product_name_snapshot,quantity=EXCLUDED.quantity,unit_price=EXCLUDED.unit_price,options_snapshot=EXCLUDED.options_snapshot,notes=EXCLUDED.notes,line_total=EXCLUDED.line_total;
DROP POLICY IF EXISTS toktok_order_items_store_staff_select ON public.toktok_order_items;
