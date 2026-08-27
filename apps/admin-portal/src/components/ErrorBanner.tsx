import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string | null | undefined;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

export function ErrorBanner({ message, onRetry, retrying = false, className = '' }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-xs ${className}`}
    >
      <span className="flex items-start gap-2 min-w-0">
        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
        <span className="break-words">{message}</span>
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1 self-start sm:self-auto px-2.5 py-1 rounded border border-red-500/40 text-red-200 hover:bg-red-500/10 font-semibold text-[11px] disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} /> Retry
        </button>
      )}
    </div>
  );
}
