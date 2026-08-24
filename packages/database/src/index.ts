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
  sessions: any[];
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

// Pre-hashed bcrypt(12) of "password123"
const DEMO_PASSWORD_HASH = '$2b$12$FH93IBWy03y.qDyCcDt2iegk48.HBexlxY3h9426BZPWsrILkyegm';

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
      password_hash: DEMO_PASSWORD_HASH,
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
      password_hash: DEMO_PASSWORD_HASH,
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
      password_hash: DEMO_PASSWORD_HASH,
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
      password_hash: DEMO_PASSWORD_HASH,
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
      password_hash: DEMO_PASSWORD_HASH,
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

  // Seed today's GPS waypoints so live-map has dots from day 1
  const now = Date.now();
  const locationWaypoints = [
    // Amit – walking route through Connaught Place, Delhi
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((mins, i) => ({
      id: `wp-amit-${i}`,
      attendance_id: 'att-amit-today',
      user_id: 'user-amit-employee',
      latitude: 28.6315 + i * 0.0003,
      longitude: 77.2167 + i * 0.0002,
      accuracy: 5 + Math.random() * 3,
      altitude: 215,
      speed: 1.2 + Math.random() * 0.5,
      heading: 45 + i * 5,
      recorded_at: new Date(now - (20 - mins) * 60000),
    })),
    // Sneha – moving across Salt Lake, Kolkata
    ...[0, 2, 4, 6, 8, 10, 12, 14].map((mins, i) => ({
      id: `wp-sneha-${i}`,
      attendance_id: 'att-sneha-today',
      user_id: 'user-sneha-employee',
      latitude: 22.5726 + i * 0.0004,
      longitude: 88.3639 + i * 0.0003,
      accuracy: 8 + Math.random() * 4,
      altitude: 9,
      speed: 8.5 + Math.random() * 3,
      heading: 90 + i * 10,
      recorded_at: new Date(now - (14 - mins) * 60000),
    })),
    // Vikram – stationary at warehouse in Andheri, Mumbai (checked-out but has trail)
    ...[0, 2, 4].map((mins, i) => ({
      id: `wp-vikram-${i}`,
      attendance_id: 'att-vikram-today',
      user_id: 'user-vikram-employee',
      latitude: 19.1136,
      longitude: 72.8697,
      accuracy: 4,
      altitude: 12,
      speed: 0,
      heading: 0,
      recorded_at: new Date(now - (60 - mins) * 60000),
    })),
  ];

  const locationStops = [
    {
      id: 'stop-amit-1',
      attendance_id: 'att-amit-today',
      user_id: 'user-amit-employee',
      latitude: 28.6315,
      longitude: 77.2167,
      address_name: 'Apollo Pharmacy, Connaught Place',
      start_time: new Date(now - 25 * 60000),
      end_time: new Date(now - 20 * 60000),
      dwell_duration_seconds: 300,
    },
    {
      id: 'stop-sneha-1',
      attendance_id: 'att-sneha-today',
      user_id: 'user-sneha-employee',
      latitude: 22.5726,
      longitude: 88.3639,
      address_name: 'Salt Lake Sector V Hub',
      start_time: new Date(now - 20 * 60000),
      end_time: new Date(now - 14 * 60000),
      dwell_duration_seconds: 360,
    },
    {
      id: 'stop-vikram-1',
      attendance_id: 'att-vikram-today',
      user_id: 'user-vikram-employee',
      latitude: 19.1136,
      longitude: 72.8697,
      address_name: 'Andheri West Warehouse',
      start_time: new Date(now - 65 * 60000),
      end_time: new Date(now - 55 * 60000),
      dwell_duration_seconds: 600,
    },
  ];

  const attendanceRecords = [
    {
      id: 'att-amit-today',
      user_id: 'user-amit-employee',
      work_date: new Date(`${todayStr}T00:00:00.000Z`),
      punch_in_time: new Date(`${todayStr}T09:12:00.000Z`),
      punch_in_lat: 28.6315,
      punch_in_lng: 77.2167,
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
      punch_in_lat: 22.5726,
      punch_in_lng: 88.3639,
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
      punch_in_lat: 19.1136,
      punch_in_lng: 72.8697,
      punch_in_by: 'EMPLOYEE',
      punch_out_time: new Date(`${todayStr}T17:30:00.000Z`),
      punch_out_lat: 19.1140,
      punch_out_lng: 72.8700,
      punch_out_by: 'EMPLOYEE',
      status: 'CHECKED_OUT',
      gross_worked_minutes: 480,
      total_break_minutes: 30,
      net_worked_minutes: 450,
      created_at: new Date(`${todayStr}T09:30:00.000Z`),
      updated_at: new Date(`${todayStr}T17:30:00.000Z`),
    },
  ];

  const userDevices = [
    {
      id: 'dev-amit-1',
      user_id: 'user-amit-employee',
      device_uuid: 'AMIT-SAMSUNG-A54-UUID',
      device_model: 'Samsung Galaxy A54',
      os_version: 'Android 14',
      is_active: true,
      last_seen_at: new Date(now - 2 * 60000),
      telemetry: {
        battery_level: 72,
        is_charging: false,
        sound_volume: 60,
        screen_brightness: 45,
        free_storage_gb: 28.4,
        total_storage_gb: 128,
        ram_used_mb: 3200,
        ram_total_mb: 6144,
      },
    },
    {
      id: 'dev-sneha-1',
      user_id: 'user-sneha-employee',
      device_uuid: 'SNEHA-PIXEL-7A-UUID',
      device_model: 'Google Pixel 7a',
      os_version: 'Android 15',
      is_active: true,
      last_seen_at: new Date(now - 1 * 60000),
      telemetry: {
        battery_level: 54,
        is_charging: false,
        sound_volume: 80,
        screen_brightness: 70,
        free_storage_gb: 41.2,
        total_storage_gb: 128,
        ram_used_mb: 2800,
        ram_total_mb: 8192,
      },
    },
    {
      id: 'dev-vikram-1',
      user_id: 'user-vikram-employee',
      device_uuid: 'VIKRAM-ONEPLUS-12-UUID',
      device_model: 'OnePlus 12',
      os_version: 'Android 14',
      is_active: true,
      last_seen_at: new Date(now - 60 * 60000),
      telemetry: {
        battery_level: 88,
        is_charging: true,
        sound_volume: 40,
        screen_brightness: 30,
        free_storage_gb: 95.6,
        total_storage_gb: 256,
        ram_used_mb: 4100,
        ram_total_mb: 12288,
      },
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
    sessions: [],
    userDevices,
    attendanceRecords,
    attendanceBreaks: [],
    locationStops: locationStops,
    locationWaypoints,
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

/* ─── Helpers ─── */

/** Resolve the backing array for a Prisma model name (e.g. "user" → users[]) */
function resolveCollection(prop: string): any[] {
  const s = getStore();
  const map: Record<string, keyof DBStore> = {
    company: 'companies',
    department: 'departments',
    user: 'users',
    session: 'sessions',
    userDevice: 'userDevices',
    attendanceRecord: 'attendanceRecords',
    attendanceBreak: 'attendanceBreaks',
    locationStop: 'locationStops',
    locationWaypoint: 'locationWaypoints',
    tamperLog: 'tamperLogs',
    paymentTransaction: 'paymentTransactions',
  };
  return (s as any)[map[prop]] || (s as any)[prop] || (s as any)[`${prop}s`] || [];
}

/** Deep-match a single item against a Prisma `where` clause, including OR/AND and compound keys */
function matchesWhere(item: any, where: any): boolean {
  if (!where) return true;

  // OR combinator
  if (where.OR) {
    return (where.OR as any[]).some((clause) => matchesWhere(item, clause));
  }
  // AND combinator
  if (where.AND) {
    return (where.AND as any[]).every((clause) => matchesWhere(item, clause));
  }
  // NOT combinator
  if (where.NOT) {
    return !matchesWhere(item, where.NOT);
  }

  for (const key of Object.keys(where)) {
    const val = where[key];
    if (val === undefined) continue;

    // Compound unique key (e.g. user_id_work_date: { user_id, work_date })
    if (typeof val === 'object' && val !== null && !(val instanceof Date) && !Array.isArray(val)) {
      // Check if it looks like a compound key object (all values are primitives or Dates)
      const subKeys = Object.keys(val);
      const isCompound = subKeys.every(
        (sk) => typeof val[sk] === 'string' || typeof val[sk] === 'number' || val[sk] instanceof Date
      );
      if (isCompound && subKeys.length >= 2) {
        // Match each sub-key against the item
        for (const sk of subKeys) {
          const itemVal = item[sk];
          const matchVal = val[sk];
          if (matchVal instanceof Date) {
            if (!(itemVal instanceof Date) || itemVal.getTime() !== matchVal.getTime()) return false;
          } else if (itemVal !== matchVal) {
            return false;
          }
        }
        continue;
      }
      // Could be a nested filter like { increment: N } — skip
      continue;
    }

    if (val instanceof Date) {
      if (!(item[key] instanceof Date) || item[key].getTime() !== val.getTime()) return false;
    } else if (item[key] !== val) {
      return false;
    }
  }
  return true;
}

/** Attach `include`-d relations to a result item */
function attachIncludes(item: any, include: any): any {
  if (!include || !item) return item;
  const result = { ...item };
  for (const relName of Object.keys(include)) {
    const relSpec = include[relName];
    // Already inline (e.g. user.company was set in seed)
    if (result[relName] !== undefined) continue;

    // Guess the related collection and foreign key
    const relMap: Record<string, { collection: string; fk: string; isArray: boolean }> = {
      company: { collection: 'companies', fk: 'company_id', isArray: false },
      department: { collection: 'departments', fk: 'department_id', isArray: false },
      user: { collection: 'users', fk: 'user_id', isArray: false },
      devices: { collection: 'userDevices', fk: 'user_id', isArray: true },
      attendances: { collection: 'attendanceRecords', fk: 'user_id', isArray: true },
      breaks: { collection: 'attendanceBreaks', fk: 'attendance_id', isArray: true },
      waypoints: { collection: 'locationWaypoints', fk: 'attendance_id', isArray: true },
      stops: { collection: 'locationStops', fk: 'attendance_id', isArray: true },
      tamper_logs: { collection: 'tamperLogs', fk: 'attendance_id', isArray: true },
    };

    const mapping = relMap[relName];
    if (!mapping) continue;

    const store = getStore();
    const coll: any[] = (store as any)[mapping.collection] || [];

    if (mapping.isArray) {
      let filtered = coll.filter((r) => r[mapping.fk] === item.id);
      // Apply sub-where if provided
      if (typeof relSpec === 'object' && relSpec.where) {
        filtered = filtered.filter((r) => matchesWhere(r, relSpec.where));
      }
      // Apply sub-take
      if (typeof relSpec === 'object' && relSpec.take) {
        filtered = filtered.slice(0, relSpec.take);
      }
      // Recursive includes
      if (typeof relSpec === 'object' && relSpec.include) {
        filtered = filtered.map((r) => attachIncludes(r, relSpec.include));
      }
      result[relName] = filtered;
    } else {
      const fkVal = item[mapping.fk];
      result[relName] = coll.find((r) => r.id === fkVal) || null;
    }
  }
  return result;
}

/* ─── Prisma-compatible Proxy ─── */

export const prisma: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (prop === '$transaction') {
        return async (arg: any) => {
          if (typeof arg === 'function') return await arg(prisma);
          if (Array.isArray(arg)) return await Promise.all(arg);
          return arg;
        };
      }
      if (prop === '$connect' || prop === '$disconnect') {
        return async () => {};
      }

      const collection = resolveCollection(prop);

      return {
        findMany: async ({ where, orderBy, include, take, skip }: any = {}) => {
          let results = where ? collection.filter((item) => matchesWhere(item, where)) : [...collection];
          if (include) results = results.map((item) => attachIncludes(item, include));
          if (take) results = results.slice(skip || 0, (skip || 0) + take);
          return results;
        },

        findUnique: async ({ where, include }: any = {}) => {
          let found: any = null;
          if (!where) return null;

          // Try direct ID match first
          if (where.id) {
            found = collection.find((item) => item.id === where.id) || null;
          }
          // Try simple field matches
          if (!found) {
            for (const key of Object.keys(where)) {
              if (typeof where[key] === 'string' || typeof where[key] === 'number') {
                found = collection.find((item) => item[key] === where[key]) || null;
                if (found) break;
              }
            }
          }
          // Try compound key (e.g. { user_id_work_date: { user_id, work_date } })
          if (!found) {
            for (const key of Object.keys(where)) {
              const val = where[key];
              if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
                found = collection.find((item) => {
                  for (const sk of Object.keys(val)) {
                    if (val[sk] instanceof Date) {
                      if (!(item[sk] instanceof Date) || item[sk].getTime() !== val[sk].getTime()) return false;
                    } else if (item[sk] !== val[sk]) return false;
                  }
                  return true;
                }) || null;
                if (found) break;
              }
            }
          }
          if (found && include) found = attachIncludes(found, include);
          return found;
        },

        findUniqueOrThrow: async ({ where, include }: any = {}) => {
          const found = await prisma[prop].findUnique({ where, include });
          if (!found) throw new Error(`Record not found in ${prop}`);
          return found;
        },

        findFirst: async ({ where, include, orderBy }: any = {}) => {
          let results = where ? collection.filter((item) => matchesWhere(item, where)) : [...collection];
          const found = results[0] || null;
          if (found && include) return attachIncludes(found, include);
          return found;
        },

        create: async ({ data, include }: any) => {
          const newItem: any = {
            id: data.id || `${prop}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            created_at: new Date(),
            updated_at: new Date(),
            ...data,
          };
          collection.push(newItem);
          if (include) return attachIncludes(newItem, include);
          return newItem;
        },

        update: async ({ where, data, include }: any) => {
          const item = collection.find((i) => {
            if (where.id && i.id === where.id) return true;
            if (where.order_id && i.order_id === where.order_id) return true;
            // Match any string field
            for (const k of Object.keys(where)) {
              if (typeof where[k] === 'string' && i[k] === where[k]) return true;
            }
            return false;
          });
          if (item) {
            for (const k of Object.keys(data)) {
              // Handle Prisma `increment` shorthand
              if (typeof data[k] === 'object' && data[k]?.increment !== undefined) {
                item[k] = (item[k] || 0) + data[k].increment;
              } else {
                item[k] = data[k];
              }
            }
            item.updated_at = new Date();
          }
          const result = item || { ...where, ...data };
          if (include) return attachIncludes(result, include);
          return result;
        },

        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const item of collection) {
            if (matchesWhere(item, where)) {
              Object.assign(item, data, { updated_at: new Date() });
              count++;
            }
          }
          return { count };
        },

        upsert: async ({ where, update, create: createData, include }: any) => {
          // Try to find with compound keys or simple keys
          let found: any = null;
          for (const key of Object.keys(where)) {
            const val = where[key];
            if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
              // Compound key
              found = collection.find((item) => {
                for (const sk of Object.keys(val)) {
                  if (item[sk] !== val[sk]) return false;
                }
                return true;
              }) || null;
            } else if (typeof val === 'string' || typeof val === 'number') {
              found = collection.find((item) => item[key] === val) || null;
            }
            if (found) break;
          }

          if (found) {
            Object.assign(found, update, { updated_at: new Date() });
            if (include) return attachIncludes(found, include);
            return found;
          }
          const newItem: any = {
            id: createData.id || `${prop}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            created_at: new Date(),
            updated_at: new Date(),
            ...createData,
          };
          collection.push(newItem);
          if (include) return attachIncludes(newItem, include);
          return newItem;
        },

        delete: async ({ where }: any) => {
          const idx = collection.findIndex((i) => i.id === where?.id);
          if (idx !== -1) return collection.splice(idx, 1)[0];
          return null;
        },

        deleteMany: async ({ where }: any) => {
          let count = 0;
          for (let i = collection.length - 1; i >= 0; i--) {
            if (matchesWhere(collection[i], where)) {
              collection.splice(i, 1);
              count++;
            }
          }
          return { count };
        },

        count: async ({ where }: any = {}) => {
          if (!where) return collection.length;
          return collection.filter((item) => matchesWhere(item, where)).length;
        },
      };
    },
  }
);
