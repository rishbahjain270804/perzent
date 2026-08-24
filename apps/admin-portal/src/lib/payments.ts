import { prisma } from '@perzent/database';
import type { Prisma } from '@prisma/client';

export function normalizeIndianPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

export async function markPaymentPaidAndProvision(
  orderId: string,
  payment: { paymentMethod?: string; bankReference?: string }
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const transaction = await tx.paymentTransaction.findUnique({ where: { order_id: orderId } });
    if (!transaction) throw new Error('Order not found in payment ledger');

    let user = transaction.provisioned_user_id
      ? await tx.user.findUnique({ where: { id: transaction.provisioned_user_id } })
      : null;
    if (!user) {
      user = await tx.user.findFirst({
        where: { company_id: transaction.company_id, phone: transaction.employee_phone },
      });
    }
    if (!user) {
      if (!transaction.employee_password_hash) throw new Error('Employee credentials are missing from the order');
      user = await tx.user.create({
        data: {
          company_id: transaction.company_id,
          phone: transaction.employee_phone,
          full_name: transaction.employee_name,
          email: transaction.employee_email,
          password_hash: transaction.employee_password_hash,
          role: transaction.employee_role,
          designation: transaction.employee_designation,
          department_id: transaction.employee_department_id,
          manager_id: transaction.employee_manager_id,
        },
      });
    }

    const invoiceNumber = transaction.invoice_number ||
      `INV-${new Date().getUTCFullYear()}-${transaction.order_id.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toUpperCase()}`;
    const updated = await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'PAID',
        paid_at: transaction.paid_at || new Date(),
        payment_method: payment.paymentMethod || transaction.payment_method,
        bank_reference: payment.bankReference || transaction.bank_reference,
        invoice_number: invoiceNumber,
        provisioned_user_id: user.id,
      },
    });
    return { transaction: updated, user, invoiceNumber };
  });
}

export const paymentView = (item: any) => ({
  ...item,
  base_price: Number(item.base_price),
  tax_amount: Number(item.tax_amount),
  total_amount: Number(item.total_amount),
  created_at: item.created_at.toISOString(),
  paid_at: item.paid_at?.toISOString(),
  updated_at: item.updated_at?.toISOString(),
  employee_password_hash: undefined,
});
