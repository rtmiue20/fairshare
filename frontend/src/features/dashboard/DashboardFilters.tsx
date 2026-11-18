import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Users, Filter, Loader2, ChevronDown, Check } from 'lucide-react';

export interface SprintOption {
  id: number;
  name: string;
  isCurrent?: boolean;
}

export interface MemberOption {
  id: number;
  name: string;
  role?: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface DashboardFiltersProps {
  sprints: SprintOption[];
  selectedSprintId: number;
  onSelectSprint: (sprintId: number) => void;
  members: MemberOption[];
  selectedUserId: number | 'ALL';
  onSelectMember: (userId: number | 'ALL') => void;
  isLoading?: boolean;
}

const getInitials = (name: string): string => {
  return name
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(-2)
    .join('')
    .toUpperCase();
};

const getAvatarBg = (id: number | string): string => {
  const colors = [
    'linear-gradient(135deg, #0ea5e9, #2563eb)',
    'linear-gradient(135deg, #8b5cf6, #6366f1)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #06b6d4, #0284c7)',
  ];
  const num = typeof id === 'number' ? id : 0;
  return colors[Math.abs(num) % colors.length];
};

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  sprints,
  selectedSprintId,
  onSelectSprint,
  members,
  selectedUserId,
  onSelectMember,
  isLoading = false,
}) => {
  const [isSprintOpen, setIsSprintOpen] = useState(false);
  const [isMemberOpen, setIsMemberOpen] = useState(false);
  const sprintRef = useRef<HTMLDivElement>(null);
  const memberRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sprintRef.current && !sprintRef.current.contains(event.target as Node)) {
        setIsSprintOpen(false);
      }
      if (memberRef.current && !memberRef.current.contains(event.target as Node)) {
        setIsMemberOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSprint = sprints.find((s) => s.id === selectedSprintId) ?? sprints[0];
  const currentMember = selectedUserId === 'ALL' ? null : members.find((m) => m.id === selectedUserId);

  return (
    <div
      data-testid="dashboard-filters"
      className="w-fit max-w-full inline-flex flex-wrap items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-2xl transition-all shadow-xs"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        color: 'var(--fg)',
        boxShadow: '0 2px 10px -2px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Label Bộ lọc */}
      <div
        className="flex items-center gap-1.5 pl-2.5 pr-1 text-xs font-bold uppercase tracking-wider"
        style={{ color: 'var(--fg3)', fontFamily: 'var(--f-mono)' }}
      >
        <Filter className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
        <span>Bộ lọc:</span>
      </div>

      {/* ───────── BỘ CHỌN SPRINT (CUSTOM BEAUTIFUL DROPDOWN) ───────── */}
      <div className="relative" ref={sprintRef}>
        {/* Native Hidden Select for test suite compatibility */}
        <select
          data-testid="sprint-select"
          aria-label="Chọn Sprint"
          value={selectedSprintId}
          onChange={(e) => onSelectSprint(Number(e.target.value))}
          disabled={isLoading}
          className="sr-only"
          tabIndex={-1}
        >
          {sprints.map((sprint) => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.name} {sprint.isCurrent ? '(Hiện tại)' : ''}
            </option>
          ))}
        </select>

        {/* Custom Trigger Button */}
        <button
          type="button"
          data-testid="btn-sprint-trigger"
          disabled={isLoading}
          onClick={() => {
            setIsSprintOpen((prev) => !prev);
            setIsMemberOpen(false);
          }}
          className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
            isSprintOpen
              ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/50 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20'
              : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border-slate-300/80 dark:border-white/15 text-slate-800 dark:text-slate-200'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span className="truncate max-w-[200px] sm:max-w-[260px]">
            {currentSprint?.name ?? `Sprint ${selectedSprintId}`}
          </span>
          {currentSprint?.isCurrent && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
              Hiện tại
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
              isSprintOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
            }`}
          />
        </button>

        {/* Custom Popover Menu */}
        {isSprintOpen && (
          <div
            className="absolute left-0 z-50 w-[340px] rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
            style={{
              top: 'calc(100% + 8px)',
              boxShadow:
                '0 24px 50px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
                DANH SÁCH SPRINT
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                {sprints.length} Sprints
              </span>
            </div>

            {/* Items List */}
            <div className="max-h-64 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
              {sprints.map((sprint) => {
                const isActive = sprint.id === selectedSprintId;

                return (
                  <button
                    key={sprint.id}
                    type="button"
                    onClick={() => {
                      onSelectSprint(sprint.id);
                      setIsSprintOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                      isActive
                        ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-bold shadow-xs'
                        : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    {/* Sprint Number Badge */}
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      S{sprint.id}
                    </span>

                    {/* Sprint Title & Subtitle */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                        {sprint.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {sprint.isCurrent ? 'Sprint đang hoạt động' : `Sprint kết thúc · ID #${sprint.id}`}
                      </div>
                    </div>

                    {/* Status & Active Check */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sprint.isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Hiện tại
                        </span>
                      )}
                      {isActive && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ───────── BỘ CHỌN THÀNH VIÊN (CUSTOM BEAUTIFUL DROPDOWN) ───────── */}
      <div className="relative" ref={memberRef}>
        {/* Native Hidden Select for test suite compatibility */}
        <select
          data-testid="member-select"
          aria-label="Chọn thành viên"
          value={selectedUserId}
          onChange={(e) => {
            const val = e.target.value;
            onSelectMember(val === 'ALL' ? 'ALL' : Number(val));
          }}
          disabled={isLoading}
          className="sr-only"
          tabIndex={-1}
        >
          <option value="ALL">👥 Tất cả thành viên</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} {member.role ? `(${member.role})` : ''}
            </option>
          ))}
        </select>

        {/* Custom Trigger Button */}
        <button
          type="button"
          data-testid="btn-member-trigger"
          disabled={isLoading}
          onClick={() => {
            setIsMemberOpen((prev) => !prev);
            setIsSprintOpen(false);
          }}
          className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
            isMemberOpen
              ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/50 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20'
              : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border-slate-300/80 dark:border-white/15 text-slate-800 dark:text-slate-200'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate max-w-[150px] sm:max-w-[190px]">
            {selectedUserId === 'ALL'
              ? 'Tất cả thành viên'
              : currentMember?.name ?? 'Thành viên'}
          </span>
          {currentMember?.role && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
              {currentMember.role}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
              isMemberOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
            }`}
          />
        </button>

        {/* Custom Popover Menu */}
        {isMemberOpen && (
          <div
            className="absolute left-0 z-50 w-[320px] rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
            style={{
              top: 'calc(100% + 8px)',
              boxShadow:
                '0 24px 50px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
                LỌC THEO THÀNH VIÊN
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                {members.length} Người
              </span>
            </div>

            {/* Items List */}
            <div className="max-h-64 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
              {/* Option: Tất cả thành viên */}
              <button
                type="button"
                onClick={() => {
                  onSelectMember('ALL');
                  setIsMemberOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${
                  selectedUserId === 'ALL'
                    ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-bold shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  <Users className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Tất cả thành viên
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Hiển thị toàn bộ nhóm
                  </div>
                </div>
                {selectedUserId === 'ALL' && (
                  <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 stroke-[2.5]" />
                )}
              </button>

              {/* Danh sách từng thành viên */}
              {members.map((member) => {
                const isActive = selectedUserId === member.id;
                const initials = getInitials(member.name);
                const bg = getAvatarBg(member.id);

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      onSelectMember(member.id);
                      setIsMemberOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${
                      isActive
                        ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-bold shadow-xs'
                        : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-xs transition-transform group-hover:scale-105"
                      style={{ background: bg }}
                    >
                      {initials}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {member.role ?? 'Thành viên dự án'}
                      </div>
                    </div>
                    {member.role && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-white/10">
                        {member.role}
                      </span>
                    )}
                    {isActive && (
                      <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 stroke-[2.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Nút đặt lại nhanh nếu đang lọc theo thành viên */}
      {selectedUserId !== 'ALL' && (
        <button
          type="button"
          onClick={() => onSelectMember('ALL')}
          className="h-9 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Xóa bộ lọc thành viên"
        >
          <span className="text-sm leading-none">&times;</span>
          <span>Đặt lại</span>
        </button>
      )}

      {/* Trạng thái Loading */}
      {isLoading && (
        <div className="flex items-center gap-1.5 px-2 text-xs" data-testid="filter-loading" style={{ color: 'var(--accent)' }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span style={{ fontFamily: 'var(--f-mono)' }}>Đang cập nhật chỉ số...</span>
        </div>
      )}
    </div>
  );
};
