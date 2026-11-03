import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  ClipboardCheck,
  LayoutDashboard,
  Link2,
  Sparkles,
  Users,
} from 'lucide-react';

export interface SidebarProps {
  isOpen?: boolean;
}

interface NavItem {
  label: string;
  path: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true }) => {
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      label: 'Bảng đóng góp',
      path: '/dashboard',
      description: 'Biểu đồ & bằng chứng truy vết',
      icon: <LayoutDashboard size={18} />,
    },
    {
      label: 'Danh sách nhóm',
      path: '/teams',
      description: 'Nhóm đồ án, Sprint & Consent',
      icon: <Users size={18} />,
    },
    {
      label: 'Tích hợp Trello',
      path: '/integration',
      description: 'Kết nối & đồng bộ thẻ công việc',
      icon: <Link2 size={18} />,
      badge: 'Auto',
    },
    {
      label: 'Chấm chéo',
      path: '/peer-review',
      description: 'Đánh giá đồng đẳng ẩn danh',
      icon: <ClipboardCheck size={18} />,
    },
    {
      label: 'Cảnh báo',
      path: '/alerts',
      description: 'Theo dõi thành viên ít hoạt động',
      icon: <Bell size={18} />,
    },
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      style={{
        width: '264px',
        flexShrink: 0,
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        padding: '20px 12px',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div
          style={{
            padding: '0 12px 10px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#94a3b8',
          }}
        >
          Menu Điều Hướng
        </div>

        <nav aria-label="Sidebar Navigation">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: isActive ? '#1d4ed8' : '#334155',
                      backgroundColor: isActive ? '#eff6ff' : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      textDecoration: 'none',
                      borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        color: isActive ? '#2563eb' : '#64748b',
                      }}
                    >
                      {item.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px' }}>{item.label}</span>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '999px',
                              backgroundColor: isActive ? '#dbeafe' : '#f1f5f9',
                              color: isActive ? '#1d4ed8' : '#475569',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: isActive ? '#3b82f6' : '#94a3b8',
                          fontWeight: 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div
        style={{
          margin: '16px 4px 0',
          padding: '14px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
          border: '1px solid #bfdbfe',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Sparkles size={15} color="#2563eb" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a' }}>
            Sprint 3 – Nền tảng
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 8px', lineHeight: 1.4 }}>
          Nhóm 6 thành viên UEH. Dữ liệu đóng góp được đối chiếu tự động từ Trello & chấm chéo ẩn danh.
        </p>
        <div
          style={{
            fontSize: '11px',
            color: '#1d4ed8',
            fontWeight: 600,
          }}
        >
          Module M1: Auth & Layout ✓
        </div>
      </div>
    </aside>
  );
};
