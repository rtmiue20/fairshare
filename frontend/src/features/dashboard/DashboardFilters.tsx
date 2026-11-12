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
      className="flex flex-wrap items-center justify-between gap-4 p-3.5 sm:p-4 rounded-xl transition-all"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        color: 'var(--fg)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--fg3)', fontFamily: 'var(--f-mono)' }}
        >
          <Filter className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
          <span>Bộ lọc:</span>
        </div>

        {/* Bộ chọn Sprint */}
        <div className="relative flex items-center">
          <div
            className="pointer-events-none absolute left-3 flex items-center"
            style={{ color: 'var(--fg3)' }}
          >
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <select
            data-testid="sprint-select"
            aria-label="Chọn Sprint"
            value={selectedSprintId}
            onChange={(e) => onSelectSprint(Number(e.target.value))}
            disabled={isLoading}
            className="h-9 rounded-lg pl-8 pr-7 text-xs font-medium outline-none transition cursor-pointer"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              fontFamily: 'var(--f-body)',
            }}
          >
            {sprints.map((sprint) => (
              <option
                key={sprint.id}
                value={sprint.id}
                style={{ background: 'var(--surface)', color: 'var(--fg)' }}
              >
                {sprint.name} {sprint.isCurrent ? '(Hiện tại)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Bộ chọn Thành viên */}
        <div className="relative flex items-center">
          <div
            className="pointer-events-none absolute left-3 flex items-center"
            style={{ color: 'var(--fg3)' }}
          >
            <Users className="h-3.5 w-3.5" />
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
            className="h-9 rounded-lg pl-8 pr-7 text-xs font-medium outline-none transition cursor-pointer"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              fontFamily: 'var(--f-body)',
            }}
          >
            <option value="ALL" style={{ background: 'var(--surface)', color: 'var(--fg)' }}>
              👥 Tất cả thành viên
            </option>
            {members.map((member) => (
              <option
                key={member.id}
                value={member.id}
                style={{ background: 'var(--surface)', color: 'var(--fg)' }}
              >
                {member.name} {member.role ? `(${member.role})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trạng thái Loading hoặc Indicator */}
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg3)' }}>
        {isLoading ? (
          <div className="flex items-center gap-1.5" data-testid="filter-loading" style={{ color: 'var(--accent)' }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span style={{ fontFamily: 'var(--f-mono)' }}>Đang cập nhật chỉ số...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--ok)' }} />
            <span style={{ color: 'var(--fg2)', fontFamily: 'var(--f-mono)', fontSize: '11.5px' }}>
              Dữ liệu đồng bộ Task Board (CR-02) &amp; Git
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
