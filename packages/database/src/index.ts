import {
  AuthSession,
  AttendanceSummary,
  DailyRoutePlayback,
  LiveTeamMember,
  PaymentTransaction,
  EMPLOYEE_BASE_PRICE_INR,
  GST_RATE,
  GST_AMOUNT_INR,
  EMPLOYEE_TOTAL_PRICE_INR,
} from '@perzent/shared-types';

export interface DBStore {
  companies: any[];
  departments: any[];
  users: any[];
  userDevices: any[];
  attendanceRecords: any[];
  attendanceBreaks: any[];
  locationStops: any[];
  locationWaypoints: any[];
  tamperLogs: any[];
  paymentTransactions: PaymentTransaction[];
}

declare global {
  var __PERZENT_STORE__: DBStore | undefined;
}

function seedInitialStore(): DBStore {
  const companyId = 'comp-acme-1001';
  const deptNorthId = 'dept-north-sales';
  const deptEastId = 'dept-east-logistics';
  const deptWestId = 'dept-west-support';

  const companies = [
    {
      id: companyId,
      name: 'Acme Logistics Pvt Ltd',
      owner_email: 'rajesh@acmelogistics.com',
      timezone: 'Asia/Kolkata',
      auto_checkout_time: '23:40',
      max_break_minutes: 30,
      route_retention_days: 15,
      attendance_retention_days: 45,
      active_employee_seats: 3,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date(),
    },
  ];

  const departments = [
    { id: deptNorthId, company_id: companyId, name: 'North India Sales & Dispatch' },
    { id: deptEastId, company_id: companyId, name: 'East Region Operations' },
    { id: deptWestId, company_id: companyId, name: 'West Regional Delivery' },
  ];

  const users = [
    {
      id: 'user-rajesh-owner',
      company_id: companyId,
      full_name: 'Rajesh Sharma',
      email: 'rajesh@acmelogistics.com',
      phone: '+919876543210',
      role: 'OWNER',
      designation: 'Managing Director & Fleet Owner',
      department_id: deptNorthId,
      status: 'ACTIVE',
      company: companies[0],
      department: departments[0],
      created_at: new Date('2026-01-01T09:00:00.000Z'),
    },
    {
      id: 'user-priya-manager',
      company_id: companyId,
      full_name: 'Priya Verma',
      email: 'priya@acmelogistics.com',
      phone: '+919876543211',
      role: 'MANAGER',
      designation: 'Operations Field Manager',
      department_id: deptNorthId,
      status: 'ACTIVE',
      company: companies[0],
      department: departments[0],
      created_at: new Date('2026-01-05T09:00:00.000Z'),
    },
    {
      id: 'user-amit-employee',
      company_id: companyId,
      full_name: 'Amit Patel',
      email: 'amit@acmelogistics.com',
      phone: '+919876543212',
      role: 'EMPLOYEE',
      designation: 'Senior Medical Representative (North)',
      department_id: deptNorthId,
      manager_id: 'user-priya-manager',
      status: 'ACTIVE',
      company: companies[0],
      department: departments[0],
      created_at: new Date('2026-01-10T09:00:00.000Z'),
    },
    {
      id: 'user-sneha-employee',
      company_id: companyId,
      full_name: 'Sneha Roy',
      email: 'sneha@acmelogistics.com',
      phone: '+919876543213',
      role: 'EMPLOYEE',
      designation: 'Field Dispatch Lead (East)',
      department_id: deptEastId,
      manager_id: 'user-priya-manager',
      status: 'ACTIVE',
      company: companies[0],
      department: departments[1],
      created_at: new Date('2026-01-15T09:00:00.000Z'),
    },
    {
      id: 'user-vikram-employee',
      company_id: companyId,
      full_name: 'Vikram Singh',
      email: 'vikram@acmelogistics.com',
      phone: '+919876543214',
      role: 'EMPLOYEE',
      designation: 'Logistics Supervisor (West)',
      department_id: deptWestId,
      manager_id: 'user-priya-manager',
      status: 'ACTIVE',
      company: companies[0],
      department: departments[2],
      created_at: new Date('2026-02-01T09:00:00.000Z'),
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  const attendanceRecords = [
    {
      id: 'att-amit-today',
      user_id: 'user-amit-employee',
      work_date: new Date(`${todayStr}T00:00:00.000Z`),
      punch_in_time: new Date(`${todayStr}T09:12:00.000Z`),
      punch_in_by: 'EMPLOYEE',
      status: 'CHECKED_IN',
      gross_worked_minutes: 380,
      total_break_minutes: 30,
      net_worked_minutes: 350,
      created_at: new Date(`${todayStr}T09:12:00.000Z`),
      updated_at: new Date(),
    },
    {
      id: 'att-sneha-today',
      user_id: 'user-sneha-employee',
      work_date: new Date(`${todayStr}T00:00:00.000Z`),
      punch_in_time: new Date(`${todayStr}T08:55:00.000Z`),
      punch_in_by: 'EMPLOYEE',
      status: 'ON_BREAK',
      gross_worked_minutes: 395,
      total_break_minutes: 20,
      net_worked_minutes: 375,
      created_at: new Date(`${todayStr}T08:55:00.000Z`),
      updated_at: new Date(),
    },
    {
      id: 'att-vikram-today',
      user_id: 'user-vikram-employee',
      work_date: new Date(`${todayStr}T00:00:00.000Z`),
      punch_in_time: new Date(`${todayStr}T09:30:00.000Z`),
      punch_in_by: 'EMPLOYEE',
      punch_out_time: new Date(`${todayStr}T17:30:00.000Z`),
      punch_out_by: 'EMPLOYEE',
      status: 'CHECKED_OUT',
      gross_worked_minutes: 480,
      total_break_minutes: 30,
      net_worked_minutes: 450,
      created_at: new Date(`${todayStr}T09:30:00.000Z`),
      updated_at: new Date(`${todayStr}T17:30:00.000Z`),
    },
  ];

  const paymentTransactions: PaymentTransaction[] = [
    {
      id: 'tx-cf-001',
      order_id: 'ORDER_PERZENT_SEAT_101',
      company_id: companyId,
      employee_phone: '+919876543212',
      employee_name: 'Amit Patel',
      employee_designation: 'Senior Medical Representative (North)',
      employee_role: 'EMPLOYEE',
      employee_department_id: deptNorthId,
      employee_manager_id: 'user-priya-manager',
      base_price: EMPLOYEE_BASE_PRICE_INR,
      tax_amount: GST_AMOUNT_INR,
      total_amount: EMPLOYEE_TOTAL_PRICE_INR,
      currency: 'INR',
      status: 'PAID',
      payment_session_id: 'session_cf_test_amit_101',
      payment_method: 'UPI',
      invoice_number: 'INV-2026-0001',
      created_at: new Date('2026-01-10T09:00:00.000Z').toISOString(),
      paid_at: new Date('2026-01-10T09:01:00.000Z').toISOString(),
    },
    {
      id: 'tx-cf-002',
      order_id: 'ORDER_PERZENT_SEAT_102',
      company_id: companyId,
      employee_phone: '+919876543213',
      employee_name: 'Sneha Roy',
      employee_designation: 'Field Dispatch Lead (East)',
      employee_role: 'EMPLOYEE',
      employee_department_id: deptEastId,
      employee_manager_id: 'user-priya-manager',
      base_price: EMPLOYEE_BASE_PRICE_INR,
      tax_amount: GST_AMOUNT_INR,
      total_amount: EMPLOYEE_TOTAL_PRICE_INR,
      currency: 'INR',
      status: 'PAID',
      payment_session_id: 'session_cf_test_sneha_102',
      payment_method: 'CREDIT_CARD',
      invoice_number: 'INV-2026-0002',
      created_at: new Date('2026-01-15T09:00:00.000Z').toISOString(),
      paid_at: new Date('2026-01-15T09:01:00.000Z').toISOString(),
    },
  ];

  return {
    companies,
    departments,
    users,
    userDevices: [],
    attendanceRecords,
    attendanceBreaks: [],
    locationStops: [],
    locationWaypoints: [],
    tamperLogs: [],
    paymentTransactions,
  };
}

export function getStore(): DBStore {
  if (!globalThis.__PERZENT_STORE__) {
    globalThis.__PERZENT_STORE__ = seedInitialStore();
  }
  return globalThis.__PERZENT_STORE__;
}

export const prisma: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (prop === '$transaction') {
        return async (arg: any) => {
          if (typeof arg === 'function') {
            return await arg(prisma);
          }
          if (Array.isArray(arg)) {
            return await Promise.all(arg);
          }
          return arg;
        };
      }

      return {
        findMany: async ({ where, orderBy }: any = {}) => {
          const s = getStore();
          const list = (s as any)[prop] || (s as any)[`${prop}s`] || s.users;
          if (!where) return list;
          return list.filter((item: any) => {
            for (const key of Object.keys(where)) {
              if (where[key] !== undefined && item[key] !== where[key]) {
                return false;
              }
            }
            return true;
          });
        },
        findUnique: async ({ where }: any = {}) => {
          const s = getStore();
          const list = (s as any)[prop] || (s as any)[`${prop}s`] || s.users;
          if (!where) return list[0] || null;
          return list.find((item: any) => {
            if (where.id && item.id === where.id) return true;
            if (where.phone && item.phone === where.phone) return true;
            if (where.email && item.email === where.email) return true;
            if (where.order_id && item.order_id === where.order_id) return true;
            return false;
          }) || null;
        },
        findUniqueOrThrow: async ({ where }: any = {}) => {
          const s = getStore();
          const list = (s as any)[prop] || (s as any)[`${prop}s`] || s.companies;
          return list.find((item: any) => item.id === where?.id) || list[0];
        },
        findFirst: async ({ where }: any = {}) => {
          const s = getStore();
          const list = (s as any)[prop] || (s as any)[`${prop}s`] || s.users;
          if (!where) return list[0] || null;
          return list.find((item: any) => {
            if (where.id && item.id === where.id) return true;
            if (where.phone && item.phone === where.phone) return true;
            if (where.email && item.email === where.email) return true;
            if (where.company_id && item.company_id === where.company_id) return true;
            return false;
          }) || list[0] || null;
        },
        create: async ({ data }: any) => {
          const s = getStore();
          const list = (s as any)[prop] || (s as any)[`${prop}s`] || s.users;
          const newItem = {
            id: data.id || `${prop}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            created_at: new Date(),
            updated_at: new Date(),
            ...data,
          };
          list.push(newItem);
          return newItem;
        },
        update: async ({ where, data }: any) => {
          const s = getStore();
          const list = (s as any)[prop] || (s as any)[`${prop}s`] || s.users;
          const item = list.find((i: any) => i.id === where?.id || i.order_id === where?.order_id);
          if (item) Object.assign(item, data);
          return item || data;
        },
        delete: async ({ where }: any) => {
          const s = getStore();
          const list = (s as any)[prop] || (s as any)[`${prop}s`] || s.users;
          const idx = list.findIndex((i: any) => i.id === where?.id);
          if (idx !== -1) return list.splice(idx, 1)[0];
          return null;
        },
      };
    },
  }
);
