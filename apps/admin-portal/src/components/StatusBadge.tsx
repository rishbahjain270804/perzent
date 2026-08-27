interface BadgeStyle {
  label: string;
  className: string;
  pulse?: boolean;
}

/**
 * One badge vocabulary for the whole portal:
 * shift status, user status, leave status, payment status, live-freshness and roles.
 */
const STATUS_STYLES: Record<string, BadgeStyle> = {
  // Shift / attendance
  CHECKED_IN: { label: 'On duty', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', pulse: true },
  ON_BREAK: { label: 'On break', className: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  CHECKED_OUT: { label: 'Checked out', className: 'bg-slate-700/40 text-slate-400 border-slate-600/30' },
  AUTO_CHECKED_OUT: { label: 'Auto checked-out', className: 'bg-red-500/10 text-red-400 border-red-500/25' },
  OFF_DUTY: { label: 'Off duty', className: 'bg-slate-800/30 text-slate-500 border-slate-700/20' },

  // User
  ACTIVE: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  SUSPENDED: { label: 'Suspended', className: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  TERMINATED: { label: 'Terminated', className: 'bg-red-500/10 text-red-400 border-red-500/25' },

  // Leave
  PENDING: { label: 'Pending', className: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  APPROVED: { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500/10 text-red-400 border-red-500/25' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-700/40 text-slate-400 border-slate-600/30' },

  // Payments
  PAID: { label: 'Paid', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  FAILED: { label: 'Failed', className: 'bg-red-500/10 text-red-400 border-red-500/25' },
  REFUNDED: { label: 'Refunded', className: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },

  // Live freshness
  LIVE: { label: 'Live', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', pulse: true },
  STALE: { label: 'Stale', className: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  DISCONNECTED: { label: 'GPS/Net lost', className: 'bg-red-500/10 text-red-400 border-red-500/25' },

  // Roles
  OWNER: { label: 'Owner', className: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
  MANAGER: { label: 'Manager', className: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
  EMPLOYEE: { label: 'Employee', className: 'bg-slate-700/40 text-slate-300 border-slate-600/30' },
};

const FALLBACK: BadgeStyle = { label: '', className: 'bg-slate-700/40 text-slate-300 border-slate-600/30' };

interface StatusBadgeProps {
  status: string | null | undefined;
  /** Override the default label for this status. */
  label?: string;
  className?: string;
  title?: string;
}

export function StatusBadge({ status, label, className = '', title }: StatusBadgeProps) {
  const key = (status || '').toUpperCase();
  const style = STATUS_STYLES[key] || FALLBACK;
  const text = label || style.label || (status ? status.replace(/_/g, ' ').toLowerCase() : 'Unknown');
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${style.className} ${className}`}
    >
      {style.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" aria-hidden />}
      {text}
    </span>
  );
}
