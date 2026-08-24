/**
 * Cashfree Payment Gateway Integration Helper
 * Cashfree PG API Version: 2023-08-01
 */
import {
  EMPLOYEE_BASE_PRICE_INR,
  GST_AMOUNT_INR,
  EMPLOYEE_TOTAL_PRICE_INR,
} from '@perzent/shared-types';
import { createHmac } from 'crypto';
import { safeEqual } from './auth';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox'; // 'sandbox' | 'production'
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2023-08-01';
const ALLOW_MOCK = process.env.CASHFREE_ALLOW_MOCK === 'true' && process.env.NODE_ENV !== 'production';

const BASE_URL =
  CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

export interface CashfreeOrderParams {
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  return_url?: string;
  notify_url?: string;
  order_note?: string;
}

export interface CashfreeCreateOrderResult {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_status: string;
  order_amount: number;
  order_currency: string;
  is_mock?: boolean;
}

export function sanitizeCustomerPhone(inputPhone?: string): string {
  if (!inputPhone) return '9876543210';
  let digits = inputPhone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 9) {
    return digits + '0';
  }
  if (digits.length < 10) {
    return (digits + '9876543210').slice(0, 10);
  }
  if (digits.length > 15) {
    return digits.slice(0, 15);
  }
  return digits;
}

export async function createCashfreeOrder(params: CashfreeOrderParams): Promise<CashfreeCreateOrderResult> {
  const isRealCredentials =
    process.env.CASHFREE_APP_ID &&
    !process.env.CASHFREE_APP_ID.includes('TEST_CF_APP_PERZENT');

  if (isRealCredentials) {
    const cleanPhone = sanitizeCustomerPhone(params.customer_phone);
    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': CASHFREE_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: params.order_id,
        order_amount: params.order_amount,
        order_currency: params.order_currency || 'INR',
        customer_details: {
          customer_id: params.customer_id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50),
          customer_name: params.customer_name || 'Business Owner',
          customer_phone: cleanPhone,
          customer_email: params.customer_email || 'billing@perzent.app',
        },
        order_meta: {
          return_url: params.return_url,
          notify_url: params.notify_url,
          payment_methods: 'cc,dc,upi,nb',
        },
        order_note: params.order_note || 'Perzent Employee Seat (₹99 + 18% GST)',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Cashfree order creation failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const data = await response.json();
    return {
      cf_order_id: String(data.cf_order_id),
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status,
      order_amount: data.order_amount,
      order_currency: data.order_currency,
      is_mock: false,
    };
  }

  if (!ALLOW_MOCK) throw new Error('Cashfree credentials are not configured');

  // Explicit local-only simulator. It can never be enabled in production.
  const mockCfOrderId = `cf_ord_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const mockSessionId = `session_${Math.random().toString(36).substring(2)}${Date.now()}`;

  return {
    cf_order_id: mockCfOrderId,
    order_id: params.order_id,
    payment_session_id: mockSessionId,
    order_status: 'ACTIVE',
    order_amount: params.order_amount,
    order_currency: 'INR',
    is_mock: true,
  };
}

export async function getCashfreeOrderStatus(orderId: string): Promise<{
  order_status: 'PAID' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  payment_method?: string;
  bank_reference?: string;
}> {
  const isRealCredentials =
    process.env.CASHFREE_APP_ID &&
    !process.env.CASHFREE_APP_ID.includes('TEST_CF_APP_PERZENT');

  if (isRealCredentials) {
    const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': CASHFREE_API_VERSION,
      },
    });
    if (!response.ok) throw new Error(`Cashfree status request failed (${response.status})`);
    const data = await response.json();
    return {
      order_status: data.order_status,
      payment_method: data.order_meta?.payment_methods || 'UPI',
    };
  }

  if (!ALLOW_MOCK) throw new Error('Cashfree credentials are not configured');
  return {
    order_status: 'PAID',
    payment_method: 'UPI (Cashfree Gateway)',
    bank_reference: `CF-REF-${Date.now().toString().slice(-8)}`,
  };
}

export function verifyCashfreeWebhook(rawBody: string, timestamp: string | null, signature: string | null) {
  if (!CASHFREE_SECRET_KEY || !timestamp || !signature) return false;
  const expected = createHmac('sha256', CASHFREE_SECRET_KEY)
    .update(timestamp + rawBody)
    .digest('base64');
  return safeEqual(expected, signature);
}

export function getCashfreeConfig() {
  return {
    mode: CASHFREE_ENV,
    base_price: EMPLOYEE_BASE_PRICE_INR,
    gst_rate: 0.18,
    gst_amount: GST_AMOUNT_INR,
    total_amount: EMPLOYEE_TOTAL_PRICE_INR,
    currency: 'INR',
  };
}
