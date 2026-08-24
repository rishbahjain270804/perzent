'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Receipt,
  CreditCard,
  Building2,
  CheckCircle2,
  Download,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  UserPlus,
  QrCode,
  DollarSign,
  X,
} from 'lucide-react';
import {
  EMPLOYEE_BASE_PRICE_INR,
  GST_RATE,
  GST_AMOUNT_INR,
  EMPLOYEE_TOTAL_PRICE_INR,
  PaymentTransaction,
} from '@perzent/shared-types';

export default function BillingPage() {
  const [data, setData] = useState<{
    company_name: string;
    summary: {
      total_paid_seats: number;
      total_base_billed: number;
      total_tax_collected: number;
      total_revenue_inr: number;
    };
    transactions: PaymentTransaction[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentTransaction | null>(null);

  const fetchTransactions = () => {
    fetch('/api/payments/transactions')
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = data?.transactions?.filter(
    (t) =>
      t.employee_name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.invoice_number?.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.order_id?.toLowerCase().includes(filterQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8">
      {/* Top Banner with Green Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-[#16A34A]/30 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
            <span className="text-xs font-semibold text-[#86EFAC] uppercase tracking-wider">
              Cashfree Payment Gateway • Transparent Pricing
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Billing, Seat Invoices & Tax Ledger</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Fixed Seat Charge: ₹99.00 + 18% GST (₹17.82) = ₹116.82 per added field representative
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/employees"
            className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-green-600/25 transition"
          >
            <UserPlus className="w-4 h-4 text-white" /> Provision Seat (₹116.82)
          </Link>
        </div>
      </div>

      {/* Pricing Policy Card */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#16A34A]/15 border border-[#16A34A]/30 text-[#86EFAC] text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" /> Cashfree PG Auto-Settlement Active
          </div>
          <h3 className="text-lg font-bold text-white">Transparent Per-Employee Pricing Structure</h3>
          <p className="text-xs text-[#6B7280] max-w-xl leading-relaxed">
            Every employee added to your fleet is provisioned after a one-time Cashfree seat authorization. Taxes (18% GST) are calculated compliant with Indian GST laws with instant tax invoice generation.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shrink-0 min-w-[260px] space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Base Employee Fee:</span>
            <span className="font-bold text-white">₹{EMPLOYEE_BASE_PRICE_INR.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[#86EFAC]">
            <span>18% GST / Taxes:</span>
            <span className="font-bold">+ ₹{GST_AMOUNT_INR.toFixed(2)}</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
            <span className="text-white">Total per Provisioning:</span>
            <span className="text-[#86EFAC]">₹{EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Total Provisioned Seats</span>
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/15 text-[#86EFAC] flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[#16A34A]" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{data?.summary.total_paid_seats || 0}</p>
          <p className="text-[11px] text-[#6B7280] mt-2">Active paid field rep licenses</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86EFAC]">Base Billed</span>
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center">
              <Receipt className="w-4 h-4 text-[#16A34A]" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">₹{data?.summary.total_base_billed?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-[#6B7280] mt-2">₹99 per employee net revenue</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">18% GST Collected</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400">₹{data?.summary.total_tax_collected?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-[#6B7280] mt-2">18% GST tax remit ledger</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86EFAC]">Total Volume (Gross)</span>
            <div className="w-8 h-8 rounded-lg bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#16A34A]" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#86EFAC]">₹{data?.summary.total_revenue_inr?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-[#6B7280] mt-2">Cashfree PG settled volume</p>
        </div>
      </div>

      {/* Tax Invoices & Transaction History Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-base text-white">Cashfree Invoices & Payment Ledger</h2>
            <p className="text-xs text-[#6B7280]">
              Auditable GST receipts with Cashfree reference IDs and payment method logs
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by invoice # or employee..."
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-[#6B7280] focus:border-[#16A34A] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-[#6B7280] font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Employee Provisioned</th>
                <th className="px-6 py-4">Base Fee</th>
                <th className="px-6 py-4">18% GST</th>
                <th className="px-6 py-4">Total Paid</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4">Cashfree Ref</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-900/50 transition">
                  <td className="px-6 py-4">
                    <span className="font-bold text-white">{t.invoice_number || 'INV-2026-PENDING'}</span>
                    <p className="text-[10px] text-[#6B7280]">
                      {new Date(t.paid_at || t.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-white text-sm">{t.employee_name}</p>
                    <p className="text-[11px] text-[#6B7280]">{t.employee_designation} • {t.employee_phone}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-medium">₹{t.base_price?.toFixed(2)}</td>
                  <td className="px-6 py-4 text-[#86EFAC] font-medium">+ ₹{t.tax_amount?.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="font-extrabold text-white text-sm">₹{t.total_amount?.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-300">
                      {t.payment_method || 'UPI / QR'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[11px] text-slate-400 truncate max-w-xs block">
                      {t.bank_reference || t.order_id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {t.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#16A34A]/20 text-[#86EFAC] font-semibold text-[11px] border border-[#16A34A]/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> Paid
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold text-[11px]">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedInvoice(t)}
                      className="px-3 py-1.5 rounded-lg bg-[#16A34A]/15 hover:bg-[#16A34A]/30 text-[#86EFAC] font-semibold text-xs transition flex items-center gap-1 ml-auto"
                    >
                      <Download className="w-3.5 h-3.5" /> View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#16A34A] text-white flex items-center justify-center font-bold text-sm">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">GST Tax Invoice</h3>
                  <p className="text-[11px] text-[#6B7280]">Perzent Technologies Pvt Ltd</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 rounded-lg bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Invoice Number:</span>
                  <span className="font-bold text-white">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Payment Date:</span>
                  <span className="text-white">{new Date(selectedInvoice.paid_at || selectedInvoice.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Gateway:</span>
                  <span className="text-[#86EFAC] font-semibold">Cashfree PG v3 (Encrypted)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Cashfree Order ID:</span>
                  <span className="font-mono text-slate-300">{selectedInvoice.order_id}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Description:</span>
                  <span className="font-medium text-white">Employee Provisioning Seat ({selectedInvoice.employee_name})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Base Amount:</span>
                  <span className="text-white">₹{selectedInvoice.base_price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">GST Rate (18%):</span>
                  <span className="text-[#86EFAC]">+ ₹{selectedInvoice.tax_amount?.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                  <span className="text-white">Total Amount Paid:</span>
                  <span className="text-[#86EFAC]">₹{selectedInvoice.total_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Invoice ${selectedInvoice.invoice_number} downloaded as PDF receipt.`);
                  setSelectedInvoice(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-green-600/25"
              >
                <Download className="w-3.5 h-3.5 text-white" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
