/**
 * Vector Perzent logo — a rounded green tile with a white "P" — so the brand renders crisp at
 * any size and DPI (the PNG exports are soft AI renders that blur when scaled down).
 */
export function PerzentMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pz-mark-gradient" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#pz-mark-gradient)" />
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="12.25" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1.5" />
      <path
        d="M18 35.5V13h8.25a7.25 7.25 0 0 1 0 14.5H18"
        stroke="#FFFFFF"
        strokeWidth="5.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PerzentLogo({
  markClassName = 'h-9 w-9',
  textClassName = 'text-xl',
  className = '',
}: {
  markClassName?: string;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <PerzentMark className={markClassName} />
      <span className={`font-extrabold tracking-tight text-slate-900 leading-none ${textClassName}`}>Perzent</span>
    </span>
  );
}
