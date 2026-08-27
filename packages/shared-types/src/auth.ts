import { z } from 'zod';

export type UserRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

export const PASSWORD_MIN_LENGTH = 6;

const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Valid phone number is required')
  .max(20, 'Phone number is too long')
  .regex(/^\+?[0-9 ()-]{10,20}$/, 'Phone may only contain digits, spaces, +, - and parentheses');

export const RegisterCompanySchema = z.object({
  company_name: z.string().trim().min(2, 'Company name is required').max(120),
  owner_name: z.string().trim().min(2, 'Owner name is required').max(120),
  email: z.string().trim().email('Invalid email address').max(200),
  phone: phoneSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  timezone: z.string().trim().min(1).max(64).default('Asia/Kolkata'),
});
export type RegisterCompanyDto = z.infer<typeof RegisterCompanySchema>;

export const LoginSchema = z.object({
  phone_or_email: z.string().trim().min(3, 'Phone or email is required').max(200),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(128),
  device_uuid: z.string().trim().min(1).max(200).optional(),
  device_model: z.string().trim().max(160).optional(),
  os_version: z.string().trim().max(80).optional(),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const ChangePasswordSchema = z.object({
  action: z.literal('change_password'),
  current_password: z.string().min(1, 'Current password is required').max(128),
  new_password: z.string().min(PASSWORD_MIN_LENGTH, `New password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(128),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export const ProvisionEmployeeSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required').max(120),
  phone: phoneSchema,
  email: z.string().trim().email('Invalid email address').max(200).optional().or(z.literal('')),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(128),
  designation: z.string().trim().min(2, 'Designation is required').max(80),
  department_id: z.string().uuid().optional().or(z.literal('')),
  manager_id: z.string().uuid().optional().or(z.literal('')),
  role: z.enum(['MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
});
export type ProvisionEmployeeDto = z.infer<typeof ProvisionEmployeeSchema>;

export const UpdateEmployeeSchema = z.object({
  action: z.literal('UPDATE'),
  id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120).optional(),
  designation: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal('')).or(z.null()),
  role: z.enum(['MANAGER', 'EMPLOYEE']).optional(),
  manager_id: z.string().uuid().nullable().optional().or(z.literal('')),
  department_id: z.string().uuid().nullable().optional().or(z.literal('')),
});

export const EmployeeActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('RESET_DEVICE'), id: z.string().uuid() }),
  z.object({ action: z.literal('SUSPEND'), id: z.string().uuid() }),
  z.object({ action: z.literal('REACTIVATE'), id: z.string().uuid() }),
  z.object({
    action: z.literal('RESET_PASSWORD'),
    id: z.string().uuid(),
    new_password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`).max(128),
  }),
  UpdateEmployeeSchema,
]);
export type EmployeeActionDto = z.infer<typeof EmployeeActionSchema>;

export interface AuthSession {
  user_id: string;
  company_id: string;
  role: UserRole;
  email?: string;
  phone: string;
  full_name: string;
  department_id?: string;
  manager_id?: string;
  token: string;
}
