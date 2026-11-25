import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface GlassDropdownOption {
  value: string | number;
  label: string;
  subtitle?: string;
  badge?: string;
}

export interface GlassDropdownProps {
  options: GlassDropdownOption[];
  value: string | number;
  onChange: (value: string) => void;
  ariaLabel?: string;
  prefixLabel?: string;
  icon?: React.ReactNode;
  headerTitle?: string;
  align?: 'left' | 'right';
  menuWidthClass?: string;
  triggerClassName?: string;
  labelMaxWidthClass?: string;
  disabled?: boolean;
}

export const GlassDropdown: React.FC<GlassDropdownProps> = ({
  options,
  value,
  onChange,
  ariaLabel,
  prefixLabel,
  icon,
  headerTitle,
  align = 'left',
  menuWidthClass = 'w-64',
  triggerClassName = '',
  labelMaxWidthClass = 'max-w-[160px] sm:max-w-[220px]',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) ?? options[0];

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Hidden native select for accessibility / form & test compatibility */}
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border shadow-sm ${
          isOpen
            ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/50 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20'
            : 'bg-white hover:bg-slate-50 dark:bg-zinc-900/90 dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/15 text-zinc-800 dark:text-zinc-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${triggerClassName}`}
      >
        {icon && <span className="shrink-0 flex items-center">{icon}</span>}
        {prefixLabel && <span className="text-zinc-400 dark:text-zinc-400 font-normal shrink-0">{prefixLabel}</span>}
        <span className={`truncate text-left ${labelMaxWidthClass}`}>
          {selectedOption?.label ?? ''}
        </span>
        {selectedOption?.badge && (
          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
            {selectedOption.badge}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Custom Glass Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-50 ${menuWidthClass} max-w-[calc(100vw-24px)] rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] overflow-hidden`}
          style={{
            top: 'calc(100% + 8px)',
            boxShadow:
              '0 24px 50px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.25)',
          }}
        >
          {headerTitle && (
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
                {headerTitle}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                {options.length}
              </span>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto p-2 space-y-1" style={{ scrollbarWidth: 'thin' }}>
            {options.map((opt) => {
              const isActive = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(String(opt.value));
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${
                    isActive
                      ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-semibold shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{opt.label}</div>
                    {opt.subtitle && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {opt.subtitle}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {opt.badge}
                      </span>
                    )}
                    {isActive && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
