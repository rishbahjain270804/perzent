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
  UserPlus,
  Search,
  X,
  RefreshCw,
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
  const [error, setError] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentTransaction | null>(null);

  const fetchTransactions = () => {
    setLoading(true);
    setError('');
    fetch('/api/payments/transactions', { cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Could not load billing data');
        if (!payload?.summary || !Array.isArray(payload.transactions)) {
          throw new Error('Billing API returned an incomplete response');
        }
        return payload;
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((reason) => {
        setData(null);
        setError(reason instanceof Error ? reason.message : 'Could not load billing data');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions =
    data?.transactions?.filter(
      (t) =>
        t.employee_name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        t.invoice_number?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        t.order_id?.toLowerCase().includes(filterQuery.toLowerCase())
    ) || [];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Billing & Tax Ledger</h1>
          <p className="text-[11px] text-[#6B7280]">
            Cashfree PG seat licenses • ₹{EMPLOYEE_BASE_PRICE_INR.toFixed(2)} + 18% GST (₹{GST_AMOUNT_INR.toFixed(2)}) = ₹{EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)} per representative
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
            title="Refresh Invoices"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/dashboard/employees"
            className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Seat (₹116.82)
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 4-Cell Metric Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-slate-800 bg-[#0B1120] rounded-lg divide-y md:divide-y-0 md:divide-x divide-slate-800">
        <div className="p-3.5">
          <span className="text-[#6B7280] text-[11px]">Paid Seats Enrolled</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">
            {data?.summary?.total_paid_seats || 0}
          </p>
          <span className="text-[10px] text-[#6B7280]">Active licenses</span>
        </div>

        <div className="p-3.5">
          <span className="text-[#86EFAC] text-[11px]">Net Base Billed</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-[#86EFAC]">
            ₹{data?.summary?.total_base_billed?.toFixed(2) || '0.00'}
          </p>
          <span className="text-[10px] text-[#6B7280]">₹99.00 / seat fee</span>
        </div>

        <div className="p-3.5">
          <span className="text-amber-400 text-[11px]">18% GST Remitted</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-amber-400">
            ₹{data?.summary?.total_tax_collected?.toFixed(2) || '0.00'}
          </p>
          <span className="text-[10px] text-[#6B7280]">GSTIN compliant</span>
        </div>

        <div className="p-3.5">
          <span className="text-[#86EFAC] text-[11px]">Gross Gateway Volume</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-[#86EFAC]">
            ₹{data?.summary?.total_revenue_inr?.toFixed(2) || '0.00'}
          </p>
          <span className="text-[10px] text-[#6B7280]">Cashfree PG settled</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search invoice number, rep name, or order ID..."
            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-800 bg-[#0B1120] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <span className="text-[11px] text-[#6B7280]">{filteredTransactions.length} recorded invoices</span>
      </div>

      {/* Dense Tabular Tax Invoice Ledger */}
      <div className="border border-slate-800 bg-[#0B1120] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-4 py-2.5">Invoice #</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Employee Provisioned</th>
                <th className="px-4 py-2.5">Base (₹)</th>
                <th className="px-4 py-2.5">18% GST</th>
                <th className="px-4 py-2.5">Total Paid</th>
                <th className="px-4 py-2.5">Method</th>
                <th className="px-4 py-2.5">Cashfree Ref</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-850/40 transition">
                  <td className="px-4 py-2.5 font-mono font-bold text-white">
                    {t.invoice_number || 'INV-PENDING'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                    {new Date(t.paid_at || t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-white leading-tight">{t.employee_name}</p>
                    <p className="text-[10px] text-[#6B7280] leading-tight">{t.employee_designation} • {t.employee_phone}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">₹{t.base_price?.toFixed(2)}</td>
                  <td className="px-4 py-2.5 font-mono text-[#86EFAC]">+₹{t.tax_amount?.toFixed(2)}</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-white">₹{t.total_amount?.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-300">{t.payment_method || 'UPI'}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                    {t.bank_reference || t.order_id}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#16A34A]" /> Paid
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setSelectedInvoice(t)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Minimalist Flat Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-[#0B1120] border border-slate-800 rounded-lg p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#16A34A] text-white font-bold flex items-center justify-center text-xs">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Tax Invoice</h3>
                  <p className="text-[10px] text-[#6B7280]">Perzent Workforce Platform</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 p-3 rounded border border-slate-800 bg-slate-900/60 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Invoice Number:</span>
                <span className="font-bold text-white">{selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Date:</span>
                <span className="text-slate-200">{new Date(selectedInvoice.paid_at || selectedInvoice.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Cashfree Order ID:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{selectedInvoice.order_id}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Item:</span>
                <span className="text-white">Field Rep License ({selectedInvoice.employee_name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Base Seat Fee:</span>
                <span className="text-white">₹{selectedInvoice.base_price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">18% GST / Taxes:</span>
                <span className="text-[#86EFAC]">+₹{selectedInvoice.tax_amount?.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                <span className="text-white">Total Amount Paid:</span>
                <span className="text-[#86EFAC]">₹{selectedInvoice.total_amount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Invoice ${selectedInvoice.invoice_number} downloaded.`);
                  setSelectedInvoice(null);
                }}
                className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
