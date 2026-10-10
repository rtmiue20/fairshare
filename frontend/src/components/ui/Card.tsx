import React, { HTMLAttributes } from 'react';

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
  style,
  ...props
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        ...style,
      }}
      {...props}
    >
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '12px',
          }}
        >
          <div>
            {title && <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{title}</h3>}
            {subtitle && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>{subtitle}</p>}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
