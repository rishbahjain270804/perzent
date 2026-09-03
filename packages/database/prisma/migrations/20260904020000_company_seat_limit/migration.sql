-- Purchased seat limit per company. NULL = unlimited (the current free-launch behaviour); a set
-- value caps how many non-owner accounts the company can have. Enforced in POST /api/employees.
ALTER TABLE "Company" ADD COLUMN "seat_limit" INTEGER;
