import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_MS = 24 * 3600 * 1000;

/** Chuyển Date (giờ địa phương) → 'YYYY-MM-DD' (không bị lệch múi giờ như toISOString). */
export const toYmd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Chuyển 'YYYY-MM-DD' (hoặc ISO) → Date giờ địa phương 00:00. */
export const fromYmd = (s: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isBetween = (t: Date, s: Date, e: Date) => {
  const x = startOfDay(t).getTime();
  return x > startOfDay(s).getTime() && x < startOfDay(e).getTime();
};

export const formatTimelineDate = (d: Date) =>
  `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}, ${d.getFullYear()}`;

export const countTimelineDays = (start: Date, end: Date) =>
  Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS) + 1;

interface TimelinePickerProps {
  start: Date;
  end: Date;
  onChange: (start: Date, end: Date) => void;
}

/** Bộ chọn khoảng thời gian dự án (dùng chung cho wizard tạo dự án & modal chỉnh lịch). */
export const TimelinePicker: React.FC<TimelinePickerProps> = ({ start, end, onChange }) => {
  const [viewDate, setViewDate] = useState<Date>(new Date(start.getFullYear(), start.getMonth(), 1));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [picking, setPicking] = useState<'start' | 'end'>('start');

  useEffect(() => {
    setViewDate(new Date(start.getFullYear(), start.getMonth(), 1));
  }, [start]);

  const handleDateClick = (date: Date) => {
    const day = startOfDay(date);
    if (picking === 'end' && day.getTime() >= startOfDay(start).getTime()) {
      onChange(start, day);
      setPicking('start');
    } else if (picking === 'end') {
      onChange(day, start);
      setPicking('start');
    } else {
      onChange(day, day);
      setPicking('end');
    }
  };

  const generateMonthDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const days: { date: Date; isCurrentMonth: boolean; dayNumber: number }[] = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false, dayNumber: daysInPrev - i });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true, dayNumber: i });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, dayNumber: i });
    }
    return days;
  };

  const daysGrid = generateMonthDays();
  const diffDays = countTimelineDays(start, end);
  const diffWeeks = Math.ceil(diffDays / 7);
  const today = startOfDay(new Date());

  const setPreset = (s: Date, e: Date) => {
    onChange(s, e);
    setViewDate(new Date(s.getFullYear(), s.getMonth(), 1));
    setPicking('start');
  };

  const presets = [
    { label: '4 tuần (1 tháng)', days: 4 * 7 },
    { label: '8 tuần (2 tháng)', days: 8 * 7 },
    { label: '15 tuần (1 học kỳ)', days: 15 * 7 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="timeline-range-bar">
        <div className="range-chip-group">
          <div className="range-chip">
            <span className="range-chip-label">Bắt đầu:</span>
            <span className="range-chip-value">{formatTimelineDate(start)}</span>
          </div>
          <span className="range-chip-arrow">➔</span>
          <div className="range-chip">
            <span className="range-chip-label">Kết thúc:</span>
            <span className="range-chip-value">{formatTimelineDate(end)}</span>
          </div>
        </div>
        <div className="range-duration-pill">
          <Sparkles size={13} />
          <span>
            {diffWeeks} tuần ({diffDays} ngày)
          </span>
        </div>
      </div>

      <div className="timeline-presets">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className="timeline-preset-btn"
            onClick={() => setPreset(start, addDays(startOfDay(start), p.days - 1))}
            title="Tính từ ngày bắt đầu đang chọn"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="timeline-preset-btn"
          onClick={() => setPreset(today, addDays(today, 6 * 7 - 1))}
        >
          Từ hôm nay (6 tuần)
        </button>
      </div>

      <div className="timeline-cal-nav">
        <button
          type="button"
          className="timeline-nav-btn"
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
          aria-label="Tháng trước"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="timeline-current-month">
          <CalendarIcon size={16} className="timeline-cal-icon-blue" />
          <span>
            {MONTH_NAMES[viewDate.getMonth()]}, {viewDate.getFullYear()}
          </span>
        </div>
        <button
          type="button"
          className="timeline-nav-btn"
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
          aria-label="Tháng sau"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="timeline-weekdays-row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="timeline-weekday-col">
            {w}
          </div>
        ))}
      </div>

      <div className="timeline-days-grid">
        {daysGrid.map(({ date, isCurrentMonth, dayNumber }, idx) => {
          const isStart = isSameDay(date, start);
          const isEnd = isSameDay(date, end);
          const inRange = isBetween(date, start, end);
          const isSingle = isStart && isEnd;
          const inHoverRange =
            picking === 'end' && hoverDate && hoverDate > start && isBetween(date, start, hoverDate);
          const isToday = isSameDay(date, today);

          return (
            <button
              key={idx}
              type="button"
              className={`timeline-day-cell ${!isCurrentMonth ? 'out-month' : ''} ${isStart ? 'cell-start' : ''} ${
                isEnd ? 'cell-end' : ''
              } ${inRange || inHoverRange ? 'cell-in-range' : ''} ${isSingle ? 'cell-single' : ''}`}
              onClick={() => handleDateClick(date)}
              onMouseEnter={() => setHoverDate(date)}
              onMouseLeave={() => setHoverDate(null)}
              title={isToday ? 'Hôm nay' : undefined}
              style={isToday && !isStart && !isEnd ? { boxShadow: 'inset 0 0 0 1.5px #2563eb', borderRadius: 10 } : undefined}
            >
              <span className="day-number-text">{dayNumber}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
