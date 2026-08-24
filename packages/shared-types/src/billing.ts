import { z } from 'zod';

export const EMPLOYEE_BASE_PRICE_INR = 99.0;
export const GST_RATE = 0.18; // 18% Tax
export const GST_AMOUNT_INR = Number((EMPLOYEE_BASE_PRICE_INR * GST_RATE).toFixed(2)); // 17.82
export const EMPLOYEE_TOTAL_PRICE_INR = Number((EMPLOYEE_BASE_PRICE_INR + GST_AMOUNT_INR).toFixed(2)); // 116.82

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface PricingBreakdown {
  base_price_inr: number;
  tax_rate_pct: number;
  tax_amount_inr: number;
  total_price_inr: number;
  currency: string;
}

export interface PaymentTransaction {
  id: string;
  company_id: string;
  order_id: string;
  cashfree_order_id?: string;
  payment_session_id?: string;
  employee_name: string;
  employee_phone: string;
  employee_designation: string;
  employee_role: string;
  employee_department_id: string;
  employee_manager_id: string;
  base_price: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method?: string;
  bank_reference?: string;
  created_at: string;
  paid_at?: string;
  invoice_number?: string;
}

export const CreatePaymentOrderSchema = z.object({
  employee_name: z.string().min(2, 'Employee full name is required'),
  employee_phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  employee_email: z.string().email().optional().or(z.literal('')),
  employee_designation: z.string().min(2, 'Designation is required'),
  employee_role: z.enum(['EMPLOYEE', 'MANAGER']).default('EMPLOYEE'),
  employee_password: z.string().min(8, 'Temporary password must be at least 8 characters'),
  employee_department_id: z.string().uuid().optional().or(z.literal('')),
  employee_manager_id: z.string().uuid().optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional(),
  customer_name: z.string().optional(),
});

export type CreatePaymentOrderDto = z.infer<typeof CreatePaymentOrderSchema>;

export const VerifyPaymentSchema = z.object({
  order_id: z.string(),
  cf_payment_id: z.string().optional(),
});

export type VerifyPaymentDto = z.infer<typeof VerifyPaymentSchema>;
