-- Owner/manager self-service password reset (email link). Tokens are stored hashed, single-use, short-lived.
CREATE TABLE IF NOT EXISTS "PasswordReset" (
  "id"         TEXT PRIMARY KEY,
  "user_id"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PasswordReset_user_id_idx" ON "PasswordReset"("user_id");
CREATE INDEX IF NOT EXISTS "PasswordReset_expires_at_idx" ON "PasswordReset"("expires_at");
