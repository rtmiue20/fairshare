import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  disabled,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 500,
    fontSize: '14px',
    border: '1px solid transparent',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
    },
    secondary: {
      backgroundColor: '#f1f5f9',
      color: '#0f172a',
      borderColor: '#cbd5e1',
    },
    danger: {
      backgroundColor: '#dc2626',
      color: '#ffffff',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: '#2563eb',
      color: '#2563eb',
    },
  };

  return (
    <button
      style={{ ...baseStyle, ...variantStyles[variant], ...style }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Đang xử lý...' : children}
    </button>
  );
};
