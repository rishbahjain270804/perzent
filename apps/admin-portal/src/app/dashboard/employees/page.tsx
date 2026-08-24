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
  Lock,
  ArrowRight,
  Sparkles,
  QrCode,
} from 'lucide-react';
import {
  EMPLOYEE_BASE_PRICE_INR,
  GST_AMOUNT_INR,
  EMPLOYEE_TOTAL_PRICE_INR,
} from '@perzent/shared-types';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCashfreeModal, setShowCashfreeModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'DETAILS' | 'CHECKOUT' | 'SUCCESS'>('DETAILS');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: 'password123',
    designation: '',
    role: 'EMPLOYEE',
    department_id: 'dept-north-sales',
    manager_id: 'user-priya-manager',
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
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: currentOrder.order_id,
          cf_payment_id: `cf_pay_${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastInvoice(data.transaction);
        setPaymentStep('SUCCESS');
        fetchEmployees();
        setMessage(`Payment of ₹${EMPLOYEE_TOTAL_PRICE_INR} received via Cashfree! ${data.employee?.full_name} is now provisioned.`);
      } else {
        alert(data.error || 'Cashfree payment verification failed');
      }
    } catch (err: any) {
      alert('Verification error: ' + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleResetDevice = async (userId: string) => {
    if (!confirm('Are you sure you want to reset this device binding? The user will be able to bind a new smartphone on their next login.')) {
      return;
    }

    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_device', user_id: userId }),
    });

    if (res.ok) {
      setMessage('Device binding reset successfully!');
      fetchEmployees();
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const openProvisionModal = () => {
    setPaymentStep('DETAILS');
    setCurrentOrder(null);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-950 border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#16A34A]" /> Employee Roster & Device Provisioning
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Pay-per-seat via Cashfree (₹99 + 18% GST = ₹116.82/rep) • Single physical device lock & hierarchy management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/billing"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Receipt className="w-4 h-4 text-[#86EFAC]" /> Billing & Invoices
          </Link>
          <button
            onClick={openProvisionModal}
            className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-green-600/25"
          >
            <UserPlus className="w-4 h-4 text-white" /> Provision New Employee (₹116.82)
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-[#16A34A]/15 border border-[#16A34A]/30 text-xs text-[#86EFAC] font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> {message}
          </div>
          <Link href="/dashboard/billing" className="text-xs text-white underline ml-4 font-normal">
            View Invoices
          </Link>
        </div>
      )}

      {/* Roster Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-[#6B7280] font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Phone / Login</th>
                <th className="px-6 py-4">Role & Designation</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Assigned Manager</th>
                <th className="px-6 py-4">Bound Hardware Device</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-900/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-xs">
                        {emp.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{emp.full_name}</p>
                        <p className="text-[11px] text-[#6B7280]">{emp.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-medium">{emp.phone}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-200">{emp.designation}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#86EFAC] font-semibold">
                      <Shield className="w-3 h-3 text-[#16A34A]" /> {emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{emp.department_name}</td>
                  <td className="px-6 py-4 text-slate-300">{emp.manager_name}</td>
                  <td className="px-6 py-4">
                    {emp.is_device_bound ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#16A34A]/15 text-[#86EFAC] font-medium text-[11px] border border-[#16A34A]/30">
                        <Smartphone className="w-3.5 h-3.5 text-[#16A34A]" /> {emp.device_info}
                      </span>
                    ) : (
                      <span className="text-[#6B7280]">No Device Bound</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {emp.is_device_bound && (
                      <button
                        onClick={() => handleResetDevice(emp.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium text-xs transition flex items-center gap-1 ml-auto"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset Binding
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cashfree Provisioning & Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-xl w-full bg-slate-950 border border-slate-800 rounded-3xl p-7 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#16A34A] text-white flex items-center justify-center font-bold text-sm">
                  CF
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Provision Field Rep Seat</h3>
                  <p className="text-[11px] text-[#6B7280]">Powered by Cashfree Payments Gateway</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: Employee Form & Cashfree Pricing Breakdown */}
            {paymentStep === 'DETAILS' && (
              <form onSubmit={handleInitiateCashfreePayment} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-[#16A34A] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">Phone (Login ID)</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98111 22299"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="rahul@acme.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">Designation</label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Territory Sales Manager"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-[#16A34A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-[#16A34A] focus:outline-none"
                    >
                      <option value="EMPLOYEE">Field Employee</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                </div>

                {/* Cashfree Transparent Price Breakdown Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#16A34A]" /> 1x Employee Tracking Seat Add-on
                    </span>
                    <span className="font-semibold text-white">₹{EMPLOYEE_BASE_PRICE_INR.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B7280]">GST / Government Taxes (18%)</span>
                    <span className="font-semibold text-[#86EFAC]">+ ₹{GST_AMOUNT_INR.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Total Amount Payable</span>
                      <p className="text-[10px] text-[#6B7280]">Includes 18% Tax • Instant Provisioning</p>
                    </div>
                    <span className="text-xl font-extrabold text-[#86EFAC]">
                      ₹{EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingPayment}
                    className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white shadow-lg shadow-green-600/25 flex items-center gap-2 disabled:opacity-50 transition"
                  >
                    {processingPayment ? 'Initializing...' : `Proceed to Cashfree Checkout • ₹${EMPLOYEE_TOTAL_PRICE_INR}`}
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Cashfree Interactive PG Checkout Screen */}
            {paymentStep === 'CHECKOUT' && currentOrder && (
              <div className="pt-4 space-y-5">
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-[#16A34A]/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#86EFAC] font-semibold">Cashfree Order Active</p>
                    <p className="text-xs font-bold text-white mt-0.5">Order ID: {currentOrder.order_id}</p>
                    <p className="text-[10px] text-[#6B7280]">Session: {currentOrder.payment_session_id?.slice(0, 18)}...</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold">Total Payable</span>
                    <p className="text-2xl font-black text-[#86EFAC]">₹{EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase text-[#6B7280]">
                    Select Cashfree Payment Option
                  </label>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('UPI')}
                      className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        selectedMethod === 'UPI'
                          ? 'border-[#16A34A] bg-[#16A34A]/15 text-white font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <QrCode className="w-5 h-5 text-[#16A34A] mb-2" />
                      <span>UPI & QR</span>
                      <span className="text-[10px] font-normal text-slate-400">GPay, PhonePe, Paytm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('CARD')}
                      className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        selectedMethod === 'CARD'
                          ? 'border-[#16A34A] bg-[#16A34A]/15 text-white font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-[#16A34A] mb-2" />
                      <span>Credit / Debit Card</span>
                      <span className="text-[10px] font-normal text-slate-400">Visa, Master, RuPay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod('NETBANKING')}
                      className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        selectedMethod === 'NETBANKING'
                          ? 'border-[#16A34A] bg-[#16A34A]/15 text-white font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <Lock className="w-5 h-5 text-[#16A34A] mb-2" />
                      <span>NetBanking</span>
                      <span className="text-[10px] font-normal text-slate-400">HDFC, ICICI, SBI</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-[#6B7280] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>256-bit Encrypted Cashfree PG v3 Checkout. Sub-merchant settlement active.</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStep('DETAILS')}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Back to Details
                  </button>
                  <button
                    type="button"
                    disabled={processingPayment}
                    onClick={handleCompleteCashfreePayment}
                    className="px-6 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white shadow-lg shadow-green-600/30 flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {processingPayment ? 'Authorizing with Cashfree...' : `Authorize & Pay ₹${EMPLOYEE_TOTAL_PRICE_INR.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Payment Success & Invoice */}
            {paymentStep === 'SUCCESS' && lastInvoice && (
              <div className="pt-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#16A34A]/20 text-[#86EFAC] flex items-center justify-center mx-auto border border-[#16A34A]/30">
                  <CheckCircle2 className="w-8 h-8 text-[#16A34A]" />
                </div>

                <div>
                  <h4 className="text-xl font-bold text-white">Payment Successful & Employee Provisioned!</h4>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Cashfree Transaction ID: <strong>{lastInvoice.bank_reference || lastInvoice.order_id}</strong>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Invoice Number:</span>
                    <span className="font-bold text-white">{lastInvoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Employee Added:</span>
                    <span className="font-semibold text-white">{lastInvoice.employee_name} ({lastInvoice.employee_phone})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Base Price:</span>
                    <span className="text-slate-300">₹{lastInvoice.base_price?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">GST (18%):</span>
                    <span className="text-[#86EFAC]">+ ₹{lastInvoice.tax_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 font-bold">
                    <span className="text-white">Total Paid:</span>
                    <span className="text-[#86EFAC]">₹{lastInvoice.total_amount?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white shadow-lg shadow-green-600/25"
                  >
                    Done & View Roster
                  </button>
                  <Link
                    href="/dashboard/billing"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200"
                  >
                    View All Invoices
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

