import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { ToastContainer } from '../ui/Toast';
import { FairShareLogo } from '../ui/FairShareLogo';

export const AppLayout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let pageTitle = 'FairShare';
    if (path.startsWith('/dashboard') || path.startsWith('/dong-gop')) {
      pageTitle = 'Dashboard Đóng Góp · FairShare';
    } else if (path.startsWith('/teams/') && path.endsWith('/board')) {
      pageTitle = 'Bảng Kanban · FairShare';
    } else if (path.startsWith('/teams/') && path !== '/teams') {
      pageTitle = 'Chi Tiết Nhóm · FairShare';
    } else if (path.startsWith('/teams')) {
      pageTitle = 'Dự Án Nhóm · FairShare';
    } else if (path.startsWith('/board')) {
      pageTitle = 'Bảng Kanban · FairShare';
    } else if (path.startsWith('/peer-review')) {
      pageTitle = 'Chấm Chéo Ẩn Danh · FairShare';
    } else if (path.startsWith('/alerts')) {
      pageTitle = 'Cảnh Báo Đóng Góp · FairShare';
    } else if (path.startsWith('/report')) {
      pageTitle = 'Báo Cáo Minh Chứng · FairShare';
    } else if (path.startsWith('/profile')) {
      pageTitle = 'Cài Đặt & Hồ Sơ · FairShare';
    } else if (path.startsWith('/contributions/manual')) {
      pageTitle = 'Khai Báo Minh Chứng · FairShare';
    } else {
      pageTitle = 'FairShare • Đo lường đóng góp đồ án nhóm';
    }
    document.title = pageTitle;
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex flex-col antialiased selection:bg-zinc-800 selection:text-zinc-100 relative overflow-x-hidden"
      style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--f-body)' }}
    >
      {/* Blurred Intro Background for all workspace tabs */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            inset: '-40px',
            backgroundImage: `url('/intro-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'var(--tab-bg-intro-filter, blur(28px) saturate(1.3))',
            transform: 'scale(1.08)',
            opacity: 'var(--tab-bg-intro-opacity, 0.52)',
            transition: 'opacity 0.3s ease, filter 0.3s ease',
          }}
        />
        {/* Soft radial overlay to blend with current theme background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 75% 45%, transparent 25%, var(--bg) 92%), radial-gradient(ellipse at 20% 85%, color-mix(in srgb, var(--rb1) 10%, transparent), transparent 65%)',
            opacity: 0.82,
          }}
        />
      </div>

      {/* Top Bar Navigation from FairShare UI sample */}
      <TopNav />

      {/* Main Content Workspace */}
      <main id="main" className="flex-1 w-full relative z-10" style={{ minHeight: 'calc(100vh - var(--top))' }}>
        <Outlet />
      </main>

      {/* Modern footer */}
      <footer
        className="w-full border-t border-[var(--line)] py-5 px-4 text-center text-xs text-[var(--fg3)] relative z-10"
        style={{
          background: 'color-mix(in srgb, var(--surface) 80%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FairShareLogo size={18} showText={false} />
            <span style={{ color: 'var(--fg2)' }}>FairShare Engine v0.3.1 • Hệ thống đo lường đóng góp đồ án nhóm</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: 'var(--fg3)' }}>
            <span>Tuân thủ Nghị định 13/2023/NĐ-CP · Môn Quản lý dự án CNTT</span>
          </div>
        </div>
      </footer>

      {/* Global Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};
