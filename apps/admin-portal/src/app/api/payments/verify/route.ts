import { NextResponse } from 'next/server';
import { VerifyPaymentSchema } from '@perzent/shared-types';
import { prisma } from '@perzent/database';
import { getCashfreeOrderStatus } from '@/lib/cashfree';
import { authErrorResponse, requireSession } from '@/lib/auth';
import { markPaymentPaidAndProvision, paymentView } from '@/lib/payments';

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const parsed = VerifyPaymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid verification payload', details: parsed.error.format() }, { status: 400 });
    }
    const ledgerEntry = await prisma.paymentTransaction.findFirst({
      where: { order_id: parsed.data.order_id, company_id: session.companyId },
    });
    if (!ledgerEntry) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (ledgerEntry.status === 'PAID' && ledgerEntry.provisioned_user_id) {
      return NextResponse.json({ success: true, transaction: paymentView(ledgerEntry) });
    }
    const cashfree = await getCashfreeOrderStatus(ledgerEntry.order_id);
    if (cashfree.order_status !== 'PAID') {
      return NextResponse.json({ success: false, error: `Payment is ${cashfree.order_status}` }, { status: 409 });
    }

    const result = await markPaymentPaidAndProvision(ledgerEntry.order_id, {
      paymentMethod: cashfree.payment_method,
      bankReference: cashfree.bank_reference,
    });
    return NextResponse.json({
      success: true,
      message: 'Payment verified and employee provisioned.',
      transaction: paymentView(result.transaction),
      employee: { id: result.user.id, full_name: result.user.full_name, phone: result.user.phone },
      invoice_number: result.invoiceNumber,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
