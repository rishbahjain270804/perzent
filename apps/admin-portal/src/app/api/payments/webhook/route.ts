import { NextResponse } from 'next/server';
import { verifyCashfreeWebhook } from '@/lib/cashfree';
import { markPaymentPaidAndProvision } from '@/lib/payments';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    const timestamp = request.headers.get('x-webhook-timestamp');
    if (!verifyCashfreeWebhook(rawBody, timestamp, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const orderId = event.data?.order?.order_id || event.order_id;
    const paymentStatus = event.data?.payment?.payment_status || event.txStatus;
    if (orderId && ['SUCCESS', 'PAID'].includes(paymentStatus)) {
      await markPaymentPaidAndProvision(orderId, {
        paymentMethod: event.data?.payment?.payment_group,
        bankReference: event.data?.payment?.bank_reference || event.referenceId,
      });
    }
    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
