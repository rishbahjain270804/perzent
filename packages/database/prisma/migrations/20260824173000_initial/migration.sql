-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('CHECKED_IN', 'ON_BREAK', 'CHECKED_OUT', 'AUTO_CHECKED_OUT');

-- CreateEnum
CREATE TYPE "PunchBy" AS ENUM ('EMPLOYEE', 'MANAGER', 'OWNER', 'AUTO_SYSTEM');

-- CreateEnum
CREATE TYPE "BreakType" AS ENUM ('LUNCH', 'TEA', 'GENERAL');

-- CreateEnum
CREATE TYPE "BreakEndedBy" AS ENUM ('EMPLOYEE', 'AUTO_TIMEOUT_30MIN', 'MANAGER');

-- CreateEnum
CREATE TYPE "TamperEventType" AS ENUM ('GPS_DISABLED', 'PERMISSION_REVOKED', 'MOCK_LOCATION_DETECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "auto_checkout_time" TEXT NOT NULL DEFAULT '23:40',
    "max_break_minutes" INTEGER NOT NULL DEFAULT 30,
    "route_retention_days" INTEGER NOT NULL DEFAULT 15,
    "attendance_retention_days" INTEGER NOT NULL DEFAULT 45,
    "plan_tier" TEXT NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "department_id" TEXT,
    "manager_id" TEXT,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "designation" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_uuid" TEXT NOT NULL,
    "device_model" TEXT,
    "os_version" TEXT,
    "fcm_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "telemetry" JSONB,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "punch_in_time" TIMESTAMP(3) NOT NULL,
    "punch_out_time" TIMESTAMP(3),
    "punch_in_by" "PunchBy" NOT NULL DEFAULT 'EMPLOYEE',
    "punch_out_by" "PunchBy",
    "punch_out_override_time" TIMESTAMP(3),
    "override_reason" TEXT,
    "punch_in_lat" DOUBLE PRECISION,
    "punch_in_lng" DOUBLE PRECISION,
    "punch_out_lat" DOUBLE PRECISION,
    "punch_out_lng" DOUBLE PRECISION,
    "status" "ShiftStatus" NOT NULL DEFAULT 'CHECKED_IN',
    "gross_worked_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_break_minutes" INTEGER NOT NULL DEFAULT 0,
    "net_worked_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceBreak" (
    "id" TEXT NOT NULL,
    "attendance_id" TEXT NOT NULL,
    "break_type" "BreakType" NOT NULL DEFAULT 'LUNCH',
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "ended_by" "BreakEndedBy",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationStop" (
    "id" TEXT NOT NULL,
    "attendance_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address_name" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "dwell_duration_seconds" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationWaypoint" (
    "id" TEXT NOT NULL,
    "attendance_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationWaypoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TamperLog" (
    "id" TEXT NOT NULL,
    "attendance_id" TEXT,
    "user_id" TEXT NOT NULL,
    "event_type" "TamperEventType" NOT NULL,
    "details" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TamperLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "cashfree_order_id" TEXT,
    "payment_session_id" TEXT,
    "employee_name" TEXT NOT NULL,
    "employee_phone" TEXT NOT NULL,
    "employee_email" TEXT,
    "employee_password_hash" TEXT,
    "employee_designation" TEXT NOT NULL,
    "employee_role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "employee_department_id" TEXT,
    "employee_manager_id" TEXT,
    "provisioned_user_id" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT,
    "bank_reference" TEXT,
    "invoice_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_owner_email_key" ON "Company"("owner_email");

-- CreateIndex
CREATE UNIQUE INDEX "Department_company_id_name_key" ON "Department"("company_id", "name");

-- CreateIndex
CREATE INDEX "User_company_id_role_status_idx" ON "User"("company_id", "role", "status");

-- CreateIndex
CREATE INDEX "User_manager_id_idx" ON "User"("manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_company_id_phone_key" ON "User"("company_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_company_id_email_key" ON "User"("company_id", "email");

-- CreateIndex
CREATE INDEX "UserDevice_user_id_is_active_idx" ON "UserDevice"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_user_id_device_uuid_key" ON "UserDevice"("user_id", "device_uuid");

-- CreateIndex
CREATE INDEX "AttendanceRecord_work_date_status_idx" ON "AttendanceRecord"("work_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_user_id_work_date_key" ON "AttendanceRecord"("user_id", "work_date");

-- CreateIndex
CREATE INDEX "AttendanceBreak_attendance_id_start_time_idx" ON "AttendanceBreak"("attendance_id", "start_time");

-- CreateIndex
CREATE INDEX "LocationStop_user_id_start_time_idx" ON "LocationStop"("user_id", "start_time");

-- CreateIndex
CREATE INDEX "LocationStop_attendance_id_idx" ON "LocationStop"("attendance_id");

-- CreateIndex
CREATE INDEX "LocationWaypoint_user_id_recorded_at_idx" ON "LocationWaypoint"("user_id", "recorded_at");

-- CreateIndex
CREATE INDEX "LocationWaypoint_attendance_id_recorded_at_idx" ON "LocationWaypoint"("attendance_id", "recorded_at");

-- CreateIndex
CREATE INDEX "TamperLog_user_id_occurred_at_idx" ON "TamperLog"("user_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_order_id_key" ON "PaymentTransaction"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_invoice_number_key" ON "PaymentTransaction"("invoice_number");

-- CreateIndex
CREATE INDEX "PaymentTransaction_company_id_status_created_at_idx" ON "PaymentTransaction"("company_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "PaymentTransaction_employee_department_id_idx" ON "PaymentTransaction"("employee_department_id");

-- CreateIndex
CREATE INDEX "PaymentTransaction_employee_manager_id_idx" ON "PaymentTransaction"("employee_manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_hash_key" ON "Session"("token_hash");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- CreateIndex
CREATE INDEX "Session_expires_at_idx" ON "Session"("expires_at");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceBreak" ADD CONSTRAINT "AttendanceBreak_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationStop" ADD CONSTRAINT "LocationStop_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationStop" ADD CONSTRAINT "LocationStop_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationWaypoint" ADD CONSTRAINT "LocationWaypoint_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationWaypoint" ADD CONSTRAINT "LocationWaypoint_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TamperLog" ADD CONSTRAINT "TamperLog_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "AttendanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TamperLog" ADD CONSTRAINT "TamperLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_employee_department_id_fkey" FOREIGN KEY ("employee_department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_employee_manager_id_fkey" FOREIGN KEY ("employee_manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_provisioned_user_id_fkey" FOREIGN KEY ("provisioned_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

