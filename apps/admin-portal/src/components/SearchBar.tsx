import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Right-hand meta text, e.g. "12 records". */
  meta?: ReactNode;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search…', meta, className = '' }: SearchBarProps) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <div className="relative flex-1 max-w-xs">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-700 bg-[#0B1120] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#16A34A]"
        />
      </div>
      {meta && <span className="text-[10px] md:text-[11px] text-[#6B7280] shrink-0">{meta}</span>}
    </div>
  );
}
