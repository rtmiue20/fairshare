import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Bảng đóng góp', path: '/dashboard' },
    { label: 'Danh sách nhóm', path: '/teams' },
    { label: 'Tích hợp Trello', path: '/integration' },
    { label: 'Chấm chéo', path: '/peer-review' },
    { label: 'Cảnh báo', path: '/alerts' },
  ];

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        padding: '20px 0',
        minHeight: 'calc(100vh - 60px)',
      }}
    >
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  style={{
                    display: 'block',
                    padding: '12px 24px',
                    color: isActive ? '#2563eb' : '#475569',
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                    textDecoration: 'none',
                    borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
