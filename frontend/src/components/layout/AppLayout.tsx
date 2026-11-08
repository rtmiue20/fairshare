import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { ToastContainer } from '../ui/Toast';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col antialiased selection:bg-zinc-800 selection:text-zinc-100" style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--f-body)' }}>
      {/* Top Bar Navigation from FairShare UI sample */}
      <TopNav />

      {/* Main Content Workspace with padding-top: var(--top) handled in CSS */}
      <main id="main" className="flex-1 w-full" style={{ minHeight: 'calc(100vh - var(--top))' }}>
        <Outlet />
      </main>

      {/* Modern footer */}
      <footer className="w-full border-t border-[var(--line)] py-5 px-4 text-center text-xs text-[var(--fg3)]" style={{ background: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ok)' }} />
            <span style={{ color: 'var(--fg2)' }}>FairShare Engine v0.3.1 • Hệ thống đo lường đóng góp đồ án QLDA UEH</span>
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
