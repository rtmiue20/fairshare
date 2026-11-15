import React, { useState } from 'react';
import { MultidimensionalNetworkDto } from '../../types/contribution';
import {
  Users,
  Search,
  Filter,
  Send,
} from 'lucide-react';

interface BottomMetricsDockProps {
  networkData: MultidimensionalNetworkDto | null;
  members: Array<{ id: number; fullName: string; email: string }>;
  selectedUserId: number | null;
  onSelectUser: (userId: number) => void;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  onSearchQuery?: (q: string) => void;
}

export const BottomMetricsDock: React.FC<BottomMetricsDockProps> = ({
  networkData,
  members,
  selectedUserId,
  onSelectUser,
  activeFilter,
  onSelectFilter,
  onSearchQuery,
}) => {
  const [query, setQuery] = useState('');

  const filterOptions = [
    { id: 'ALL', label: 'Tất cả các trục' },
    { id: 'D1', label: 'D1: Sản lượng' },
    { id: 'D2', label: 'D2: Tin cậy' },
    { id: 'D3', label: 'D3: Phối hợp' },
    { id: 'D4', label: 'D4: Chấm chéo' },
    { id: 'IMPEDIMENT', label: 'Rào cản & Khả dụng' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchQuery && query.trim()) {
      onSearchQuery(query.trim());
    }
  };

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 max-w-4xl w-[92%] select-none pointer-events-auto"
    >
      {/* 1. Dimension Filter Chips Bar */}
      <div
        className="flex items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-xl border shadow-2xl overflow-x-auto max-w-full"
        style={{
          background: 'rgba(11, 17, 30, 0.85)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 flex items-center gap-1">
          <Filter className="w-3 h-3 text-cyan-400" />
          Bộ lọc:
        </span>

        {filterOptions.map((opt) => {
          const isActive = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectFilter(opt.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 2. Glassmorphic Input & KPI Dock (Khớp thiết kế Image 2) */}
      <div
        className="w-full rounded-2xl p-2.5 backdrop-blur-2xl border shadow-2xl flex flex-wrap items-center justify-between gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(8, 14, 26, 0.9), rgba(15, 23, 42, 0.75))',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Left: Member Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              color: '#ffffff',
            }}
          >
            <Users className="w-4 h-4" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-zinc-400 uppercase block tracking-wider">
              Chọn Thành Viên Quan Sát
            </label>
            <select
              aria-label="Chọn thành viên quan sát"
              value={selectedUserId || ''}
              onChange={(e) => onSelectUser(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Live KPI Signals */}
        {networkData && (
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center hidden sm:block">
              <span className="text-[10px] text-zinc-400 block">Đóng góp p_i</span>
              <strong className="text-cyan-400 font-extrabold text-sm">
                {(networkData.finalPct * 100).toFixed(1)}%
              </strong>
            </div>

            <div className="w-[1px] h-6 bg-white/10 hidden sm:block" />

            <div className="text-center hidden sm:block">
              <span className="text-[10px] text-zinc-400 block">Điểm C_i (Sigmoid)</span>
              <strong className="text-white font-extrabold text-sm">
                {networkData.compositeScore.toFixed(1)}
              </strong>
            </div>

            <div className="w-[1px] h-6 bg-white/10 hidden sm:block" />

            <div className="text-center hidden md:block">
              <span className="text-[10px] text-zinc-400 block">Khoảng cách tâm δ_i</span>
              <strong className="text-emerald-400 font-bold text-sm">
                {networkData.distanceToCenter.toFixed(2)}
              </strong>
            </div>

            <div className="w-[1px] h-6 bg-white/10 hidden lg:block" />

            <div className="text-center hidden lg:block">
              <span className="text-[10px] text-zinc-400 block">Trọng số w</span>
              <strong className="text-zinc-300 font-mono text-[11px]">
                (0.40, 0.20, 0.15, 0.25)
              </strong>
            </div>
          </div>
        )}

        {/* Right: Quick AI / Query Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 flex-1 max-w-xs min-w-[200px]">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Tra cứu nguyên nhân / tác động..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            aria-label="Gửi tra cứu"
            className="p-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black transition shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
