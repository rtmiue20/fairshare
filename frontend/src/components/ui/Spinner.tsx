import React from 'react';

export interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'medium',
  color = '#2563eb',
}) => {
  const sizeMap = {
    small: '16px',
    medium: '24px',
    large: '40px',
  };

  const dimension = sizeMap[size];

  return (
    <div
      style={{
        display: 'inline-block',
        width: dimension,
        height: dimension,
        border: `3px solid ${color}20`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    >
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
