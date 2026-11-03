import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

function getInitials(name?: string, email?: string): string {
  const source = (name || email || 'FS').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen = true }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.fullName || user?.email || 'Thành viên';

  return (
    <header
      style={{
        height: '64px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Đóng mở thanh điều hướng"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        <Link
          to="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
          >
            FS
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '18px', color: '#0f172a', letterSpacing: '-0.3px' }}>
                FairShare
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                }}
              >
                UEH MVP
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.2 }}>
              Minh bạch đóng góp đồ án nhóm
            </div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '999px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <ShieldCheck size={14} />
          <span>Consent & Ẩn danh đã bật</span>
        </div>

        <Link
          to="/alerts"
          title="Cảnh báo hoạt động"
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569',
            textDecoration: 'none',
          }}
        >
          <Bell size={17} />
          <span
            style={{
              position: 'absolute',
              top: '7px',
              right: '8px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
            }}
          />
        </Link>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                {getInitials(user.fullName, user.email)}
              </div>
              <div style={{ lineHeight: 1.25 }}>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Xin chào, <strong style={{ color: '#0f172a' }}>{displayName}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {user.email}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            style={{
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
            }}
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
};
