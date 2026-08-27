-- CreateTable
CREATE TABLE "RouteArchive" (
    "attendance_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "point_count" INTEGER NOT NULL,
    "distance_m" INTEGER NOT NULL DEFAULT 0,
    "first_at" TIMESTAMP(3) NOT NULL,
    "last_at" TIMESTAMP(3) NOT NULL,
    "encoded_points" TEXT NOT NULL,
    "encoded_times" TEXT NOT NULL,
    "stops" JSONB NOT NULL,
    "breaks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteArchive_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateIndex
CREATE INDEX "RouteArchive_user_id_work_date_idx" ON "RouteArchive"("user_id", "work_date");

-- CreateIndex
CREATE INDEX "RouteArchive_company_id_work_date_idx" ON "RouteArchive"("company_id", "work_date");

-- AddForeignKey
ALTER TABLE "RouteArchive" ADD CONSTRAINT "RouteArchive_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

