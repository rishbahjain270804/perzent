-- PostgREST hygiene: nothing in this schema is meant to be reachable with the anon/authenticated
-- roles except the SECURITY DEFINER RPCs. RLS already blocks reads, but leftover default grants on
-- the migrations table and two helper functions are removed so the surface matches the intent.
REVOKE ALL ON TABLE public._prisma_migrations FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.haversine_m(float8, float8, float8, float8) FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;
-- Future tables/functions created by migrations must not inherit grants for these roles either.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
