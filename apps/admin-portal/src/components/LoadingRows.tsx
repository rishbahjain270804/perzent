interface LoadingRowsProps {
  rows?: number;
  className?: string;
  label?: string;
}

/** Skeleton placeholder for lists and tables while data loads. */
export function LoadingRows({ rows = 4, className = '', label = 'Loading' }: LoadingRowsProps) {
  return (
    <div className={`space-y-2 p-3 ${className}`} role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 animate-pulse motion-reduce:animate-none">
          <div className="w-6 h-6 rounded bg-slate-700/40 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 rounded bg-slate-700/40" style={{ width: `${55 + ((index * 17) % 35)}%` }} />
            <div className="h-2 rounded bg-slate-700/30" style={{ width: `${30 + ((index * 23) % 40)}%` }} />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
