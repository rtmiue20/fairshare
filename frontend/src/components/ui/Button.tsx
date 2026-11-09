import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  disabled,
  style,
  className = '',
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    padding: '9px 20px',
    borderRadius: '999px',
    fontWeight: 500,
    fontSize: '13.5px',
    fontFamily: 'var(--f-body)',
    border: '1px solid transparent',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--fg)',
      color: 'var(--bg)',
      borderColor: 'var(--fg)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    },
    secondary: {
      backgroundColor: 'var(--surface2)',
      color: 'var(--fg)',
      borderColor: 'var(--line)',
    },
    danger: {
      backgroundColor: 'var(--bad)',
      color: '#ffffff',
      borderColor: 'var(--bad)',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: 'var(--line)',
      color: 'var(--fg)',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'var(--line)',
      color: 'var(--fg)',
    },
  };

  return (
    <button
      className={`btn ${variant === 'ghost' ? 'ghost' : ''} ${className}`}
      style={{ ...baseStyle, ...variantStyles[variant], ...style }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Đang xử lý...' : children}
    </button>
  );
};
