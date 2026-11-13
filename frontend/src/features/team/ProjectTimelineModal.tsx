import React, { useState } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';

interface ProjectTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  onSave: (start: Date, end: Date) => void;
}

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

export const ProjectTimelineModal: React.FC<ProjectTimelineModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  onSave,
}) => {
  // Current view month/year
  const [viewDate, setViewDate] = useState<Date>(
    new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  );

  // Temporary selection
  const [tempStart, setTempStart] = useState<Date>(new Date(startDate));
  const [tempEnd, setTempEnd] = useState<Date>(new Date(endDate));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  if (!isOpen) return null;

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isBetween = (target: Date, start: Date, end: Date) => {
    const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return t > s && t < e;
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    // If both are already chosen or neither, reset to single start date
    if (tempStart && tempEnd) {
      setTempStart(date);
      setTempEnd(date);
    } else if (tempStart && !tempEnd) {
      if (date < tempStart) {
        setTempEnd(tempStart);
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
    }
  };

  // Generate 42 calendar grid days (6 weeks x 7 days)
  const generateMonthDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sunday
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      dayNumber: number;
    }[] = [];

    // Preceding days from prev month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: daysInPrevMonth - i,
      });
    }

    // Days in current month
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dayNumber: i,
      });
    }

    // Trailing days from next month
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: i,
      });
    }

    return days;
  };

  const daysGrid = generateMonthDays();

  // Calculate statistics
  const diffTime = Math.abs(tempEnd.getTime() - tempStart.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const diffWeeks = Math.ceil(diffDays / 7);

  const formatDateDisplay = (d: Date) =>
    `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}, ${d.getFullYear()}`;

  const handleApply = () => {
    onSave(tempStart, tempEnd);
    onClose();
  };

  // Quick preset handlers
  const setPreset = (start: Date, end: Date) => {
    setTempStart(start);
    setTempEnd(end);
    setViewDate(new Date(start.getFullYear(), start.getMonth(), 1));
  };

  return (
    <div className="timeline-modal-backdrop" onClick={onClose}>
      <div
        className="timeline-modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="timeline-modal-header">
          <div className="timeline-modal-title-wrap">
            <span className="timeline-modal-icon">
              <CalendarIcon size={18} />
            </span>
            <div>
              <h3 className="timeline-modal-title">Khoảng thời gian dự án</h3>
              <p className="timeline-modal-sub">
                Chọn ngày bắt đầu và kết thúc để tạo lịch trình các tuần
              </p>
            </div>
          </div>

          <button
            type="button"
            className="timeline-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected Range Display Bar (Image 1 style) */}
        <div className="timeline-range-bar">
          <div className="range-chip-group">
            <div className="range-chip">
              <span className="range-chip-label">Bắt đầu:</span>
              <span className="range-chip-value">{formatDateDisplay(tempStart)}</span>
            </div>
            <span className="range-chip-arrow">➔</span>
            <div className="range-chip">
              <span className="range-chip-label">Kết thúc:</span>
              <span className="range-chip-value">{formatDateDisplay(tempEnd)}</span>
            </div>
          </div>
          <div className="range-duration-pill">
            <Sparkles size={13} />
            <span>
              {diffWeeks} tuần ({diffDays} ngày)
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="timeline-presets">
          <button
            type="button"
            className="timeline-preset-btn"
            onClick={() =>
              setPreset(new Date(2027, 1, 10), new Date(2027, 5, 30))
            }
          >
            10 Feb - 30 Jun (Cả kỳ 2027)
          </button>
          <button
            type="button"
            className="timeline-preset-btn"
            onClick={() =>
              setPreset(new Date(2027, 1, 10), new Date(2027, 2, 10))
            }
          >
            10 Feb - 10 Mar (Sprint 1-2)
          </button>
          <button
            type="button"
            className="timeline-preset-btn"
            onClick={() =>
              setPreset(new Date(2027, 1, 10), new Date(2027, 4, 10))
            }
          >
            3 Tháng (10 Feb - 10 May)
          </button>
        </div>

        {/* Calendar Nav (Month Year switch - image 1 style) */}
        <div className="timeline-cal-nav">
          <button
            type="button"
            className="timeline-nav-btn"
            onClick={handlePrevMonth}
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
            onClick={handleNextMonth}
            aria-label="Tháng sau"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Weekday Labels (Sun, Mon, Tue...) */}
        <div className="timeline-weekdays-row">
          {WEEKDAYS.map((w) => (
            <div key={w} className="timeline-weekday-col">
              {w}
            </div>
          ))}
        </div>

        {/* 42-day Month Grid */}
        <div className="timeline-days-grid">
          {daysGrid.map(({ date, isCurrentMonth, dayNumber }, idx) => {
            const isStart = isSameDay(date, tempStart);
            const isEnd = isSameDay(date, tempEnd);
            const inRange = isBetween(date, tempStart, tempEnd);
            const isSingle = isStart && isEnd;

            // Hover preview range if only start is selected
            const inHoverRange =
              hoverDate &&
              tempStart &&
              !tempEnd &&
              isBetween(date, tempStart, hoverDate);

            return (
              <button
                key={idx}
                type="button"
                className={`timeline-day-cell ${!isCurrentMonth ? 'out-month' : ''} ${
                  isStart ? 'cell-start' : ''
                } ${isEnd ? 'cell-end' : ''} ${inRange || inHoverRange ? 'cell-in-range' : ''} ${
                  isSingle ? 'cell-single' : ''
                }`}
                onClick={() => handleDateClick(date)}
                onMouseEnter={() => setHoverDate(date)}
                onMouseLeave={() => setHoverDate(null)}
              >
                <span className="day-number-text">{dayNumber}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Actions Footer */}
        <div className="timeline-modal-footer">
          <button
            type="button"
            className="timeline-settime-btn"
            onClick={() =>
              setPreset(new Date(2027, 1, 10), new Date(2027, 5, 30))
            }
          >
            <Clock size={15} />
            <span>Mặc định (10 Feb - 30 Jun)</span>
          </button>

          <button
            type="button"
            className="timeline-save-btn"
            onClick={handleApply}
          >
            <Check size={16} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
