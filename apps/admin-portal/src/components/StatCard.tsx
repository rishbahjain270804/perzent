import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const toneClass: Record<StatTone, string> = {
  default: 'dashboard-strong',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
  info: 'text-blue-400',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  icon?: LucideIcon;
}

export function StatCard({ label, value, hint, tone = 'default', icon: Icon }: StatCardProps) {
  return (
    <div className="dashboard-card p-3 rounded-lg min-w-0">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-[10px] text-[#6B7280] uppercase tracking-wide font-semibold truncate">{label}</span>
        {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${tone === 'default' ? 'text-slate-400' : toneClass[tone]}`} />}
      </div>
      <p className={`text-lg md:text-xl font-bold tabular-nums leading-tight ${toneClass[tone]}`}>{value}</p>
      {hint && <span className="text-[10px] text-[#6B7280] block mt-0.5 truncate">{hint}</span>}
    </div>
  );
}
