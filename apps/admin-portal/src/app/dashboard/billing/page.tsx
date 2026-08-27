'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt, Users, Shield, Smartphone, CheckCircle2, RefreshCw, UserPlus } from 'lucide-react';
import type { PaymentTransaction } from '@perzent/shared-types';
import { apiFetch, errorMessage, formatDate } from '@/lib/client';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  ErrorBanner,
  LoadingRows,
  useSession,
  iconBtn,
  btnPrimary,
  tableHeadRow,
  tableRow,
} from '@/components';

interface StaffSummary {
  total: number;
  managers: number;
  bound: number;
}

interface TransactionsResponse {
  transactions: PaymentTransaction[];
  summary?: Record<string, number>;
}

const PLAN_FEATURES = [
  'Unlimited employees and managers',
  'Live map, route history and dwell stops',
  'Attendance, breaks, auto check-out and manual corrections',
  'Timesheets with overtime and CSV export',
  'Leave requests, reports, geofenced sites, kiosk mode',
];

function planName(tier?: string | null) {
  if (!tier || /free|launch/i.test(tier)) return 'Free launch plan';
  return tier.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PlanPage() {
  const { session, error: sessionError, reload: reloadSession, loading: sessionLoading } = useSession();
  const [staff, setStaff] = useState<StaffSummary | null>(null);
  const [staffError, setStaffError] = useState('');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState('');

  const loadStaff = useCallback(async () => {
    try {
      const rows = await apiFetch<Array<{ role: string; status: string; is_device_bound?: boolean }>>('/api/employees');
      const list = Array.isArray(rows) ? rows : [];
      setStaff({
        total: list.filter((r) => r.status !== 'TERMINATED').length,
        managers: list.filter((r) => r.role === 'MANAGER' && r.status !== 'TERMINATED').length,
        bound: list.filter((r) => r.is_device_bound).length,
      });
      setStaffError('');
    } catch (reason) {
      setStaffError(errorMessage(reason, 'Could not load staff usage.'));
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const data = await apiFetch<TransactionsResponse>('/api/payments/transactions');
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      setTxError('');
    } catch (reason) {
      setTxError(errorMessage(reason, 'Could not load the transaction ledger.'));
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
    loadTransactions();
  }, [loadStaff, loadTransactions]);

  const tier = session?.company?.plan_tier;
  const amount = (value?: number | null) => (typeof value === 'number' ? `₹${value.toFixed(2)}` : '—');

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Plan & usage"
        description="Your workspace is on the free launch plan. Billing is informational only — nothing is charged."
        actions={
          <>
            <button
              onClick={() => {
                loadStaff();
                loadTransactions();
              }}
              disabled={txLoading}
              className={iconBtn}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${txLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/dashboard/employees" className={btnPrimary}>
              <UserPlus className="w-3.5 h-3.5" /> Add employee (free)
            </Link>
          </>
        }
      />

      <ErrorBanner message={sessionError} onRetry={reloadSession} retrying={sessionLoading} />
      <ErrorBanner message={staffError} onRetry={loadStaff} />

      {/* Plan card */}
      <div className="dashboard-card rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm dashboard-strong">{planName(tier)}</h2>
              <StatusBadge status="ACTIVE" label="Current" />
            </div>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Unlimited seats, all features included. {session?.company?.name ? `Workspace: ${session.company.name}.` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold dashboard-strong tabular-nums">₹0<span className="text-xs font-normal text-[#6B7280]"> / month</span></p>
            <p className="text-[10px] text-[#6B7280]">No card on file</p>
          </div>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300">
          {PLAN_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-[#16A34A] shrink-0 mt-0.5" /> {feature}
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-[#6B7280]">
          If paid plans are introduced later you will be told in advance; nothing changes automatically.
        </p>
      </div>

      {/* Usage */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Staff" value={staff ? staff.total : '—'} icon={Users} hint="Unlimited on this plan" />
        <StatCard label="Managers" value={staff ? staff.managers : '—'} icon={Shield} tone="info" />
        <StatCard label="Devices bound" value={staff ? staff.bound : '—'} icon={Smartphone} tone="success" />
        <StatCard label="Amount due" value="₹0.00" icon={Receipt} hint="Free launch plan" />
      </div>

      {/* Ledger */}
      <div className="dashboard-card rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-800/60 flex items-center justify-between">
          <span className="font-semibold text-xs dashboard-strong">Transaction ledger</span>
          <span className="text-[11px] text-[#6B7280]">{transactions.length} record{transactions.length === 1 ? '' : 's'}</span>
        </div>
        <div className="p-3 pb-0">
          <ErrorBanner message={txError} onRetry={loadTransactions} retrying={txLoading} />
        </div>
        {txLoading ? (
          <LoadingRows rows={3} />
        ) : transactions.length === 0 ? (
          !txError && (
            <EmptyState
              icon={Receipt}
              title="No transactions"
              description="The launch plan is free, so there is nothing to bill. Any historical payments would appear here."
            />
          )
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-800/40">
              {transactions.map((t) => (
                <div key={t.id} className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs dashboard-strong">{t.invoice_number || t.order_id}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">{t.employee_name || '—'}</span>
                    <span className="font-mono dashboard-strong">{amount(t.total_amount)}</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280]">
                    {formatDate(t.paid_at || t.created_at)} · {t.payment_method || 'Method not recorded'}
                  </p>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={tableHeadRow}>
                    <th className="px-3 py-2">Invoice / order</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Base</th>
                    <th className="px-3 py-2">Tax</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {transactions.map((t) => (
                    <tr key={t.id} className={tableRow}>
                      <td className="px-3 py-2 font-mono dashboard-strong">
                        <p className="font-bold leading-tight">{t.invoice_number || '—'}</p>
                        <p className="text-[10px] text-[#6B7280] leading-tight truncate max-w-[180px]">{t.order_id}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-[11px]">{formatDate(t.paid_at || t.created_at)}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold dashboard-strong leading-tight">{t.employee_name || '—'}</p>
                        <p className="text-[10px] text-[#6B7280] leading-tight">{[t.employee_designation, t.employee_phone].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-300">{amount(t.base_price)}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{amount(t.tax_amount)}</td>
                      <td className="px-3 py-2 font-mono font-bold dashboard-strong">{amount(t.total_amount)}</td>
                      <td className="px-3 py-2 text-[11px] text-slate-300">{t.payment_method || <span className="text-slate-500">—</span>}</td>
                      <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
