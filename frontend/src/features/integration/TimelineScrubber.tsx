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
      className="w-64 h-full flex flex-col justify-between p-4 z-20 backdrop-blur-xl border-r select-none transition-all"
      style={{
        background: 'rgba(7, 11, 20, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.25))',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#38bdf8',
            }}
          >
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              Dòng Thời Gian Sprint
            </h3>
            <p className="text-[10px] text-zinc-400">Điều hướng chu kỳ dự án</p>
          </div>
        </div>

        {/* Vertical Sprint Timeline Track */}
        <div className="relative pl-4 space-y-3.5 my-2">
          {/* Vertical Glowing Line */}
          <div
            className="absolute left-2.5 top-2 bottom-2 w-[2px]"
            style={{
              background: 'linear-gradient(to bottom, rgba(6, 182, 212, 0.8), rgba(99, 102, 241, 0.5), rgba(255, 255, 255, 0.1))',
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
                    ? 'shadow-lg ring-1 ring-cyan-400/40'
                    : 'hover:bg-white/[0.04]'
                }`}
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(99, 102, 241, 0.12))'
                    : 'transparent',
                }}
              >
                {/* Timeline Node Dot */}
                <span
                  className={`absolute -left-[3px] top-4 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'bg-cyan-400 border-white shadow-[0_0_12px_#06b6d4] scale-125'
                      : isActive
                      ? 'bg-indigo-500 border-indigo-200'
                      : 'bg-zinc-800 border-zinc-600 group-hover:border-zinc-400'
                  }`}
                />

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold tracking-wide ${
                      isSelected ? 'text-cyan-300 font-bold' : 'text-zinc-200'
                    }`}
                  >
                    {sp.name}
                  </span>
                  {isActive && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#10b981',
                      }}
                    >
                      Hiện tại
                    </span>
                  )}
                </div>

                {(sp.startDate || sp.endDate) && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400">
                    <Calendar className="w-3 h-3 text-zinc-500" />
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

      {/* Bottom Color Legend (Khớp thiết kế hình ảnh mẫu) */}
      <div
        className="rounded-xl p-3 mt-4 border text-[11px]"
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-center gap-1.5 mb-2 font-semibold text-zinc-300 text-[10px] uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Chú Thích Trục Tác Động</span>
        </div>

        <div className="space-y-1.5 text-zinc-400 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span>D1: Sản lượng (SP, Tasks, Thô)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
            <span>D2: Tin cậy & Đúng hạn (Rework)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
            <span>D3: Phối hợp & Review (@mention)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_6px_#ec4899]" />
            <span>D4: Đánh giá đồng cấp (≥ 3 lượt)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span>Rào cản / Khả dụng (Impediment)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
