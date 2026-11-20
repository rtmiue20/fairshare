import React from 'react';
import { SprintTimelineDto } from '../../types/contribution';
import { Calendar, Clock, Layers } from 'lucide-react';

interface TimelineScrubberProps {
  sprints: SprintTimelineDto[];
  selectedSprintId: number | null;
  onSelectSprint: (sprintId: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  sprints,
  selectedSprintId,
  onSelectSprint,
}) => {
  return (
    <aside
      className="w-64 h-full flex flex-col justify-between p-4 z-20 backdrop-blur-xl border-r select-none transition-all overflow-y-auto overscroll-contain"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        color: 'var(--fg)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--line) transparent',
      }}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.25))',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: 'var(--accent)',
            }}
          >
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--fg)' }}>
              Dòng Thời Gian Sprint
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--fg3)' }}>
              Điều hướng chu kỳ dự án
            </p>
          </div>
        </div>

        {/* Vertical Sprint Timeline Track */}
        <div className="relative pl-4 space-y-3.5 my-2">
          {/* Vertical Glowing Line */}
          <div
            className="absolute left-2.5 top-2 bottom-2 w-[2px]"
            style={{
              background: 'linear-gradient(to bottom, var(--accent, #06b6d4), var(--primary, #6366f1), var(--line))',
            }}
          />

          {sprints.map((sp) => {
            const isSelected = selectedSprintId === sp.id;
            const isActive = sp.isCurrent || sp.status === 'ACTIVE';

            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => onSelectSprint(sp.id)}
                className={`relative group w-full text-left pl-5 pr-3 py-2.5 rounded-xl transition-all ${
                  isSelected
                    ? 'shadow-md ring-1 ring-[var(--accent)]'
                    : 'hover:bg-[var(--surface2)]'
                }`}
                style={{
                  background: isSelected
                    ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                    : 'transparent',
                }}
              >
                {/* Timeline Node Dot */}
                <span
                  className={`absolute -left-[3px] top-4 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'bg-[var(--accent)] border-white shadow-[0_0_10px_var(--accent)] scale-125'
                      : isActive
                      ? 'bg-[var(--primary)] border-indigo-200'
                      : 'bg-zinc-700 border-zinc-500'
                  }`}
                />

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs tracking-wide ${
                      isSelected ? 'font-bold text-[var(--accent)]' : 'font-semibold text-[var(--fg)]'
                    }`}
                  >
                    {sp.name}
                  </span>
                  {isActive && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                      style={{
                        background: 'color-mix(in srgb, var(--ok) 20%, transparent)',
                        border: '1px solid var(--ok)',
                        color: 'var(--ok)',
                      }}
                    >
                      Hiện tại
                    </span>
                  )}
                </div>

                {(sp.startDate || sp.endDate) && (
                  <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: 'var(--fg3)' }}>
                    <Calendar className="w-3 h-3 text-[var(--fg3)]" />
                    <span>
                      {sp.startDate || 'Bắt đầu'} → {sp.endDate || 'Hiện tại'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Color Legend (Đồng bộ bảng màu mô hình 4 chiều) */}
      <div
        className="rounded-xl p-3 mt-4 border text-[11px]"
        style={{
          background: 'var(--surface2)',
          borderColor: 'var(--line)',
        }}
      >
        <div className="flex items-center gap-1.5 mb-2 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg2)' }}>
          <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Chú Thích Trục Tác Động</span>
        </div>

        <div className="space-y-1.5 text-[10px]" style={{ color: 'var(--fg2)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span>D1: Sản lượng (Story Points, Cards)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
            <span>D2: Tin cậy & Đúng hạn (Rework, Trễ)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
            <span>D3: Phối hợp & Review (@mention)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_6px_#ec4899]" />
            <span>D4: Chấm chéo ẩn danh (≥ 3 lượt)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span>Rào cản / Khả dụng (Impediment a_i)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
