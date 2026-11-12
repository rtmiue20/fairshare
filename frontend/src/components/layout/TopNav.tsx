import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { FairShareIcon } from '../ui/Icons';
import { FairShareLogo } from '../ui/FairShareLogo';
import { showToast } from '../ui/Toast';
import { FolderPlus } from 'lucide-react';
import { CreateProjectModal } from '../../features/team/CreateProjectModal';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { teams, activeTeamId, fetchTeams, setActiveTeamId } = useProjectStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTeams();
    }
  }, [isAuthenticated, fetchTeams]);

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
    { to: '/board', label: 'Kanban' },
    { to: '/contributions/manual', label: 'Đóng góp' },
    { to: '/peer-review', label: 'Chấm chéo' },
    { to: '/alerts', label: 'Cảnh báo', hasDot: true },
    { to: '/report', label: 'Báo cáo' },
  ];

  const handleSelectTeam = (val: string) => {
    if (val === '__CREATE_NEW__') {
      setIsModalOpen(true);
      return;
    }
    const num = Number(val);
    if (num > 0) {
      setActiveTeamId(num);
      showToast(`Đã chuyển sang dự án: ${teams.find((t) => t.id === num)?.name || num}`);
    }
  };

  return (
    <>
      <header className="top" id="top">
        {/* Brand logo & Project selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/" className="brand" aria-label="FairShare, về trang chủ" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <FairShareLogo size={22} />
          </Link>

          {isAuthenticated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {teams.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <select
                    aria-label="Chọn dự án"
                    value={activeTeamId || teams[0]?.id || ''}
                    onChange={(e) => handleSelectTeam(e.target.value)}
                    style={{
                      height: '28px',
                      maxWidth: '190px',
                      padding: '0 8px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: 'var(--surface2)',
                      color: 'var(--fg)',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                    <option value="__CREATE_NEW__">+ Tạo dự án mới...</option>
                  </select>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="btn ghost sm"
                  style={{ fontSize: '11px', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <FolderPlus size={12} style={{ color: 'var(--accent)' }} />
                  <span>+ Tạo dự án</span>
                </button>
              )}
            </div>
          )}
        </div>

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

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
