import { NextResponse } from 'next/server';
import {
  CreatePaymentOrderSchema,
  EMPLOYEE_BASE_PRICE_INR,
  GST_AMOUNT_INR,
  EMPLOYEE_TOTAL_PRICE_INR,
  PaymentTransaction,
} from '@perzent/shared-types';
import { getStore } from '@perzent/database';
import { createCashfreeOrder } from '@/lib/cashfree';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreatePaymentOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      employee_name,
      employee_phone,
      employee_email,
      employee_designation,
      employee_role,
      employee_department_id,
      employee_manager_id,
      customer_name,
      customer_phone,
      customer_email,
    } = parsed.data;

    const store = getStore();
    const company = store.companies[0];
    const orderId = `order_cf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Call Cashfree API to create PG order
    const cfOrder = await createCashfreeOrder({
      order_id: orderId,
      order_amount: EMPLOYEE_TOTAL_PRICE_INR, // ₹116.82 (₹99 + 18% GST)
      order_currency: 'INR',
      customer_id: company.id,
      customer_name: customer_name || company.name || 'Acme Logistics',
      customer_phone: customer_phone || '9876543210',
      customer_email: customer_email || company.owner_email || 'billing@acmelogistics.com',
      order_note: `Perzent Field Rep Slot Provisioning: ${employee_name} (₹99 + 18% GST)`,
    });

    // Save pending transaction in store
    const transaction: PaymentTransaction = {
      id: `txn-${Date.now()}`,
      company_id: company.id,
      order_id: orderId,
      cashfree_order_id: cfOrder.cf_order_id,
      payment_session_id: cfOrder.payment_session_id,
      employee_name,
      employee_phone,
      employee_designation,
      employee_role,
      employee_department_id,
      employee_manager_id,
      base_price: EMPLOYEE_BASE_PRICE_INR,
      tax_amount: GST_AMOUNT_INR,
      total_amount: EMPLOYEE_TOTAL_PRICE_INR,
      currency: 'INR',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    store.paymentTransactions.unshift(transaction);

    return NextResponse.json({
      order_id: orderId,
      cf_order_id: cfOrder.cf_order_id,
      payment_session_id: cfOrder.payment_session_id,
      pricing: {
        base_price_inr: EMPLOYEE_BASE_PRICE_INR,
        tax_rate_pct: 18,
        tax_amount_inr: GST_AMOUNT_INR,
        total_price_inr: EMPLOYEE_TOTAL_PRICE_INR,
        currency: 'INR',
      },
      is_mock: cfOrder.is_mock,
    });
  } catch (error: any) {
    console.error('Failed to create Cashfree payment order:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
