-- Keep the original five-argument order RPC as the only candidate until
-- discount integration is reintroduced without ambiguous PostgREST overloads.
DROP FUNCTION IF EXISTS public.place_student_order(uuid, uuid, uuid, text, jsonb, uuid);
