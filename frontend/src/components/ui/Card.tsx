import React, { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  extra?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  extra,
  children,
  className,
  style,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl p-6 transition-all duration-300',
          className
        )
      )}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        color: 'var(--fg)',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        ...style,
      }}
      {...props}
    >
      {(title || extra) && (
        <div
          className="flex items-center justify-between pb-4 mb-5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            {title && (
              <h3 className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg)', fontFamily: 'var(--f-body)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg3)', fontFamily: 'var(--f-body)' }}>
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
