import React, { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: string;
  extra?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  extra,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'threeui-glass-card rounded-2xl p-6 transition-all duration-300',
          'border border-white/[0.08] text-slate-100',
          className
        )
      )}
      {...props}
    >
      {(title || extra) && (
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.06]">
          <div>
            {title && (
              <div className="text-base font-semibold text-white tracking-tight">
                {title}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {extra && <div className="shrink-0">{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
