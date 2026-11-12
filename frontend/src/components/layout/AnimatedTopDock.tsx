import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  AlertTriangle,
  UserCheck,
  LogOut,
  ArrowRight,
} from 'lucide-react';

export interface AnimatedTopDockProps {
  variant?: 'modern' | 'glass' | 'sable';
}

export const AnimatedTopDock: React.FC<AnimatedTopDockProps> = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { label: 'Bảng đóng góp', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Nhóm đồ án', path: '/teams', icon: Users },
    { label: 'Kanban Board', path: '/board', icon: Kanban },
    { label: 'Chấm chéo', path: '/peer-review', icon: CheckSquare },
    { label: 'Cảnh báo', path: '/alerts', icon: AlertTriangle },
    { label: 'Hồ sơ & Consent', path: '/profile', icon: UserCheck },
  ];

  return (
    <header className="sticky top-0 z-50 w-full pt-3 pb-2 px-4 flex flex-col items-center pointer-events-none mb-3">
      {/* Linear / Vercel Minimalist Command Bar Capsule */}
      <nav className="pointer-events-auto flex items-center justify-between gap-2 sm:gap-3 p-1.5 rounded-full border transition-all duration-300 max-w-[1240px] bg-[#0c0d12]/95 text-zinc-100 border-zinc-800/80 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md">
        {/* Left: Brand Identity with Minimalist FS Block */}
        <Link
          to="/teams/1"
          className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full group transition-all"
        >
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs tracking-wider text-white shadow-sm group-hover:border-zinc-700 transition-colors">
            FS
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-xs tracking-tight text-zinc-100 hidden sm:inline-block">
              FairShare
            </span>
            <span className="text-[10px] text-zinc-500 font-mono hidden md:inline-block">
              Đồ án nhóm
            </span>
          </div>
        </Link>

        {/* Separator */}
        <div className="h-4 w-px bg-zinc-800 mx-0.5" />

        {/* Center: Navigation Dock */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 px-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/teams'
                ? location.pathname.startsWith('/teams')
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path === '/teams' ? '/teams/1' : item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60 font-medium'
                }`}
              >
                <Icon
                  size={14}
                  className={`transition-opacity ${
                    isActive ? 'text-zinc-100 opacity-100' : 'opacity-60'
                  }`}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-zinc-800 mx-0.5" />

        {/* Right: Actions / User Profile Pill */}
        {user ? (
          <div className="flex items-center gap-1.5 pr-1">
            <Link
              to="/profile"
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full text-xs transition-all bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300"
              title="Hồ sơ cá nhân và cài đặt consent"
            >
              <div className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-[10px] shadow-sm">
                {(user.fullName || 'T').charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-[11px] max-w-[90px] truncate hidden md:inline-block text-zinc-200">
                {user.fullName || 'Hà Ngọc Thiện'}
              </span>
            </Link>

            <button
              onClick={logout}
              title="Đăng xuất"
              className="p-1.5 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pr-1">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs shadow-sm transition-all"
            >
              <span>Bắt đầu</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};
