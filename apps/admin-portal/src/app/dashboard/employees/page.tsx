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
      .then((data) => setEmployees(data));
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
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Employee Directory & Seat Licenses</h1>
          <p className="text-[11px] text-[#6B7280]">
            Manage field representative profiles, device UUID locks, and provision seats (₹99 + 18% GST = ₹116.82)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmployees}
            className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
            title="Refresh List"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setPaymentStep('DETAILS');
              setShowCashfreeModal(true);
            }}
            className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Employee (₹116.82)
          </button>
        </div>
      </div>

      {message && (
        <div className="p-2.5 rounded border border-[#16A34A]/40 bg-[#16A34A]/10 text-[#86EFAC] text-xs font-medium">
          {message}
        </div>
      )}

      {/* 4-Cell Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-slate-800 bg-[#0B1120] rounded-lg divide-y md:divide-y-0 md:divide-x divide-slate-800">
        <div className="p-3.5">
          <span className="text-[#6B7280] text-[11px]">Total Employees</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">{employees.length}</p>
          <span className="text-[10px] text-[#6B7280]">Enrolled personnel</span>
        </div>
        <div className="p-3.5">
          <span className="text-[#86EFAC] text-[11px]">Active Paid Seats</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-[#86EFAC]">{employees.length}</p>
          <span className="text-[10px] text-[#6B7280]">Cashfree authorized</span>
        </div>
        <div className="p-3.5">
          <span className="text-blue-400 text-[11px]">Bound Devices</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums text-blue-400">
            {employees.filter((e) => e.device_uuid).length}
          </p>
          <span className="text-[10px] text-[#6B7280]">Hardware UUID locked</span>
        </div>
        <div className="p-3.5">
          <span className="text-slate-400 text-[11px]">Base License Fee</span>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">₹99.00 <span className="text-[11px] text-slate-400 font-normal">+ 18% GST</span></p>
          <span className="text-[10px] text-[#6B7280]">₹116.82 per seat</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or designation..."
            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-800 bg-[#0B1120] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
          />
        </div>
        <span className="text-[11px] text-[#6B7280]">{filteredEmployees.length} representatives found</span>
      </div>

      {/* Dense Tabular Employee Directory */}
      <div className="border border-slate-800 bg-[#0B1120] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[#6B7280] font-semibold text-[10px] uppercase tracking-wider">
                <th className="px-4 py-2.5">Representative</th>
                <th className="px-4 py-2.5">Phone & Email</th>
                <th className="px-4 py-2.5">Designation</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Hardware Binding</th>
                <th className="px-4 py-2.5">Seat Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-850/40 transition">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px]">
                        {emp.full_name?.charAt(0)}
                      </div>
                      <span className="font-semibold text-white">{emp.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-300">
                    <p className="leading-tight">{emp.phone}</p>
                    <p className="text-[10px] text-[#6B7280] leading-tight">{emp.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{emp.designation || 'Field Representative'}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
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
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#16A34A]/15 text-[#86EFAC] border border-[#16A34A]/30">
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#16A34A]" /> Paid (₹116.82)
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-1">
                    {emp.device_uuid && (
                      <button
                        onClick={() => handleResetDevice(emp.id)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition inline-flex items-center gap-1"
                        title="Unbind Device Lock"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" /> Reset
                      </button>
                    )}
                    <Link
                      href={`/dashboard/routes?user_id=${emp.id}`}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition inline-flex items-center"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-[#0B1120] border border-slate-800 rounded-lg p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#16A34A] text-white font-bold flex items-center justify-center text-xs">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Provision Field Seat</h3>
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
              <form onSubmit={handleInitiateCashfreePayment} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Phone (Login)</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Designation</label>
                    <input
                      type="text"
                      required
                      placeholder="Sales Representative"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@acmelogistics.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-800 bg-slate-900 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
                  />
                </div>

                {/* Price Breakdown Box */}
                <div className="p-3 rounded border border-slate-800 bg-slate-900/60 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Base Seat Fee:</span>
                    <span className="font-mono">₹{EMPLOYEE_BASE_PRICE_INR.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#86EFAC]">
                    <span>18% GST:</span>
                    <span className="font-mono">+₹{GST_AMOUNT_INR.toFixed(2)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-xs text-white">
                    <span>Total Amount Payable:</span>
                    <span className="text-[#86EFAC] font-mono">₹{EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)}</span>
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
                    className="px-4 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {processingPayment ? 'Connecting...' : 'Authorize & Pay ₹116.82'}
                  </button>
                </div>
              </form>
            )}

            {paymentStep === 'CHECKOUT' && currentOrder && (
              <div className="space-y-3">
                <div className="p-3 rounded border border-slate-800 bg-slate-900/60 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Cashfree Order:</span>
                    <span className="text-white truncate max-w-[200px]">{currentOrder.order_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Amount:</span>
                    <span className="font-bold text-[#86EFAC]">₹{currentOrder.order_amount?.toFixed(2)}</span>
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
                    className="px-4 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {processingPayment ? 'Verifying...' : `Pay ₹${EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)} via Cashfree`}
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 'SUCCESS' && lastInvoice && (
              <div className="space-y-3 text-center py-2">
                <div className="w-10 h-10 rounded-full bg-[#16A34A]/20 text-[#16A34A] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Employee Seat Provisioned!</h4>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Invoice <span className="font-mono text-white">{lastInvoice.invoice_number}</span> recorded
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setShowCashfreeModal(false)}
                    className="px-4 py-1.5 rounded bg-[#16A34A] text-white text-xs font-semibold"
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
