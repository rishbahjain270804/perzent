import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="min-w-0">
        {eyebrow && <div className="text-[10px] uppercase tracking-wider font-semibold text-[#6B7280] mb-0.5">{eyebrow}</div>}
        <h1 className="text-sm md:text-base font-bold dashboard-strong tracking-tight">{title}</h1>
        {description && <p className="text-[10px] md:text-[11px] text-[#6B7280] mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">{actions}</div>}
    </div>
  );
}
