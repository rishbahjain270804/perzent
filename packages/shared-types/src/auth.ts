import { z } from 'zod';

export type UserRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

export const RegisterCompanySchema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
  owner_name: z.string().min(2, 'Owner name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  timezone: z.string().default('Asia/Kolkata'),
});
export type RegisterCompanyDto = z.infer<typeof RegisterCompanySchema>;

export const LoginSchema = z.object({
  phone_or_email: z.string().min(3, 'Phone or email is required'),
  password: z.string().min(4, 'Password is required'),
  device_uuid: z.string().optional(),
  device_model: z.string().optional(),
  os_version: z.string().optional(),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const ProvisionEmployeeSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone is required'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  designation: z.string().min(2, 'Designation is required'),
  department_id: z.string().uuid().optional(),
  manager_id: z.string().uuid().optional(),
  role: z.enum(['MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
});
export type ProvisionEmployeeDto = z.infer<typeof ProvisionEmployeeSchema>;

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
