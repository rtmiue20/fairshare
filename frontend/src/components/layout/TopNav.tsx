import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { FairShareIcon } from '../ui/Icons';
import { showToast } from '../ui/Toast';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('fs-theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.dataset.theme = initial;
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('fs-theme', nextTheme);
    showToast(`Đã chuyển sang giao diện ${nextTheme === 'dark' ? 'tối' : 'sáng'}`);
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/teams', label: 'Dự án' },
    { to: '/contributions', label: 'Đóng góp' },
    { to: '/board', label: 'Kanban' },
    { to: '/peer-review', label: 'Chấm chéo' },
    { to: '/integration', label: 'Tích hợp' },
    { to: '/alerts', label: 'Cảnh báo', hasDot: true },
    { to: '/report', label: 'Báo cáo' },
  ];

  return (
    <header className="top" id="top">
      {/* Brand logo */}
      <Link to="/" className="brand" aria-label="FairShare, về trang chủ">
        <i aria-hidden="true" />
        <span>FAIRSHARE</span>
      </Link>

      {/* Main navigation links */}
      <nav className="links" id="nav" aria-label="Chính">
        {navLinks.map((item) => {
          const isActive =
            item.to === '/teams'
              ? location.pathname.startsWith('/teams')
              : location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
              {item.hasDot && <span className="dot" title="1 cảnh báo mới" />}
            </Link>
          );
        })}
      </nav>

      {/* Action buttons */}
      <div className="acts">
        <button
          className="icon-btn"
          id="themeBtn"
          type="button"
          onClick={toggleTheme}
          aria-label="Đổi giao diện sáng/tối"
          title="Đổi giao diện sáng/tối"
        >
          <FairShareIcon name={theme === 'dark' ? 'moon' : 'sun'} />
        </button>

        <Link
          className="icon-btn"
          id="setBtn"
          to="/profile"
          aria-label="Cài đặt và hồ sơ"
          title="Cài đặt và hồ sơ"
          aria-current={location.pathname === '/profile' ? 'page' : undefined}
        >
          <FairShareIcon name="set" />
        </Link>

        {isAuthenticated && user ? (
          <button
            className="btn sm"
            onClick={() => {
              logout();
              showToast('Đã đăng xuất');
              navigate('/login');
            }}
            title={`Đang đăng nhập: ${user.fullName || user.email}`}
          >
            Đăng xuất
          </button>
        ) : (
          <Link className="btn sm" to="/dashboard">
            Dùng thử
          </Link>
        )}
      </div>
    </header>
  );
};
