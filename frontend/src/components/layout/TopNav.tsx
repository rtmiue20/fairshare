import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { useNotificationStore } from '../../store/notificationStore';
import { FairShareIcon } from '../ui/Icons';
import { FairShareLogo } from '../ui/FairShareLogo';
import { showToast } from '../ui/Toast';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { CreateProjectModal } from '../../features/team/CreateProjectModal';
import { NotificationPopover } from '../notifications/NotificationPopover';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, logout } = useAuthStore();
  const { teams, activeTeamId, fetchTeams, setActiveTeamId } = useProjectStore();
  const unreadNotifCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
  const hasUnseenBadge = useNotificationStore((s) => s.hasUnseenBadge);
  const markBellAsSeen = useNotificationStore((s) => s.markBellAsSeen);
  const syncWithBackend = useNotificationStore((s) => s.syncWithBackend);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('openProjectMenu')
  );
  const notifRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchTeams();
    }
  }, [isAuthenticated, token, fetchTeams]);

  useEffect(() => {
    if (activeTeamId) {
      syncWithBackend(activeTeamId);
    }
  }, [activeTeamId, syncWithBackend]);

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
    { to: '/contributions/manual', label: 'Đóng góp' },
    { to: '/peer-review', label: 'Chấm chéo' },
    { to: '/integration', label: 'Tích hợp' },
    { to: '/alerts', label: 'Cảnh báo', hasDot: true },
    { to: '/report', label: 'Báo cáo' },
  ];

  const getProjectPalette = (id: number) => {
    const palettes = [
      { bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' },
      { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff' },
      { bg: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' },
      { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' },
      { bg: 'linear-gradient(135deg, #ec4899, #db2777)', color: '#fff' },
    ];
    return palettes[id % palettes.length];
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'P';
  };

  const activeTeam = teams.find((t) => t.id === activeTeamId) || teams[0];

  return (
    <>
      <header className="top" id="top">
        {/* Brand logo & Project selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/landing" className="brand" aria-label="FairShare, về trang chủ" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <FairShareLogo size={22} />
          </Link>

          {isAuthenticated && token && (
            <div ref={projectDropdownRef} className="relative">
              {teams.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsProjectOpen((prev) => !prev)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border transition-all text-xs font-semibold select-none cursor-pointer max-w-[210px] shadow-sm ${
                      isProjectOpen
                        ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/25 bg-white dark:bg-[#222632] text-zinc-950 dark:text-white'
                        : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#1c1f28] hover:bg-zinc-100 dark:hover:bg-[#262a36] hover:border-slate-400 dark:hover:border-white/35 text-zinc-800 dark:text-zinc-200'
                    }`}
                    title={`Dự án đang chọn: ${activeTeam?.name || ''}`}
                  >
                    {/* Project Avatar */}
                    <span
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm"
                      style={{
                        background: getProjectPalette(activeTeam?.id || 1).bg,
                        color: getProjectPalette(activeTeam?.id || 1).color,
                      }}
                    >
                      {getInitials(activeTeam?.name || 'K')}
                    </span>

                    {/* Project Name */}
                    <span className="truncate max-w-[130px] font-bold tracking-tight">
                      {activeTeam?.name || 'Chọn dự án'}
                    </span>

                    {/* Chevron Icon */}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isProjectOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Popup Menu */}
                  {isProjectOpen && (
                    <div
                      className="absolute left-0 z-[100] w-[320px] rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                      style={{
                        top: 'calc(100% + 22px)',
                        boxShadow:
                          theme === 'dark'
                            ? '0 24px 50px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.16), 0 8px 24px -4px rgba(0, 0, 0, 0.6)'
                            : '0 20px 45px -12px rgba(15, 23, 42, 0.22), 0 6px 18px -4px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      {/* Header */}
                      <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
                          DỰ ÁN CỦA BẠN
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                          {teams.length}
                        </span>
                      </div>

                      {/* Project List */}
                      <div className="max-h-64 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                        {teams.map((t) => {
                          const isActive = (activeTeamId || teams[0]?.id) === t.id;
                          const palette = getProjectPalette(t.id);
                          const initials = getInitials(t.name);

                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setActiveTeamId(t.id);
                                setIsProjectOpen(false);
                                showToast(`Đã chuyển sang dự án: ${t.name}`);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${
                                isActive
                                  ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-semibold shadow-xs'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                              }`}
                            >
                              {/* Project Avatar */}
                              <span
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm transition-transform group-hover:scale-105"
                                style={{ background: palette.bg, color: palette.color }}
                              >
                                {initials}
                              </span>

                              {/* Project Info */}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                  {t.name}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {isActive ? 'Đang hoạt động' : 'Chuyển không gian làm việc'}
                                </div>
                              </div>

                              {/* Active Checkmark */}
                              {isActive && (
                                <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 stroke-[2.5]" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Bottom Action: Create Project */}
                      <div className="p-2 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-black/30">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProjectOpen(false);
                            setIsModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-white dark:bg-cyan-500/10 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 border border-dashed border-cyan-500/40 hover:border-cyan-500 transition-all cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tạo dự án mới...</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <Plus size={13} />
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
          {/* Nút Chuông thông báo (bên cạnh theme toggle) */}
          <div className="notif-anchor" ref={notifRef} style={{ position: 'relative' }}>
            <button
              className={`icon-btn notif-btn-trigger ${isNotifOpen ? 'active' : ''}`}
              id="notifBtn"
              type="button"
              onClick={() => {
                setIsNotifOpen((prev) => {
                  const next = !prev;
                  if (next) {
                    markBellAsSeen();
                  }
                  return next;
                });
              }}
              aria-label="Thông báo"
              title={unreadNotifCount > 0 ? `${unreadNotifCount} thông báo mới` : 'Thông báo'}
            >
              <FairShareIcon name="bell" />
              {hasUnseenBadge && unreadNotifCount > 0 && (
                <span className="notif-badge-count" title={`${unreadNotifCount} thông báo mới`}>
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <NotificationPopover onClose={() => setIsNotifOpen(false)} />
            )}
          </div>

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
