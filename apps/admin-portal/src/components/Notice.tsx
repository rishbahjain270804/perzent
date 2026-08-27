import type { ReactNode } from 'react';
import { CheckCircle2, Info } from 'lucide-react';

interface NoticeProps {
  tone?: 'success' | 'info';
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Notice({ tone = 'success', children, onDismiss, className = '' }: NoticeProps) {
  const Icon = tone === 'success' ? CheckCircle2 : Info;
  const styles =
    tone === 'success'
      ? 'border-[#16A34A]/40 bg-[#16A34A]/10 text-[#86EFAC]'
      : 'border-blue-500/30 bg-blue-500/10 text-blue-200';
  return (
    <div role="status" className={`flex items-start justify-between gap-2 p-2.5 rounded-lg border text-xs font-medium ${styles} ${className}`}>
      <span className="flex items-start gap-2 min-w-0">
        <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span className="break-words">{children}</span>
      </span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-[11px] underline shrink-0">
          Dismiss
        </button>
      )}
    </div>
  );
}
