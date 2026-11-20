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
        className="flex items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-xl border shadow-xl overflow-x-auto max-w-full"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--line)',
        }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 flex items-center gap-1"
          style={{ color: 'var(--fg3)' }}
        >
          <Filter className="w-3 h-3 text-[var(--accent)]" />
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
                  ? 'bg-[var(--accent)] text-white font-bold shadow-md'
                  : 'hover:bg-[var(--surface2)]'
              }`}
              style={{
                color: isActive ? '#ffffff' : 'var(--fg2)',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 2. Glassmorphic Input & KPI Dock */}
      <div
        className="w-full rounded-2xl p-2.5 backdrop-blur-2xl border shadow-2xl flex flex-wrap items-center justify-between gap-3"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--line)',
        }}
      >
        {/* Left: Member Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent, #06b6d4), var(--primary, #6366f1))',
              color: '#ffffff',
            }}
          >
            <Users className="w-4 h-4" />
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase block tracking-wider" style={{ color: 'var(--fg3)' }}>
              Chọn Thành Viên Quan Sát
            </label>
            <select
              aria-label="Chọn thành viên quan sát"
              value={selectedUserId || ''}
              onChange={(e) => onSelectUser(Number(e.target.value))}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
              style={{ color: 'var(--fg)' }}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id} style={{ background: 'var(--surface)', color: 'var(--fg)' }}>
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
              <span className="text-[10px] block" style={{ color: 'var(--fg3)' }}>Đóng góp p_i</span>
              <strong className="font-extrabold text-sm" style={{ color: 'var(--accent)' }}>
                {(networkData.finalPct * 100).toFixed(1)}%
              </strong>
            </div>

            <div className="w-[1px] h-6 hidden sm:block" style={{ background: 'var(--line)' }} />

            <div className="text-center hidden sm:block">
              <span className="text-[10px] block" style={{ color: 'var(--fg3)' }}>Điểm C_i (Sigmoid)</span>
              <strong className="font-extrabold text-sm" style={{ color: 'var(--fg)' }}>
                {networkData.compositeScore.toFixed(1)}
              </strong>
            </div>

            <div className="w-[1px] h-6 hidden sm:block" style={{ background: 'var(--line)' }} />

            <div className="text-center hidden md:block">
              <span className="text-[10px] block" style={{ color: 'var(--fg3)' }}>Khoảng cách tâm δ_i</span>
              <strong className="font-bold text-sm" style={{ color: 'var(--ok)' }}>
                {networkData.distanceToCenter.toFixed(2)}
              </strong>
            </div>

            <div className="w-[1px] h-6 hidden lg:block" style={{ background: 'var(--line)' }} />

            <div className="text-center hidden lg:block">
              <span className="text-[10px] block" style={{ color: 'var(--fg3)' }}>Trọng số w</span>
              <strong className="font-mono text-[11px]" style={{ color: 'var(--fg2)' }}>
                (0.40, 0.20, 0.15, 0.25)
              </strong>
            </div>
          </div>
        )}

        {/* Right: Quick Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 flex-1 max-w-xs min-w-[200px]">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Tra cứu nguyên nhân / tác động..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none transition"
              style={{
                background: 'var(--surface2)',
                borderColor: 'var(--line)',
                color: 'var(--fg)',
              }}
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg3)' }} />
          </div>
          <button
            type="submit"
            aria-label="Gửi tra cứu"
            className="p-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white transition shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
