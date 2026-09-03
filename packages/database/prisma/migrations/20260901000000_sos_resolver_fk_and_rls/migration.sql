-- The Prisma schema declares SosAlert.resolver (resolved_by_id → User, SET NULL) but the
-- hand-written 20260831060000 migration never created the constraint, leaving the ledger and
-- schema drifted. Recorded here so `migrate diff` is clean and fresh databases match prod.
ALTER TABLE "SosAlert"
  ADD CONSTRAINT "SosAlert_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every table carries RLS (PostgREST gets zero grants; only the whitelisted RPCs are callable).
-- The two tables added by 20260831060000 missed the ALTER in the ledger; idempotent on prod.
ALTER TABLE "SosAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WaitlistEntry" ENABLE ROW LEVEL SECURITY;
