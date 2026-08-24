import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { EMPLOYEE_BASE_PRICE_INR, GST_RATE, GST_AMOUNT_INR, EMPLOYEE_TOTAL_PRICE_INR } from '@perzent/shared-types';
import { authErrorResponse, requireSession } from '@/lib/auth';
import { paymentView } from '@/lib/payments';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const [company, transactions] = await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: session.companyId } }),
      prisma.paymentTransaction.findMany({ where: { company_id: session.companyId }, orderBy: { created_at: 'desc' } }),
    ]);
    const paid = transactions.filter((item: any) => item.status === 'PAID');
    return NextResponse.json({
      company_name: company?.name || 'Acme Logistics Pvt Ltd',
      pricing_policy: {
        base_price_per_employee: EMPLOYEE_BASE_PRICE_INR,
        tax_rate: GST_RATE,
        tax_amount: GST_AMOUNT_INR,
        total_price_per_employee: EMPLOYEE_TOTAL_PRICE_INR,
        currency: 'INR',
        gateway: 'Cashfree Payments',
      },
      summary: {
        total_paid_seats: paid.length,
        total_base_billed: paid.reduce((sum: number, item: any) => sum + Number(item.base_price || 0), 0),
        total_tax_collected: paid.reduce((sum: number, item: any) => sum + Number(item.tax_amount || 0), 0),
        total_revenue_inr: paid.reduce((sum: number, item: any) => sum + Number(item.total_amount || 0), 0),
      },
      transactions: transactions.map((t: any) => paymentView(t)),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
