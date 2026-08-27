-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('CASUAL', 'SICK', 'PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PunchBy" ADD VALUE 'KIOSK';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TamperEventType" ADD VALUE 'FACE_MISMATCH';
ALTER TYPE "TamperEventType" ADD VALUE 'GEOFENCE_BREACH';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "standard_daily_hours" DOUBLE PRECISION NOT NULL DEFAULT 8.0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "casual_leave_balance" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
ADD COLUMN     "face_encoding" JSONB,
ADD COLUMN     "face_enrolled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paid_leave_balance" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
ADD COLUMN     "sick_leave_balance" DOUBLE PRECISION NOT NULL DEFAULT 6.0;

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "is_face_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_geofence_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "punch_in_selfie_url" TEXT,
ADD COLUMN     "punch_out_selfie_url" TEXT,
ADD COLUMN     "site_id" TEXT;

-- CreateTable
CREATE TABLE "GeofenceSite" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_meters" DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeofenceSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "leave_type" "LeaveType" NOT NULL DEFAULT 'CASUAL',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeofenceSite_company_id_is_active_idx" ON "GeofenceSite"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "LeaveRequest_company_id_status_start_date_idx" ON "LeaveRequest"("company_id", "status", "start_date");

-- CreateIndex
CREATE INDEX "LeaveRequest_user_id_status_idx" ON "LeaveRequest"("user_id", "status");

-- CreateIndex
CREATE INDEX "AttendanceRecord_site_id_idx" ON "AttendanceRecord"("site_id");

-- AddForeignKey
ALTER TABLE "GeofenceSite" ADD CONSTRAINT "GeofenceSite_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "GeofenceSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

