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
        return payload;
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : 'Could not load billing data');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const summary = data?.summary || {
    total_paid_seats: 0,
    total_base_billed: 0,
    total_tax_collected: 0,
    total_revenue_inr: 0,
  };

  const filteredTransactions =
    data?.transactions?.filter(
      (t) =>
        t.employee_name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        t.invoice_number?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        t.order_id?.toLowerCase().includes(filterQuery.toLowerCase())
    ) || [];

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto pb-16 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-sm md:text-base font-bold dashboard-strong tracking-tight">Billing & Tax Ledger</h1>
          <p className="text-[10px] md:text-[11px] text-[#6B7280]">
            Cashfree PG • ₹{EMPLOYEE_BASE_PRICE_INR.toFixed(2)} + 18% GST (₹{GST_AMOUNT_INR.toFixed(2)}) = ₹{EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)} / seat
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={fetchTransactions}
            className="p-1.5 rounded border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white transition"
            title="Refresh Invoices"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/dashboard/employees"
            className="px-2.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Seat (₹116.82)
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 4-Cell Metric Summary Grid (2 cols mobile, 4 desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-[#6B7280] text-[10px] uppercase font-semibold">Paid Seats</span>
          <p className="text-lg md:text-xl font-bold dashboard-strong mt-0.5 tabular-nums">
            {summary.total_paid_seats}
          </p>
          <span className="text-[10px] text-[#6B7280]">Active licenses</span>
        </div>

        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-emerald-400 text-[10px] uppercase font-semibold">Net Base Billed</span>
          <p className="text-lg md:text-xl font-bold text-emerald-400 mt-0.5 tabular-nums">
            ₹{summary.total_base_billed.toFixed(2)}
          </p>
          <span className="text-[10px] text-[#6B7280]">₹99.00 / seat fee</span>
        </div>

        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-amber-400 text-[10px] uppercase font-semibold">18% GST</span>
          <p className="text-lg md:text-xl font-bold text-amber-400 mt-0.5 tabular-nums">
            ₹{summary.total_tax_collected.toFixed(2)}
          </p>
          <span className="text-[10px] text-[#6B7280]">GSTIN compliant</span>
        </div>

        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-emerald-400 text-[10px] uppercase font-semibold">Gross Volume</span>
          <p className="text-lg md:text-xl font-bold text-emerald-400 mt-0.5 tabular-nums">
            ₹{summary.total_revenue_inr.toFixed(2)}
          </p>
          <span className="text-[10px] text-[#6B7280]">Cashfree settled</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search invoice or rep name..."
            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-700 bg-[#0B1120] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <span className="text-[10px] md:text-[11px] text-[#6B7280]">{filteredTransactions.length} invoices</span>
      </div>

      {/* ─── Mobile Card List ─── */}
      <div className="md:hidden space-y-2">
        {filteredTransactions.map((t) => (
          <div key={t.id} className="dashboard-card rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-xs dashboard-strong">{t.invoice_number || 'INV-PENDING'}</span>
                <p className="text-[10px] text-[#6B7280]">{new Date(t.paid_at || t.created_at).toLocaleDateString()}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                <CheckCircle2 className="w-2.5 h-2.5 text-[#16A34A]" /> ₹{t.total_amount?.toFixed(2)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold dashboard-strong">{t.employee_name}</p>
                <p className="text-[10px] text-[#6B7280]">{t.employee_designation} • {t.employee_phone}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(t)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium transition inline-flex items-center gap-1 shrink-0"
              >
                <Download className="w-3 h-3" /> View
              </button>
            </div>
          </div>
        ))}
        {filteredTransactions.length === 0 && !loading && (
          <p className="text-center text-[#6B7280] text-[11px] py-8">No invoice records found.</p>
        )}
      </div>

      {/* ─── Desktop Table ─── */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-3 py-2">Invoice #</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Employee Provisioned</th>
                <th className="px-3 py-2">Base (₹)</th>
                <th className="px-3 py-2">18% GST</th>
                <th className="px-3 py-2">Total Paid</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/20 transition">
                  <td className="px-3 py-2 font-mono font-bold dashboard-strong">
                    {t.invoice_number || 'INV-PENDING'}
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-[11px]">
                    {new Date(t.paid_at || t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold dashboard-strong leading-tight">{t.employee_name}</p>
                    <p className="text-[10px] text-[#6B7280] leading-tight">{t.employee_designation} • {t.employee_phone}</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-300">₹{t.base_price?.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-emerald-400">+₹{t.tax_amount?.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono font-bold dashboard-strong">₹{t.total_amount?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-300">{t.payment_method || 'UPI'}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#16A34A]" /> Paid
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setSelectedInvoice(t)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium transition inline-flex items-center gap-1"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="max-w-md w-full dashboard-card rounded-lg p-4 sm:p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#16A34A] text-white font-bold flex items-center justify-center text-xs">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-sm dashboard-strong">Tax Invoice</h3>
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

            <div className="space-y-1.5 p-2.5 rounded border border-slate-800 bg-slate-900/60 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Invoice Number:</span>
                <span className="font-bold dashboard-strong">{selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Date:</span>
                <span className="text-slate-200">{new Date(selectedInvoice.paid_at || selectedInvoice.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Order ID:</span>
                <span className="text-slate-300 truncate max-w-[180px]">{selectedInvoice.order_id}</span>
              </div>
            </div>

            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Item:</span>
                <span className="dashboard-strong">Field Rep License ({selectedInvoice.employee_name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Base Seat Fee:</span>
                <span>₹{selectedInvoice.base_price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">18% GST:</span>
                <span className="text-emerald-400">+₹{selectedInvoice.tax_amount?.toFixed(2)}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-sm">
                <span>Total Paid:</span>
                <span className="text-emerald-400">₹{selectedInvoice.total_amount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
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
