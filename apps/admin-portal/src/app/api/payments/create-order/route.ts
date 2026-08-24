import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@perzent/database';
import {
  CreatePaymentOrderSchema,
  EMPLOYEE_BASE_PRICE_INR,
  GST_AMOUNT_INR,
  EMPLOYEE_TOTAL_PRICE_INR,
} from '@perzent/shared-types';
import { createCashfreeOrder } from '@/lib/cashfree';
import { authErrorResponse, requireSession } from '@/lib/auth';
import { normalizeIndianPhone } from '@/lib/payments';

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const parsed = CreatePaymentOrderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }
    const data = parsed.data;
    const phone = normalizeIndianPhone(data.employee_phone);
    const [company, duplicate, department, manager] = await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: session.companyId } }),
      prisma.user.findFirst({ where: { company_id: session.companyId, phone } }),
      data.employee_department_id
        ? prisma.department.findFirst({ where: { id: data.employee_department_id, company_id: session.companyId } })
        : prisma.department.findFirst({ where: { company_id: session.companyId }, orderBy: { created_at: 'asc' } }),
      data.employee_manager_id
        ? prisma.user.findFirst({ where: { id: data.employee_manager_id, company_id: session.companyId, role: { in: ['OWNER', 'MANAGER'] } } })
        : Promise.resolve(null),
    ]);
    if (duplicate) return NextResponse.json({ error: 'An employee with this phone already exists' }, { status: 409 });
    if (data.employee_department_id && !department) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
    }
    if (data.employee_manager_id && !manager) {
      return NextResponse.json({ error: 'Invalid manager' }, { status: 400 });
    }

    const orderId = `order_${crypto.randomUUID()}`;
    const origin = new URL(request.url).origin;
    const cfOrder = await createCashfreeOrder({
      order_id: orderId,
      order_amount: EMPLOYEE_TOTAL_PRICE_INR,
      order_currency: 'INR',
      customer_id: company.id,
      customer_name: data.customer_name || company.name,
      customer_phone: data.customer_phone || session.phone,
      customer_email: data.customer_email || session.email || company.owner_email,
      return_url: `${origin}/dashboard/employees?order_id=${encodeURIComponent(orderId)}`,
      notify_url: `${origin}/api/payments/webhook`,
      order_note: `Perzent seat for ${data.employee_name}`,
    });

    await prisma.paymentTransaction.create({
      data: {
        company_id: session.companyId,
        order_id: orderId,
        cashfree_order_id: cfOrder.cf_order_id,
        payment_session_id: cfOrder.payment_session_id,
        employee_name: data.employee_name,
        employee_phone: phone,
        employee_email: data.employee_email?.toLowerCase() || null,
        employee_password_hash: await hash(data.employee_password, 12),
        employee_designation: data.employee_designation,
        employee_role: data.employee_role,
        employee_department_id: department?.id,
        employee_manager_id: manager?.id,
        base_price: EMPLOYEE_BASE_PRICE_INR,
        tax_amount: GST_AMOUNT_INR,
        total_amount: EMPLOYEE_TOTAL_PRICE_INR,
      },
    });

    return NextResponse.json({
      order_id: orderId,
      cf_order_id: cfOrder.cf_order_id,
      payment_session_id: cfOrder.payment_session_id,
      order_amount: EMPLOYEE_TOTAL_PRICE_INR,
      pricing: {
        base_price_inr: EMPLOYEE_BASE_PRICE_INR,
        tax_rate_pct: 18,
        tax_amount_inr: GST_AMOUNT_INR,
        total_price_inr: EMPLOYEE_TOTAL_PRICE_INR,
        currency: 'INR',
      },
      is_mock: cfOrder.is_mock,
      cashfree_mode: process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox',
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
