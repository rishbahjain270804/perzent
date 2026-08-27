import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-10'} px-4`}>
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-slate-800/60 text-slate-400 flex items-center justify-center mb-2">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <p className="text-xs font-semibold dashboard-strong">{title}</p>
      {description && <p className="text-[11px] text-[#6B7280] mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
