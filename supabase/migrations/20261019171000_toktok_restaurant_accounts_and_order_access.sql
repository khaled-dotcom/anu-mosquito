ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS toktok_store_id uuid REFERENCES public.toktok_stores(id) ON DELETE RESTRICT;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['student'::public.user_role,'admin'::public.user_role,'driver'::public.user_role,'moderator'::public.user_role,'toktok_restaurant'::public.user_role]));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_toktok_account_per_store ON public.profiles (toktok_store_id) WHERE role = 'toktok_restaurant'::public.user_role;
CREATE INDEX IF NOT EXISTS profiles_toktok_store_id_idx ON public.profiles (toktok_store_id) WHERE toktok_store_id IS NOT NULL;
DROP POLICY IF EXISTS toktok_stores_restaurant_account_read ON public.toktok_stores;
CREATE POLICY toktok_stores_restaurant_account_read ON public.toktok_stores FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'toktok_restaurant'::public.user_role AND p.toktok_store_id = toktok_stores.id));
DROP POLICY IF EXISTS toktok_batches_store_staff_select ON public.toktok_batches;
CREATE POLICY toktok_batches_store_staff_select ON public.toktok_batches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'toktok_restaurant'::public.user_role AND p.toktok_store_id = toktok_batches.store_id));
DROP POLICY IF EXISTS toktok_orders_store_staff_select ON public.toktok_orders;
CREATE POLICY toktok_orders_store_staff_select ON public.toktok_orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'toktok_restaurant'::public.user_role AND p.toktok_store_id = toktok_orders.store_id));
DROP POLICY IF EXISTS toktok_orders_store_staff_update ON public.toktok_orders;
CREATE POLICY toktok_orders_store_staff_update ON public.toktok_orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'toktok_restaurant'::public.user_role AND p.toktok_store_id = toktok_orders.store_id)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'toktok_restaurant'::public.user_role AND p.toktok_store_id = toktok_orders.store_id));
DROP POLICY IF EXISTS toktok_order_items_store_staff_select ON public.toktok_order_items;
CREATE POLICY toktok_order_items_store_staff_select ON public.toktok_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.toktok_orders o JOIN public.profiles p ON p.id = (SELECT auth.uid()) WHERE o.id = toktok_order_items.order_id AND p.role = 'toktok_restaurant'::public.user_role AND p.toktok_store_id = o.store_id));
CREATE OR REPLACE FUNCTION public.guard_toktok_restaurant_order_update() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_role public.user_role; v_store_id uuid;
BEGIN
  SELECT p.role, p.toktok_store_id INTO v_role, v_store_id FROM public.profiles p WHERE p.id = (SELECT auth.uid());
  IF v_role = 'toktok_restaurant'::public.user_role THEN
    IF OLD.store_id IS DISTINCT FROM v_store_id OR NEW.store_id IS DISTINCT FROM v_store_id THEN RAISE EXCEPTION 'Restaurant accounts can only update orders for their own store.'; END IF;
    IF (to_jsonb(NEW) - ARRAY['status', 'updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'updated_at']) THEN RAISE EXCEPTION 'Restaurant accounts may only change the order status.'; END IF;
    IF OLD.payment_status <> 'confirmed' THEN RAISE EXCEPTION 'Only payment-confirmed orders can be processed by a restaurant.'; END IF;
    IF NOT ((OLD.status = 'confirmed' AND NEW.status = 'preparing') OR (OLD.status = 'preparing' AND NEW.status = 'ready') OR (OLD.status = 'ready' AND NEW.status = 'out_for_delivery')) THEN RAISE EXCEPTION 'This order status transition is not allowed.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_toktok_restaurant_order_update ON public.toktok_orders;
CREATE TRIGGER guard_toktok_restaurant_order_update BEFORE UPDATE ON public.toktok_orders FOR EACH ROW EXECUTE FUNCTION public.guard_toktok_restaurant_order_update();
CREATE OR REPLACE FUNCTION public.guard_toktok_restaurant_profile_update() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.role = 'toktok_restaurant'::public.user_role AND (SELECT auth.uid()) = OLD.id THEN RAISE EXCEPTION 'Restaurant account profile settings are managed by the TokTok administrator.'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_toktok_restaurant_profile_update ON public.profiles;
CREATE TRIGGER guard_toktok_restaurant_profile_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_toktok_restaurant_profile_update();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='toktok_orders') THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.toktok_orders'; END IF;
END; $$;
