import React, { useMemo } from 'react';
import { SprintTimelineDto } from '../../types/contribution';
import { Calendar, Clock, Layers } from 'lucide-react';

export interface SprintTimelineInput {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  status?: string;
}

export interface FormattedSprintTimelineItem extends SprintTimelineInput {
  shortTitle: string;
  weekLabel: string;
  dateRangeLabel: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseYmdSafe(ymd?: string): Date | null {
  if (!ymd) return null;
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatShortDm(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function extractSprintOrder(name?: string): number {
  if (!name) return Number.MAX_SAFE_INTEGER;
  const m = name.match(/(?:sprint|tuần|week)\s*(\d+)/i);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Sắp xếp Sprints theo thứ tự thời gian thực tế trong CSDL (startDate -> số Sprint -> id)
 * và tính chính xác nhãn Tuần (Week) + khoảng ngày dd/MM–dd/MM.
 */
export function formatSprintsWithWeeks(sprints: SprintTimelineInput[]): FormattedSprintTimelineItem[] {
  if (!Array.isArray(sprints) || sprints.length === 0) return [];

  const sorted = [...sprints].sort((a, b) => {
    const da = parseYmdSafe(a.startDate);
    const db = parseYmdSafe(b.startDate);
    if (da && db && da.getTime() !== db.getTime()) {
      return da.getTime() - db.getTime();
    }
    const na = extractSprintOrder(a.name);
    const nb = extractSprintOrder(b.name);
    if (na !== nb) return na - nb;
    return (a.id || 0) - (b.id || 0);
  });

  const firstStart = parseYmdSafe(sorted[0]?.startDate);
  let fallbackWeekCursor = 1;

  return sorted.map((s) => {
    const shortMatch = s.name?.match(/Sprint\s*\d+/i);
    const shortTitle = shortMatch ? shortMatch[0] : (s.name?.split(/[-:–]/)[0]?.trim() || `Sprint ${s.id}`);

    const sd = parseYmdSafe(s.startDate);
    const ed = parseYmdSafe(s.endDate);

    let weekLabel: string;
    let dateRangeLabel = '';

    if (sd && ed && firstStart) {
      const startOffsetDays = Math.max(0, Math.round((sd.getTime() - firstStart.getTime()) / DAY_MS));
      const startWeek = Math.floor(startOffsetDays / 7) + 1;
      const durationDays = Math.max(1, Math.round((ed.getTime() - sd.getTime()) / DAY_MS) + 1);
      const durationWeeks = Math.max(1, Math.round(durationDays / 7));
      const endWeek = startWeek + durationWeeks - 1;
      weekLabel = startWeek === endWeek ? `Tuần ${startWeek}` : `Tuần ${startWeek}–${endWeek}`;
      dateRangeLabel = `${formatShortDm(sd)}–${formatShortDm(ed)}`;
      fallbackWeekCursor = endWeek + 1;
    } else {
      const startWeek = fallbackWeekCursor;
      const endWeek = startWeek + 1;
      weekLabel = `Tuần ${startWeek}–${endWeek}`;
      fallbackWeekCursor = endWeek + 1;
    }

    return {
      ...s,
      shortTitle,
      weekLabel,
      dateRangeLabel,
    };
  });
}

/**
 * Tính tọa độ trục Sprint bên trái Canvas để hiển thị trọn vẹn tất cả Sprint
 * phía trên bảng Chú thích góc dưới trái, dùng chung cho cả Render và Hit-Test Click.
 */
export function getSprintRailLayout(
  height: number,
  count: number,
  legendCollapsed = false
): { railStartY: number; railSpacing: number } {
  const railStartY = Math.max(76, Math.min(92, height * 0.13));
  if (count <= 1) {
    return { railStartY, railSpacing: 0 };
  }
  const bottomReserved = legendCollapsed ? 105 : 355;
  const maxRailBottom = Math.max(railStartY + 120, height - bottomReserved);
  const available = Math.max(120, maxRailBottom - railStartY);
  const railSpacing = Math.min(68, available / Math.max(1, count - 1));
  return { railStartY, railSpacing };
}

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
  const orderedSprints = useMemo(() => formatSprintsWithWeeks(sprints), [sprints]);

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
              Điều hướng chu kỳ Sprint & Tuần
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

          {orderedSprints.map((sp) => {
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

                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-xs tracking-wide ${
                      isSelected ? 'font-bold text-[var(--accent)]' : 'font-semibold text-[var(--fg)]'
                    }`}
                  >
                    {sp.name}
                  </span>
                  {isActive && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0"
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

                <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[10px]" style={{ color: 'var(--fg3)' }}>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-semibold font-mono">
                    {sp.weekLabel}
                  </span>
                  {(sp.dateRangeLabel || sp.startDate || sp.endDate) && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[var(--fg3)]" />
                      <span>{sp.dateRangeLabel || `${sp.startDate || ''} → ${sp.endDate || ''}`}</span>
                    </span>
                  )}
                </div>
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
          <span>Chú Thích 4 Trục (100%)</span>
        </div>

        <div className="space-y-1.5 text-[10px]" style={{ color: 'var(--fg2)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> D1: Sản lượng</span>
            <strong className="font-mono text-emerald-500">40%</strong>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> D2: Đúng hạn</span>
            <strong className="font-mono text-cyan-500">20%</strong>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> D3: Phối hợp</span>
            <strong className="font-mono text-purple-500">15%</strong>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-pink-400" /> D4: Chấm chéo</span>
            <strong className="font-mono text-pink-500">25%</strong>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Khả dụng (Bù)</span>
            <strong className="font-mono text-amber-500">a_i</strong>
          </div>
        </div>
      </div>
    </aside>
  );
};
