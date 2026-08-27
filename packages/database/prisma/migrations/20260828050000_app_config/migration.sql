-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "maintenance_enabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_scope" TEXT NOT NULL DEFAULT 'ALL',
    "maintenance_title" TEXT,
    "maintenance_message" TEXT,
    "maintenance_until" TIMESTAMP(3),
    "announcement" TEXT,
    "announcement_level" TEXT NOT NULL DEFAULT 'INFO',
    "latest_app_version" TEXT,
    "latest_app_version_code" INTEGER,
    "min_app_version_code" INTEGER,
    "play_store_url" TEXT,
    "support_email" TEXT,
    "support_phone" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);


-- Seed the single global row so the app/portal always find a config.
INSERT INTO "AppConfig" ("id", "updated_at") VALUES ('global', CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
-- Editable from Supabase Table Editor; PostgREST roles keep no direct access (RLS deny-all is default for new tables here).
ALTER TABLE "AppConfig" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AppConfig" FROM anon, authenticated;
