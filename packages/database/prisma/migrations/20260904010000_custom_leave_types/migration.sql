-- Custom, owner-defined leave types with per-user balances. Additive and backward-compatible:
-- the legacy LeaveRequest.leave_type enum and the three User balance columns stay in place, so the
-- existing leave flow keeps working until the API/UI switch over.

CREATE TABLE "LeaveTypeConfig" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "is_paid" BOOLEAN NOT NULL DEFAULT true,
  "annual_allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveTypeConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeaveTypeConfig_company_id_code_key" ON "LeaveTypeConfig"("company_id", "code");
CREATE INDEX "LeaveTypeConfig_company_id_is_active_idx" ON "LeaveTypeConfig"("company_id", "is_active");

CREATE TABLE "LeaveBalance" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "leave_type_id" TEXT NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeaveBalance_user_id_leave_type_id_key" ON "LeaveBalance"("user_id", "leave_type_id");
CREATE INDEX "LeaveBalance_leave_type_id_idx" ON "LeaveBalance"("leave_type_id");

ALTER TABLE "LeaveRequest" ADD COLUMN "leave_type_id" TEXT;

ALTER TABLE "LeaveTypeConfig" ADD CONSTRAINT "LeaveTypeConfig_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leave_type_id_fkey"
  FOREIGN KEY ("leave_type_id") REFERENCES "LeaveTypeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leave_type_id_fkey"
  FOREIGN KEY ("leave_type_id") REFERENCES "LeaveTypeConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the four default leave types for every existing company (matches the legacy defaults).
INSERT INTO "LeaveTypeConfig" ("id", "company_id", "name", "code", "is_paid", "annual_allowance", "sort_order", "updated_at")
SELECT gen_random_uuid(), c."id", t.name, t.code, t.is_paid, t.allowance, t.ord, CURRENT_TIMESTAMP
FROM "Company" c
CROSS JOIN (VALUES
  ('Casual', 'CASUAL', true, 6.0, 0),
  ('Sick', 'SICK', true, 6.0, 1),
  ('Paid', 'PAID', true, 12.0, 2),
  ('Unpaid', 'UNPAID', false, 0.0, 3)
) AS t(name, code, is_paid, allowance, ord)
ON CONFLICT ("company_id", "code") DO NOTHING;

-- Carry each user's current balance into the new per-type table.
INSERT INTO "LeaveBalance" ("id", "user_id", "leave_type_id", "balance", "updated_at")
SELECT gen_random_uuid(), u."id", lt."id",
  CASE lt."code"
    WHEN 'PAID' THEN u."paid_leave_balance"
    WHEN 'SICK' THEN u."sick_leave_balance"
    WHEN 'CASUAL' THEN u."casual_leave_balance"
    ELSE 0
  END,
  CURRENT_TIMESTAMP
FROM "User" u
JOIN "LeaveTypeConfig" lt ON lt."company_id" = u."company_id"
ON CONFLICT ("user_id", "leave_type_id") DO NOTHING;

-- Point existing requests at their company's matching type.
UPDATE "LeaveRequest" r
SET "leave_type_id" = lt."id"
FROM "LeaveTypeConfig" lt
WHERE lt."company_id" = r."company_id" AND lt."code" = r."leave_type"::text AND r."leave_type_id" IS NULL;

-- RLS on, no PostgREST grants (project convention; access is via the app's server role only).
ALTER TABLE "LeaveTypeConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveBalance" ENABLE ROW LEVEL SECURITY;
