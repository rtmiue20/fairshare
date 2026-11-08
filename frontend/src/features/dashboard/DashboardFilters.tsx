import React from 'react';
import { Calendar, Users, Filter, Loader2 } from 'lucide-react';

export interface SprintOption {
  id: number;
  name: string;
  isCurrent?: boolean;
}

export interface MemberOption {
  id: number;
  name: string;
  role?: string;
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

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  sprints,
  selectedSprintId,
  onSelectSprint,
  members,
  selectedUserId,
  onSelectMember,
  isLoading = false,
}) => {
  return (
    <div
      data-testid="dashboard-filters"
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 backdrop-blur-md"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="h-4 w-4 text-indigo-400" />
          <span>Bộ lọc Dashboard:</span>
        </div>

        {/* Bộ chọn Sprint */}
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
            <Calendar className="h-4 w-4" />
          </div>
          <select
            data-testid="sprint-select"
            aria-label="Chọn Sprint"
            value={selectedSprintId}
            onChange={(e) => onSelectSprint(Number(e.target.value))}
            disabled={isLoading}
            className="h-10 rounded-xl border border-slate-700/80 bg-slate-800/90 pl-9 pr-8 text-xs font-medium text-slate-100 shadow-inner transition hover:border-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id} className="bg-slate-900 text-slate-100">
                {sprint.name} {sprint.isCurrent ? '(Hiện tại)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Bộ chọn Thành viên */}
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
            <Users className="h-4 w-4" />
          </div>
          <select
            data-testid="member-select"
            aria-label="Chọn thành viên"
            value={selectedUserId}
            onChange={(e) => {
              const val = e.target.value;
              onSelectMember(val === 'ALL' ? 'ALL' : Number(val));
            }}
            disabled={isLoading}
            className="h-10 rounded-xl border border-slate-700/80 bg-slate-800/90 pl-9 pr-8 text-xs font-medium text-slate-100 shadow-inner transition hover:border-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="ALL" className="bg-slate-900 text-slate-100">
              👥 Tất cả thành viên
            </option>
            {members.map((member) => (
              <option key={member.id} value={member.id} className="bg-slate-900 text-slate-100">
                {member.name} {member.role ? `(${member.role})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trạng thái Loading hoặc Indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {isLoading ? (
          <div className="flex items-center gap-1.5 text-indigo-400" data-testid="filter-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang cập nhật chỉ số...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>Dữ liệu đồng bộ</span>
          </div>
        )}
      </div>
    </div>
  );
};

