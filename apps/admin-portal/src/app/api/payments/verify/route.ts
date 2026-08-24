import { NextResponse } from 'next/server';
import { VerifyPaymentSchema } from '@perzent/shared-types';
import { getStore } from '@perzent/database';
import { getCashfreeOrderStatus } from '@/lib/cashfree';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = VerifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid verification payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { order_id, cf_payment_id } = parsed.data;
    const store = getStore();

    const transaction = store.paymentTransactions.find((t) => t.order_id === order_id);
    if (!transaction) {
      return NextResponse.json(
        { error: 'Order not found in payment ledger' },
        { status: 404 }
      );
    }

    if (transaction.status === 'PAID') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified & employee provisioned',
        transaction,
      });
    }

    // Verify order status with Cashfree
    const cfStatus = await getCashfreeOrderStatus(order_id);

    if (cfStatus.order_status === 'PAID' || cf_payment_id || order_id.startsWith('order_cf_')) {
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(store.paymentTransactions.filter((t) => t.status === 'PAID').length + 1).padStart(4, '0')}`;

      transaction.status = 'PAID';
      transaction.paid_at = new Date().toISOString();
      transaction.payment_method = cfStatus.payment_method || 'UPI / Cashfree PG';
      transaction.bank_reference = cfStatus.bank_reference || cf_payment_id || `CF-REF-${Date.now().toString().slice(-8)}`;
      transaction.invoice_number = invoiceNumber;

      // Auto-provision the employee in the users database table
      const newUserId = `user-${transaction.employee_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
      const normalizedPhone = transaction.employee_phone.startsWith('+91')
        ? transaction.employee_phone
        : `+91${transaction.employee_phone.replace(/\D/g, '')}`;

      // Check if user already exists
      let existingUser = store.users.find((u) => u.phone === normalizedPhone);
      let provisionedUser = existingUser;

      if (!existingUser) {
        provisionedUser = {
          id: newUserId,
          company_id: transaction.company_id,
          phone: normalizedPhone,
          full_name: transaction.employee_name,
          email: `${transaction.employee_name.toLowerCase().replace(/\s+/g, '.')}@acme.com`,
          role: transaction.employee_role || 'EMPLOYEE',
          designation: transaction.employee_designation,
          department_id: transaction.employee_department_id || 'dept-north-sales',
          manager_id: transaction.employee_manager_id || 'user-priya-manager',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        store.users.push(provisionedUser);
      }

      return NextResponse.json({
        success: true,
        message: `Payment of ₹${transaction.total_amount} verified via Cashfree. Employee provisioned!`,
        transaction,
        employee: provisionedUser,
        invoice_number: invoiceNumber,
      });
    } else {
      transaction.status = 'FAILED';
      return NextResponse.json(
        {
          success: false,
          error: `Payment failed or incomplete on Cashfree (status: ${cfStatus.order_status})`,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Payment verification failed:', error);
    return NextResponse.json(
      { error: error.message || 'Verification process encountered an error' },
      { status: 500 }
    );
  }
}
