'use client';
import { BRAND } from '@perzent/shared-types';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Smartphone,
  RotateCcw,
  Shield,
  RefreshCw,
  KeyRound,
  Pencil,
  UserX,
  UserCheck,
  Wand2,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiFetch, errorMessage, relativeTime } from '@/lib/client';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  Modal,
  SearchBar,
  EmptyState,
  ErrorBanner,
  LoadingRows,
  Notice,
  inputClass,
  labelClass,
  helpClass,
  btnPrimary,
  btnSecondary,
  btnGhost,
  iconBtn,
  errorText,
  tableHeadRow,
  tableRow,
} from '@/components';

type Role = 'MANAGER' | 'EMPLOYEE';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

interface Employee {
  id: string;
  full_name: string;
  email?: string | null;
  phone: string;
  role: Role;
  designation?: string | null;
  status: UserStatus;
  manager_id?: string | null;
  department_id?: string | null;
  manager_name?: string | null;
  department_name?: string | null;
  device_info?: string | null;
  device_model?: string | null;
  os_version?: string | null;
  device_last_seen_at?: string | null;
  is_device_bound: boolean;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  user_count: number;
}

type RowAction = 'RESET_DEVICE' | 'SUSPEND' | 'REACTIVATE';

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  email: '',
  password: '',
  designation: '',
  role: 'EMPLOYEE' as Role,
  department_id: '',
  manager_id: '',
};

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join('');
}

/** wa.me deep link with the credentials and download link pre-filled, so an owner can onboard an employee in one tap. */
function whatsappShareUrl(phone: string, name: string, password: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  const text = [
    `Hi ${name}, your ${BRAND.productName} account is ready.`,
    `1. Install the app: ${BRAND.webUrl}/download`,
    `2. Sign in with phone ${phone.trim()} and password: ${password}`,
    `3. Allow location "All the time" and tap Check in when your shift starts.`,
  ].join('\n');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [rowError, setRowError] = useState('');
  const [busyRow, setBusyRow] = useState<string | null>(null);

  // Add
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(true);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [newDeptOpen, setNewDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);
  const [deptError, setDeptError] = useState('');

  // Edit
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', designation: '', role: 'EMPLOYEE' as Role, manager_id: '', department_id: '', email: '' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset password
  const [passwordTarget, setPasswordTarget] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Employee[]>('/api/employees');
      setEmployees(Array.isArray(data) ? data : []);
      setListError('');
    } catch (reason) {
      setListError(errorMessage(reason, 'Could not load employees.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const data = await apiFetch<Department[]>('/api/departments');
      setDepartments(Array.isArray(data) ? data : []);
    } catch {
      /* Department list is optional for the form; errors surface on create. */
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, [loadEmployees, loadDepartments]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 8000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const managers = useMemo(() => employees.filter((e) => e.role === 'MANAGER' && e.status !== 'TERMINATED'), [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.phone?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q) ||
        e.department_name?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const stats = {
    total: employees.filter((e) => e.status !== 'TERMINATED').length,
    managers: employees.filter((e) => e.role === 'MANAGER' && e.status !== 'TERMINATED').length,
    bound: employees.filter((e) => e.is_device_bound).length,
    suspended: employees.filter((e) => e.status === 'SUSPENDED').length,
  };

  /* ---------------- Add ---------------- */

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, password: generatePassword() });
    setAddError('');
    setNewDeptOpen(false);
    setNewDeptName('');
    setDeptError('');
    setAddOpen(true);
  };

  const handleCreateDepartment = async () => {
    const name = newDeptName.trim();
    if (!name) {
      setDeptError('Enter a department name.');
      return;
    }
    setCreatingDept(true);
    setDeptError('');
    try {
      const created = await apiFetch<Department>('/api/departments', { method: 'POST', json: { name } });
      setDepartments((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({ ...current, department_id: created.id }));
      setNewDeptOpen(false);
      setNewDeptName('');
    } catch (reason) {
      setDeptError(errorMessage(reason, 'Could not create the department.'));
    } finally {
      setCreatingDept(false);
    }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddError('');
    if (form.password.length < 6) {
      setAddError('Temporary password must be at least 6 characters.');
      return;
    }
    setAdding(true);
    try {
      const created = await apiFetch<Employee>('/api/employees', {
        method: 'POST',
        json: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          password: form.password,
          designation: form.designation.trim(),
          role: form.role,
          department_id: form.department_id || undefined,
          manager_id: form.manager_id || undefined,
        },
      });
      setAddOpen(false);
      setShareUrl(whatsappShareUrl(form.phone, created?.full_name || form.full_name, form.password));
      setNotice(
        `${created?.full_name || form.full_name} added. Share the phone number ${form.phone.trim()} and temporary password "${form.password}" with them — they sign in on the Android app.`
      );
      await loadEmployees();
      loadDepartments();
    } catch (reason) {
      setAddError(errorMessage(reason, 'Could not add the employee.'));
    } finally {
      setAdding(false);
    }
  };

  /* ---------------- Row actions ---------------- */

  const runRowAction = async (employee: Employee, action: RowAction) => {
    const confirmations: Record<RowAction, string | null> = {
      RESET_DEVICE: `Unbind ${employee.full_name}'s phone? They will need to sign in again on the app, and the next phone they use becomes their bound device.`,
      SUSPEND: `Suspend ${employee.full_name}? They will be signed out and cannot check in until reactivated.`,
      REACTIVATE: null,
    };
    const message = confirmations[action];
    if (message && !confirm(message)) return;
    setBusyRow(employee.id);
    setRowError('');
    try {
      await apiFetch('/api/employees', { method: 'PATCH', json: { action, id: employee.id } });
      setNotice(
        action === 'RESET_DEVICE'
          ? `Device binding reset for ${employee.full_name}.`
          : action === 'SUSPEND'
            ? `${employee.full_name} suspended.`
            : `${employee.full_name} reactivated.`
      );
      await loadEmployees();
    } catch (reason) {
      setRowError(errorMessage(reason, 'Action failed.'));
    } finally {
      setBusyRow(null);
    }
  };

  /* ---------------- Edit ---------------- */

  const openEdit = (employee: Employee) => {
    setEditTarget(employee);
    setEditForm({
      full_name: employee.full_name || '',
      designation: employee.designation || '',
      role: employee.role,
      manager_id: employee.manager_id || '',
      department_id: employee.department_id || '',
      email: employee.email || '',
    });
    setEditError('');
  };

  const handleEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setEditError('');
    try {
      await apiFetch('/api/employees', {
        method: 'PATCH',
        json: {
          action: 'UPDATE',
          id: editTarget.id,
          full_name: editForm.full_name.trim(),
          designation: editForm.designation.trim(),
          role: editForm.role,
          manager_id: editForm.manager_id || null,
          department_id: editForm.department_id || null,
          email: editForm.email.trim() || null,
        },
      });
      setEditTarget(null);
      setNotice(`${editForm.full_name.trim()} updated.`);
      await loadEmployees();
      loadDepartments();
    } catch (reason) {
      setEditError(errorMessage(reason, 'Could not save changes.'));
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- Reset password ---------------- */

  const openPasswordReset = (employee: Employee) => {
    setPasswordTarget(employee);
    setNewPassword(generatePassword());
    setPasswordError('');
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordTarget) return;
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    setResettingPassword(true);
    setPasswordError('');
    try {
      await apiFetch('/api/employees', {
        method: 'PATCH',
        json: { action: 'RESET_PASSWORD', id: passwordTarget.id, new_password: newPassword },
      });
      setNotice(`Password reset for ${passwordTarget.full_name}. New temporary password: "${newPassword}".`);
      setShareUrl(whatsappShareUrl(passwordTarget.phone, passwordTarget.full_name, newPassword));
      setPasswordTarget(null);
    } catch (reason) {
      setPasswordError(errorMessage(reason, 'Could not reset the password.'));
    } finally {
      setResettingPassword(false);
    }
  };

  /* ---------------- Render helpers ---------------- */

  const deviceCell = (employee: Employee) => {
    if (!employee.is_device_bound) {
      return <span className="text-[11px] text-slate-500 italic">No device yet</span>;
    }
    return (
      <div className="flex items-center gap-1.5 text-emerald-400 min-w-0">
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] text-slate-300 leading-tight truncate">{employee.device_model || 'Bound device'}</p>
          <p className="text-[10px] text-[#6B7280] leading-tight">
            {employee.os_version ? `Android ${employee.os_version} · ` : ''}seen {relativeTime(employee.device_last_seen_at)}
          </p>
        </div>
      </div>
    );
  };

  const rowActions = (employee: Employee) => {
    const busy = busyRow === employee.id;
    const terminated = employee.status === 'TERMINATED';
    return (
      <div className="flex flex-wrap justify-end gap-1">
        <button type="button" onClick={() => openEdit(employee)} disabled={busy || terminated} className={btnGhost} title="Edit">
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button type="button" onClick={() => openPasswordReset(employee)} disabled={busy || terminated} className={btnGhost} title="Reset password">
          <KeyRound className="w-3 h-3" /> Password
        </button>
        {employee.is_device_bound && (
          <button type="button" onClick={() => runRowAction(employee, 'RESET_DEVICE')} disabled={busy} className={btnGhost} title="Reset device binding">
            <RotateCcw className="w-3 h-3 text-amber-400" /> Reset device
          </button>
        )}
        {employee.status === 'SUSPENDED' ? (
          <button type="button" onClick={() => runRowAction(employee, 'REACTIVATE')} disabled={busy} className={btnGhost}>
            <UserCheck className="w-3 h-3 text-emerald-400" /> Reactivate
          </button>
        ) : (
          !terminated && (
            <button type="button" onClick={() => runRowAction(employee, 'SUSPEND')} disabled={busy} className={btnGhost}>
              <UserX className="w-3 h-3 text-red-400" /> Suspend
            </button>
          )
        )}
        {busy && <RefreshCw className="w-3 h-3 animate-spin text-slate-400 self-center" aria-label="Working" />}
      </div>
    );
  };

  const passwordField = (
    value: string,
    onChange: (value: string) => void,
    onGenerate: () => void,
    id: string
  ) => (
    <div className="flex gap-1.5">
      <div className="relative flex-1">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required
          minLength={6}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="At least 6 characters"
          className={`${inputClass} pr-8 font-mono`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1.5 text-slate-500 hover:text-white"
        >
          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      <button type="button" onClick={onGenerate} className={btnSecondary} title="Generate a random password">
        <Wand2 className="w-3 h-3" /> Generate
      </button>
    </div>
  );

  const departmentSelect = (value: string, onChange: (value: string) => void, allowCreate: boolean) => (
    <div className="space-y-1.5">
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        <option value="">No department</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>{dept.name}</option>
        ))}
      </select>
      {allowCreate && !newDeptOpen && (
        <button type="button" onClick={() => setNewDeptOpen(true)} className="text-[10px] text-[#86EFAC] hover:underline inline-flex items-center gap-0.5">
          <Plus className="w-3 h-3" /> New department
        </button>
      )}
      {allowCreate && newDeptOpen && (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newDeptName}
            onChange={(event) => setNewDeptName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreateDepartment();
              }
            }}
            placeholder="e.g. Sales — North"
            className={inputClass}
            aria-label="New department name"
          />
          <button type="button" onClick={handleCreateDepartment} disabled={creatingDept} className={btnSecondary}>
            {creatingDept ? 'Adding…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setNewDeptOpen(false);
              setDeptError('');
            }}
            className={btnGhost}
          >
            Cancel
          </button>
        </div>
      )}
      {deptError && <p className={errorText}>{deptError}</p>}
    </div>
  );

  const managerSelect = (value: string, onChange: (value: string) => void, excludeId?: string) => (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      <option value="">No manager</option>
      {managers
        .filter((manager) => manager.id !== excludeId)
        .map((manager) => (
          <option key={manager.id} value={manager.id}>{manager.full_name}</option>
        ))}
    </select>
  );

  return (
    <div className="space-y-3 md:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Employees"
        description="Staff accounts for the Android app. Adding people is free — no seat limits."
        actions={
          <>
            <button onClick={loadEmployees} disabled={loading} className={iconBtn} title="Refresh list" aria-label="Refresh list">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={openAdd} className={btnPrimary}>
              <UserPlus className="w-3.5 h-3.5" /> Add employee
            </button>
          </>
        }
      />

      {notice && (
        <Notice onDismiss={() => { setNotice(''); setShareUrl(''); }}>
          {notice}
          {shareUrl && (
            <a href={shareUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center rounded-md bg-[#25D366] px-2.5 py-1 text-xs font-bold text-white hover:opacity-90">Share on WhatsApp</a>
          )}
        </Notice>
      )}
      <ErrorBanner message={listError} onRetry={loadEmployees} retrying={loading} />
      <ErrorBanner message={rowError} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total staff" value={stats.total} icon={Users} hint="Active + suspended" />
        <StatCard label="Managers" value={stats.managers} icon={Shield} tone="info" />
        <StatCard label="Devices bound" value={stats.bound} icon={Smartphone} tone="success" hint="Signed in on the app" />
        <StatCard label="Suspended" value={stats.suspended} icon={UserX} tone={stats.suspended > 0 ? 'warning' : 'default'} />
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search name, phone, email, department…"
        meta={`${filteredEmployees.length} of ${employees.length}`}
      />

      {/* ─── Mobile Card List ─── */}
      <div className="md:hidden space-y-2">
        {loading && <div className="dashboard-card rounded-lg"><LoadingRows rows={3} /></div>}
        {filteredEmployees.map((emp) => (
          <div key={emp.id} className="dashboard-card rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px] shrink-0">
                  {emp.full_name?.charAt(0) || 'E'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs dashboard-strong truncate">{emp.full_name}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">
                    {emp.designation || 'Staff'}{emp.department_name ? ` · ${emp.department_name}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={emp.status} />
                <StatusBadge status={emp.role} />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-[11px] text-slate-300">
              <span className="font-mono text-[10px]">{emp.phone}</span>
              {deviceCell(emp)}
            </div>
            {emp.manager_name && <p className="text-[10px] text-[#6B7280]">Reports to {emp.manager_name}</p>}
            <div className="pt-1.5 border-t border-slate-800/40">{rowActions(emp)}</div>
          </div>
        ))}
        {!loading && filteredEmployees.length === 0 && !listError && (
          <div className="dashboard-card rounded-lg">
            <EmptyState
              icon={Users}
              title={employees.length === 0 ? 'No employees yet' : 'No matches'}
              description={
                employees.length === 0
                  ? 'Add your first employee. They sign in on the Android app with their phone number and the temporary password.'
                  : 'Try a different search.'
              }
              action={employees.length === 0 ? <button onClick={openAdd} className={btnPrimary}><UserPlus className="w-3.5 h-3.5" /> Add employee</button> : undefined}
              compact
            />
          </div>
        )}
      </div>

      {/* ─── Desktop Table ─── */}
      <div className="hidden md:block dashboard-card rounded-lg overflow-hidden">
        {loading ? (
          <LoadingRows rows={5} />
        ) : filteredEmployees.length === 0 ? (
          !listError && (
            <EmptyState
              icon={Users}
              title={employees.length === 0 ? 'No employees yet' : 'No matches'}
              description={
                employees.length === 0
                  ? 'Add your first employee. They sign in on the Android app with their phone number and the temporary password you give them.'
                  : 'Try a different search.'
              }
              action={employees.length === 0 ? <button onClick={openAdd} className={btnPrimary}><UserPlus className="w-3.5 h-3.5" /> Add employee</button> : undefined}
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={tableHeadRow}>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Department / manager</th>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className={tableRow}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#16A34A]/20 text-[#86EFAC] font-bold flex items-center justify-center text-[10px] shrink-0">
                          {emp.full_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold dashboard-strong leading-tight">{emp.full_name}</p>
                          <p className="text-[10px] text-[#6B7280] leading-tight">{emp.designation || 'Staff'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-300">
                      <p className="leading-tight">{emp.phone}</p>
                      <p className="text-[10px] text-[#6B7280] leading-tight">{emp.email || '—'}</p>
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={emp.role} /></td>
                    <td className="px-3 py-2 text-[11px] text-slate-300">
                      <p className="leading-tight">{emp.department_name || <span className="text-slate-500">No department</span>}</p>
                      <p className="text-[10px] text-[#6B7280] leading-tight">{emp.manager_name ? `Reports to ${emp.manager_name}` : 'No manager'}</p>
                    </td>
                    <td className="px-3 py-2">{deviceCell(emp)}</td>
                    <td className="px-3 py-2"><StatusBadge status={emp.status} /></td>
                    <td className="px-3 py-2 text-right">{rowActions(emp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-[#6B7280]">
        Employees install the app from the <Link href="/download" className="underline">download page</Link> and sign in with their phone number.
      </p>

      {/* ─── Add employee ─── */}
      <Modal
        open={addOpen}
        onClose={() => !adding && setAddOpen(false)}
        title="Add employee"
        description="Free — no payment. They sign in on the Android app with the phone number and temporary password."
      >
        <form onSubmit={handleAdd} className="space-y-2.5" noValidate>
          <div>
            <label htmlFor="add_full_name" className={labelClass}>Full name</label>
            <input id="add_full_name" type="text" required minLength={2} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Ramesh Kumar" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="add_phone" className={labelClass}>Phone (login)</label>
              <input id="add_phone" type="tel" inputMode="tel" required minLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" className={inputClass} />
            </div>
            <div>
              <label htmlFor="add_designation" className={labelClass}>Designation</label>
              <input id="add_designation" type="text" required minLength={2} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Sales executive" className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="add_email" className={labelClass}>Email <span className="font-normal text-slate-500">(optional)</span></label>
            <input id="add_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ramesh@company.com" className={inputClass} />
          </div>
          <div>
            <label htmlFor="add_password" className={labelClass}>Temporary password</label>
            {passwordField(form.password, (value) => setForm({ ...form, password: value }), () => setForm({ ...form, password: generatePassword() }), 'add_password')}
            <p className={helpClass}>Minimum 6 characters. Share it with the employee; they can change it in the app.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="add_role" className={labelClass}>Role</label>
              <select id="add_role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputClass}>
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Manager <span className="font-normal text-slate-500">(optional)</span></label>
              {managerSelect(form.manager_id, (value) => setForm({ ...form, manager_id: value }))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Department <span className="font-normal text-slate-500">(optional)</span></label>
            {departmentSelect(form.department_id, (value) => setForm({ ...form, department_id: value }), true)}
          </div>

          {addError && <p role="alert" className={errorText}>{addError}</p>}

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setAddOpen(false)} disabled={adding} className={btnSecondary}>Cancel</button>
            <button
              type="submit"
              disabled={adding || !form.full_name.trim() || !form.phone.trim() || !form.designation.trim() || form.password.length < 6}
              className={btnPrimary}
            >
              {adding ? 'Adding…' : 'Add employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Edit employee ─── */}
      <Modal open={!!editTarget} onClose={() => !saving && setEditTarget(null)} title={editTarget ? `Edit ${editTarget.full_name}` : 'Edit employee'}>
        <form onSubmit={handleEdit} className="space-y-2.5" noValidate>
          <div>
            <label htmlFor="edit_full_name" className={labelClass}>Full name</label>
            <input id="edit_full_name" type="text" required minLength={2} value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="edit_designation" className={labelClass}>Designation</label>
              <input id="edit_designation" type="text" required minLength={2} value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="edit_role" className={labelClass}>Role</label>
              <select id="edit_role" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })} className={inputClass}>
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="edit_email" className={labelClass}>Email <span className="font-normal text-slate-500">(optional)</span></label>
            <input id="edit_email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Manager</label>
              {managerSelect(editForm.manager_id, (value) => setEditForm({ ...editForm, manager_id: value }), editTarget?.id)}
            </div>
            <div>
              <label className={labelClass}>Department</label>
              {departmentSelect(editForm.department_id, (value) => setEditForm({ ...editForm, department_id: value }), false)}
            </div>
          </div>
          {editError && <p role="alert" className={errorText}>{editError}</p>}
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditTarget(null)} disabled={saving} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={saving || !editForm.full_name.trim() || !editForm.designation.trim()} className={btnPrimary}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Reset password ─── */}
      <Modal
        open={!!passwordTarget}
        onClose={() => !resettingPassword && setPasswordTarget(null)}
        title={passwordTarget ? `Reset password — ${passwordTarget.full_name}` : 'Reset password'}
        description="Sets a new temporary password. The employee will need to sign in again on the app."
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-2.5" noValidate>
          <div>
            <label htmlFor="reset_password" className={labelClass}>New temporary password</label>
            {passwordField(newPassword, setNewPassword, () => setNewPassword(generatePassword()), 'reset_password')}
          </div>
          {passwordError && <p role="alert" className={errorText}>{passwordError}</p>}
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setPasswordTarget(null)} disabled={resettingPassword} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={resettingPassword || newPassword.length < 6} className={btnPrimary}>
              {resettingPassword ? 'Resetting…' : 'Reset password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
