import { NextResponse } from 'next/server';
import { getStore } from '@perzent/database';
import {
  EMPLOYEE_BASE_PRICE_INR,
  GST_RATE,
  GST_AMOUNT_INR,
  EMPLOYEE_TOTAL_PRICE_INR,
} from '@perzent/shared-types';

export async function GET() {
  try {
    const store = getStore();
    const company = store.companies[0];
    const transactions = store.paymentTransactions || [];

    const totalPaid = transactions
      .filter((t) => t.status === 'PAID')
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);

    const totalTaxCollected = transactions
      .filter((t) => t.status === 'PAID')
      .reduce((sum, t) => sum + (t.tax_amount || 0), 0);

    const totalBaseBilled = transactions
      .filter((t) => t.status === 'PAID')
      .reduce((sum, t) => sum + (t.base_price || 0), 0);

    const paidSeatsCount = transactions.filter((t) => t.status === 'PAID').length;

    return NextResponse.json({
      company_name: company?.name || 'Acme Logistics Pvt Ltd',
      pricing_policy: {
        base_price_per_employee: EMPLOYEE_BASE_PRICE_INR, // ₹99
        tax_rate: GST_RATE, // 18%
        tax_amount: GST_AMOUNT_INR, // ₹17.82
        total_price_per_employee: EMPLOYEE_TOTAL_PRICE_INR, // ₹116.82
        currency: 'INR',
        gateway: 'Cashfree Payments (PG v3)',
      },
      summary: {
        total_paid_seats: paidSeatsCount,
        total_base_billed: Number(totalBaseBilled.toFixed(2)),
        total_tax_collected: Number(totalTaxCollected.toFixed(2)),
        total_revenue_inr: Number(totalPaid.toFixed(2)),
      },
      transactions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve transactions' },
      { status: 500 }
    );
  }
}
