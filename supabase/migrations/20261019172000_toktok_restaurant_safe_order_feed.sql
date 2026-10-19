CREATE TABLE IF NOT EXISTS public.toktok_restaurant_order_feed (
  id uuid PRIMARY KEY REFERENCES public.toktok_orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.toktok_stores(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  order_date date NOT NULL,
  batch_id uuid,
  batch_time_snapshot timestamptz,
  status text NOT NULL,
  payment_status text NOT NULL,
  items_subtotal numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.toktok_restaurant_order_feed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.toktok_restaurant_order_feed FROM anon, authenticated;
GRANT SELECT ON public.toktok_restaurant_order_feed TO authenticated;
DROP POLICY IF EXISTS toktok_restaurant_order_feed_store_read ON public.toktok_restaurant_order_feed;
CREATE POLICY toktok_restaurant_order_feed_store_read ON public.toktok_restaurant_order_feed FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid()) AND p.role='toktok_restaurant'::public.user_role AND p.toktok_store_id=toktok_restaurant_order_feed.store_id));
CREATE OR REPLACE FUNCTION public.sync_toktok_restaurant_order_feed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.toktok_restaurant_order_feed (id,store_id,order_number,order_date,batch_id,batch_time_snapshot,status,payment_status,items_subtotal,delivery_fee,total_amount,notes,created_at,updated_at)
  VALUES (NEW.id,NEW.store_id,NEW.order_number,NEW.order_date,NEW.batch_id,NEW.batch_time_snapshot,NEW.status,NEW.payment_status,NEW.items_subtotal,NEW.delivery_fee,NEW.total_amount,NEW.notes,NEW.created_at,NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET store_id=EXCLUDED.store_id,order_number=EXCLUDED.order_number,order_date=EXCLUDED.order_date,batch_id=EXCLUDED.batch_id,batch_time_snapshot=EXCLUDED.batch_time_snapshot,status=EXCLUDED.status,payment_status=EXCLUDED.payment_status,items_subtotal=EXCLUDED.items_subtotal,delivery_fee=EXCLUDED.delivery_fee,total_amount=EXCLUDED.total_amount,notes=EXCLUDED.notes,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_toktok_restaurant_order_feed() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_toktok_restaurant_order_feed ON public.toktok_orders;
CREATE TRIGGER sync_toktok_restaurant_order_feed AFTER INSERT OR UPDATE ON public.toktok_orders FOR EACH ROW EXECUTE FUNCTION public.sync_toktok_restaurant_order_feed();
INSERT INTO public.toktok_restaurant_order_feed (id,store_id,order_number,order_date,batch_id,batch_time_snapshot,status,payment_status,items_subtotal,delivery_fee,total_amount,notes,created_at,updated_at)
SELECT id,store_id,order_number,order_date,batch_id,batch_time_snapshot,status,payment_status,items_subtotal,delivery_fee,total_amount,notes,created_at,updated_at FROM public.toktok_orders
ON CONFLICT (id) DO UPDATE SET store_id=EXCLUDED.store_id,order_number=EXCLUDED.order_number,order_date=EXCLUDED.order_date,batch_id=EXCLUDED.batch_id,batch_time_snapshot=EXCLUDED.batch_time_snapshot,status=EXCLUDED.status,payment_status=EXCLUDED.payment_status,items_subtotal=EXCLUDED.items_subtotal,delivery_fee=EXCLUDED.delivery_fee,total_amount=EXCLUDED.total_amount,notes=EXCLUDED.notes,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at;
DROP POLICY IF EXISTS toktok_orders_store_staff_select ON public.toktok_orders;
DROP POLICY IF EXISTS toktok_orders_store_staff_update ON public.toktok_orders;
DROP POLICY IF EXISTS toktok_order_items_store_staff_select ON public.toktok_order_items;
CREATE POLICY toktok_order_items_store_staff_select ON public.toktok_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.toktok_restaurant_order_feed f JOIN public.profiles p ON p.id=(SELECT auth.uid()) WHERE f.id=toktok_order_items.order_id AND p.role='toktok_restaurant'::public.user_role AND p.toktok_store_id=f.store_id));
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='toktok_orders') THEN EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.toktok_orders'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='toktok_restaurant_order_feed') THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.toktok_restaurant_order_feed'; END IF;
END; $$;
