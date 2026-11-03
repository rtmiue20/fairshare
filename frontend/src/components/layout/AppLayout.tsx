import React from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatedTopDock } from './AnimatedTopDock';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#090a0f] relative flex flex-col font-sans text-zinc-100 antialiased selection:bg-zinc-800 selection:text-zinc-100">
      {/* Subtle Dot Matrix & Top Faint Horizon Glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Subtle dot matrix grid */}
        <div className="absolute inset-0 threeui-dot-grid opacity-30" />

        {/* Linear subtle top glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-zinc-700/10 via-zinc-800/5 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* Minimalist Command Bar */}
      <AnimatedTopDock />

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-2">
        <Outlet />
      </main>

      {/* Subtle modern footer indicator */}
      <footer className="w-full border-t border-zinc-800/80 py-5 px-4 text-center text-xs text-zinc-500 bg-[#090a0f]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">FairShare Engine v0.3.1 • Hệ thống đo lường đóng góp đồ án QLDA UEH</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px]">
            <span>Tuân thủ Nghị định 13/2023/NĐ-CP</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
