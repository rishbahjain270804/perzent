'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Smartphone,
  RotateCcw,
  CheckCircle2,
  X,
  Shield,
  CreditCard,
  Receipt,
  Search,
  RefreshCw,
} from 'lucide-react';
import {
  EMPLOYEE_BASE_PRICE_INR,
  GST_AMOUNT_INR,
  EMPLOYEE_TOTAL_PRICE_INR,
} from '@perzent/shared-types';
import { load } from '@cashfreepayments/cashfree-js';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCashfreeModal, setShowCashfreeModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'DETAILS' | 'CHECKOUT' | 'SUCCESS'>('DETAILS');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    designation: '',
    role: 'EMPLOYEE',
    department_id: '',
    manager_id: '',
  });
  const [message, setMessage] = useState('');

  const fetchEmployees = () => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => setEmployees(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleInitiateCashfreePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingPayment(true);

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_name: formData.full_name,
          employee_phone: formData.phone,
          employee_email: formData.email,
          employee_password: formData.password,
          employee_designation: formData.designation,
          employee_role: formData.role,
          employee_department_id: formData.department_id,
          employee_manager_id: formData.manager_id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentOrder(data);
        setPaymentStep('CHECKOUT');
      } else {
        alert(data.error || 'Failed to initialize Cashfree payment order');
      }
    } catch (err: any) {
      alert('Error communicating with Cashfree PG: ' + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCompleteCashfreePayment = async () => {
    if (!currentOrder) return;
    setProcessingPayment(true);

    try {
      const cashfree = await load({ mode: currentOrder.cashfree_mode || 'sandbox' });
      if (!cashfree) throw new Error('Cashfree checkout could not be loaded');
      const checkout = await cashfree.checkout({
        paymentSessionId: currentOrder.payment_session_id,
        redirectTarget: '_modal',
      });
      if (checkout.error && !checkout.paymentDetails) {
        throw new Error(checkout.error.message || 'Checkout was cancelled');
      }
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: currentOrder.order_id,
        }),
      });

      const verifyData = await res.json();
      if (res.ok && verifyData.success) {
        setLastInvoice(verifyData);
        setPaymentStep('SUCCESS');
        fetchEmployees();
      } else {
        alert(verifyData.error || 'Cashfree payment verification failed');
      }
    } catch (err: any) {
      alert('Verification request failed: ' + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleResetDevice = async (userId: string) => {
    if (!confirm('Are you sure you want to unbind this employee’s device lock?')) return;
    const res = await fetch('/api/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, action: 'RESET_DEVICE' }),
    });
    if (res.ok) {
      setMessage('Device binding reset successfully.');
      fetchEmployees();
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.designation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto pb-16 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-sm md:text-base font-bold dashboard-strong tracking-tight">Employee Directory & Licenses</h1>
          <p className="text-[10px] md:text-[11px] text-[#6B7280]">
            Field profiles, hardware UUID locks, and seat provisioning (₹116.82 / seat)
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={fetchEmployees}
            className="p-1.5 rounded border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white transition"
            title="Refresh List"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setPaymentStep('DETAILS');
              setShowCashfreeModal(true);
            }}
            className="px-2.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Employee (₹116.82)
          </button>
        </div>
      </div>

      {message && (
        <div className="p-2 rounded border border-[#16A34A]/40 bg-[#16A34A]/10 text-[#86EFAC] text-xs font-medium">
          {message}
        </div>
      )}

      {/* 4-Cell Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-[#6B7280] text-[10px] uppercase font-semibold">Total Employees</span>
          <p className="text-lg md:text-xl font-bold dashboard-strong mt-0.5 tabular-nums">{employees.length}</p>
          <span className="text-[10px] text-[#6B7280]">Enrolled personnel</span>
        </div>
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-emerald-400 text-[10px] uppercase font-semibold">Active Paid Seats</span>
          <p className="text-lg md:text-xl font-bold text-emerald-400 mt-0.5 tabular-nums">{employees.length}</p>
          <span className="text-[10px] text-[#6B7280]">Cashfree authorized</span>
        </div>
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-blue-400 text-[10px] uppercase font-semibold">Bound Devices</span>
          <p className="text-lg md:text-xl font-bold text-blue-400 mt-0.5 tabular-nums">
            {employees.filter((e) => e.device_uuid).length}
          </p>
          <span className="text-[10px] text-[#6B7280]">Hardware UUID locked</span>
        </div>
        <div className="dashboard-card p-3 rounded-lg">
          <span className="text-slate-400 text-[10px] uppercase font-semibold">Base License Fee</span>
          <p className="text-lg md:text-xl font-bold dashboard-strong mt-0.5 tabular-nums">₹99.00</p>
          <span className="text-[10px] text-[#6B7280]">₹116.82 incl. 18% GST</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone..."
            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-700 bg-[#0B1120] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <span className="text-[10px] md:text-[11px] text-[#6B7280]">{filteredEmployees.length} reps</span>
      </div>

      {/* ─── Mobile Card List ─── */}
      <div className="md:hidden space-y-2">
        {filteredEmployees.map((emp) => (
          <div key={emp.id} className="dashboard-card rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px] shrink-0">
                  {emp.full_name?.charAt(0) || 'E'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs dashboard-strong truncate">{emp.full_name}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{emp.designation || 'Representative'}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5 text-[#16A34A]" /> Paid
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-mono text-[10px]">{emp.phone}</span>
              {emp.device_uuid ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> {emp.device_model || 'Bound'}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 italic">No Device</span>
              )}
            </div>

            <div className="pt-1.5 flex justify-end gap-1.5 border-t border-slate-800/40">
              {emp.device_uuid && (
                <button
                  onClick={() => handleResetDevice(emp.id)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" /> Reset Lock
                </button>
              )}
              <Link
                href={`/dashboard/routes?user_id=${emp.id}`}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition"
              >
                Trail →
              </Link>
            </div>
          </div>
        ))}
        {filteredEmployees.length === 0 && (
          <p className="text-center text-[#6B7280] text-[11px] py-8">No employees found.</p>
        )}
      </div>

      {/* ─── Desktop Table ─── */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-3 py-2">Representative</th>
                <th className="px-3 py-2">Phone & Email</th>
                <th className="px-3 py-2">Designation</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Hardware Binding</th>
                <th className="px-3 py-2">Seat Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/20 transition">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px]">
                        {emp.full_name?.charAt(0)}
                      </div>
                      <span className="font-semibold dashboard-strong">{emp.full_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-300">
                    <p className="leading-tight">{emp.phone}</p>
                    <p className="text-[10px] text-[#6B7280] leading-tight">{emp.email}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{emp.designation || 'Representative'}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {emp.device_uuid ? (
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Smartphone className="w-3.5 h-3.5" />
                        <div>
                          <p className="text-[11px] font-mono text-slate-300 leading-tight">{emp.device_model || 'Bound Device'}</p>
                          <p className="text-[9px] text-[#6B7280] truncate max-w-[120px] font-mono">{emp.device_uuid}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No Device Bound</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#16A34A]" /> Paid (₹116.82)
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-1">
                    {emp.device_uuid && (
                      <button
                        onClick={() => handleResetDevice(emp.id)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition inline-flex items-center gap-1"
                        title="Unbind Device Lock"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" /> Reset
                      </button>
                    )}
                    <Link
                      href={`/dashboard/routes?user_id=${emp.id}`}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition inline-flex items-center"
                    >
                      Routes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Minimalist Cashfree Provisioning Modal */}
      {showCashfreeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="max-w-md w-full dashboard-card rounded-lg p-4 sm:p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#16A34A] text-white font-bold flex items-center justify-center text-xs">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-sm dashboard-strong">Provision Field Seat</h3>
                  <p className="text-[10px] text-[#6B7280]">Cashfree PG (₹99.00 + 18% GST)</p>
                </div>
              </div>
              <button
                onClick={() => setShowCashfreeModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentStep === 'DETAILS' && (
              <form onSubmit={handleInitiateCashfreePayment} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Phone (Login)</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Designation</label>
                    <input
                      type="text"
                      required
                      placeholder="Sales Rep"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@acmelogistics.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                  />
                </div>

                {/* Price Breakdown Box */}
                <div className="p-2.5 rounded border border-slate-800 bg-slate-900/60 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Base Seat Fee:</span>
                    <span className="font-mono">₹{EMPLOYEE_BASE_PRICE_INR.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>18% GST:</span>
                    <span className="font-mono">+₹{GST_AMOUNT_INR.toFixed(2)}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-800 flex justify-between font-bold text-xs">
                    <span>Total Payable:</span>
                    <span className="text-emerald-400 font-mono">₹{EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCashfreeModal(false)}
                    className="px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingPayment}
                    className="px-3.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {processingPayment ? 'Connecting...' : 'Authorize & Pay ₹116.82'}
                  </button>
                </div>
              </form>
            )}

            {paymentStep === 'CHECKOUT' && currentOrder && (
              <div className="space-y-3">
                <div className="p-2.5 rounded border border-slate-800 bg-slate-900/60 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Cashfree Order:</span>
                    <span className="text-white truncate max-w-[180px]">{currentOrder.order_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Amount:</span>
                    <span className="font-bold text-emerald-400">₹{currentOrder.order_amount?.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">Cashfree will open its secure hosted checkout with UPI, cards, and net banking options.</p>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStep('DETAILS')}
                    className="px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-slate-300 text-xs font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCompleteCashfreePayment}
                    disabled={processingPayment}
                    className="px-3.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {processingPayment ? 'Verifying...' : `Pay ₹${EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 'SUCCESS' && lastInvoice && (
              <div className="space-y-3 text-center py-2">
                <div className="w-9 h-9 rounded-full bg-[#16A34A]/20 text-[#16A34A] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm dashboard-strong">Employee Seat Provisioned!</h4>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">
                    Invoice <span className="font-mono text-slate-200">{lastInvoice.invoice_number}</span> recorded
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setShowCashfreeModal(false)}
                    className="px-3.5 py-1.5 rounded bg-[#16A34A] text-white text-xs font-semibold"
                  >
                    Done
                  </button>
                  <Link
                    href="/dashboard/billing"
                    className="px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-slate-300 text-xs font-medium"
                  >
                    View Invoices
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
