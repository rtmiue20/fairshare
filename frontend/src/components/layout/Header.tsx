import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Settings } from 'lucide-react';

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
      <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', color: '#2563eb' }}>
          FairShare
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user ? (
          <>
            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: '#334155',
                fontSize: '13px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '11px',
                }}
              >
                {(user.fullName || user.email || 'HT').charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: 500 }}>{user.fullName || user.email}</span>
            </Link>
            <button
              onClick={logout}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              to="/profile"
              style={{
                fontSize: '13px',
                color: '#475569',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Settings size={14} />
              Hồ sơ sinh viên
            </Link>
            <Link to="/login" style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
              Đăng nhập
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
