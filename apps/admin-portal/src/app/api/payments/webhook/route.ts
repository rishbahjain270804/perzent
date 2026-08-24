import { NextResponse } from 'next/server';
import { getStore } from '@perzent/database';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const event = JSON.parse(rawBody || '{}');

    const store = getStore();

    // Cashfree PG Webhook payload structure (v3 2023-08-01)
    const orderId = event.data?.order?.order_id || event.order_id;
    const paymentStatus = event.data?.payment?.payment_status || event.txStatus;

    if (orderId) {
      const transaction = store.paymentTransactions.find((t) => t.order_id === orderId);
      if (transaction) {
        if (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') {
          transaction.status = 'PAID';
          transaction.paid_at = new Date().toISOString();
          transaction.payment_method = event.data?.payment?.payment_group || 'Cashfree Webhook';
          transaction.bank_reference = event.data?.payment?.bank_reference || event.referenceId;
        } else if (paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED') {
          transaction.status = 'FAILED';
        }
      }
    }

    return NextResponse.json({ status: 'OK', processed: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
