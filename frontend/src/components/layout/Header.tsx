import React from 'react';
import { useAuthStore } from '../../store/authStore';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <header
      style={{
        height: '60px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#2563eb' }}>
        FairShare
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user ? (
          <>
            <span style={{ fontSize: '14px', color: '#475569' }}>
              Xin chào, <strong>{user.fullName || user.email}</strong>
            </span>
            <button
              onClick={logout}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <a href="/login" style={{ fontSize: '14px' }}>Đăng nhập</a>
        )}
      </div>
    </header>
  );
};
