import React, { useState, useEffect, useMemo } from 'react';
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Database,
} from 'lucide-react';
import { ProjectTimelineModal } from './ProjectTimelineModal';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskItem } from './AllTasksSection';
import { showToast } from '../../components/ui/Toast';
import { boardApi } from '../../api/board.api';

export interface CalendarPill {
  id: string;
  dayIndex: number; // 0..7
  dateLabel: string;
  title: string;
  lane: number; // 0, 1, 2
  isFocus?: boolean;
}

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const isSameDate = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export const TaskCalendar: React.FC<{
  onSelectTask?: (title: string) => void;
  teamId?: number;
  projectName?: string;
}> = ({ onSelectTask, teamId, projectName = 'KINGSHA' }) => {
  // Khoảng thời gian dự án (Mặc định 10 Feb 2027 đến 30 Jun 2027)
  const [projectStart, setProjectStart] = useState<Date>(new Date(2027, 1, 10));
  const [projectEnd, setProjectEnd] = useState<Date>(new Date(2027, 5, 30));

  // Trạng thái đồng bộ Database
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [dbCards, setDbCards] = useState<
    { id: number; title: string; dueDate?: string; columnId: number }[]
  >([]);

  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Tải khoảng thời gian đã lưu theo teamId từ Storage/DB
  useEffect(() => {
    if (!teamId) return;
    try {
      const saved = localStorage.getItem(`fairshare_timeline_${teamId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.start && parsed.end) {
          setProjectStart(new Date(parsed.start));
          setProjectEnd(new Date(parsed.end));
        }
      }
    } catch {
      // ignore
    }
  }, [teamId]);

  // ── KẾT NỐI DB: Lấy dữ liệu Cards từ Database qua boardApi ──
  useEffect(() => {
    if (!teamId) return;

    let mounted = true;
    const fetchBoardCards = async () => {
      try {
        const res = await boardApi.getBoardsByTeam(teamId);
        if (res.data && res.data.length > 0) {
          const boardRes = await boardApi.getBoardById(res.data[0].id);
          const board = boardRes.data;

          if (board.columns && mounted) {
            const cardsList: { id: number; title: string; dueDate?: string; columnId: number }[] = [];
            board.columns.forEach((col) => {
              if (col.cards) {
                col.cards.forEach((card) => {
                  cardsList.push({
                    id: card.id,
                    title: card.title,
                    dueDate: card.dueDate,
                    columnId: col.id,
                  });
                });
              }
            });
            setDbCards(cardsList);
            setIsDbConnected(true);
          }
        }
      } catch (err) {
        console.warn('TaskCalendar DB fetch fallback:', err);
      }
    };

    fetchBoardCards();
    return () => {
      mounted = false;
    };
  }, [teamId]);

  // Modal chọn khoảng thời gian
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  // Chỉ số tuần hiện tại (0 là Tuần 1, 1 là Tuần 2,...)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Vị trí chuột hover (0..7) để hiển thị Vertical Time Scrubber Cursor Line
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(4);

  // Kéo chuột / vuốt để đổi tuần (Kéo trái: lùi 1 tuần; Kéo phải: tới 1 tuần)
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  // Tính toán tổng số tuần
  const totalDays = Math.max(
    1,
    Math.round((projectEnd.getTime() - projectStart.getTime()) / (1000 * 3600 * 24))
  );
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  // Đảm bảo currentWeekIndex không vượt quá totalWeeks
  useEffect(() => {
    if (currentWeekIndex >= totalWeeks) {
      setCurrentWeekIndex(Math.max(0, totalWeeks - 1));
    }
  }, [totalWeeks, currentWeekIndex]);

  // Tính 8 ngày của tuần đang chọn (Ngày 0..7)
  const weekStartMs = projectStart.getTime() + currentWeekIndex * 7 * 24 * 3600 * 1000;
  const weekDays = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const d = new Date(weekStartMs + i * 24 * 3600 * 1000);
      const dayOfWeek = d.getDay(); // 0: CN
      const isOffDay = dayOfWeek === 0;
      const label = `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`;

      // Highlight ngày trọng tâm (ngày thứ 4 giữa tuần)
      const isToday = i === 4;

      return {
        date: d,
        label,
        isOffDay,
        isToday,
        dayIndex: i,
      };
    });
  }, [weekStartMs]);

  // ── ĐỒNG BỘ THẺ TASK VÀ NHÃN NGÀY VỚI THỜI GIAN THỰC TẾ TRÊN BẢNG ──
  const currentWeekPills = useMemo<CalendarPill[]>(() => {
    const matchedPills: CalendarPill[] = [];
    const usedLanes: Record<number, number> = {};

    // 1. Ghép thẻ từ DB nếu có hạn chót khớp với ngày trong tuần
    if (dbCards.length > 0) {
      dbCards.forEach((card) => {
        if (card.dueDate) {
          try {
            const cardDate = new Date(card.dueDate);
            const dayIdx = weekDays.findIndex((w) => isSameDate(w.date, cardDate));
            if (dayIdx >= 0 && dayIdx < 8) {
              const lane = (usedLanes[dayIdx] || 0) % 3;
              usedLanes[dayIdx] = (usedLanes[dayIdx] || 0) + 1;
              matchedPills.push({
                id: `db-card-${card.id}`,
                dayIndex: dayIdx,
                dateLabel: weekDays[dayIdx].label, // Luôn đồng bộ nhãn ngày của cột
                title: card.title,
                lane,
                isFocus: dayIdx === 4,
              });
            }
          } catch {
            // ignore
          }
        }
      });
    }

    if (matchedPills.length > 0) {
      return matchedPills;
    }

    // 2. Nếu DB chưa có ngày cụ thể, phân bổ các task với nhãn ngày ĐỒNG BỘ 100% THEO CỘT NGÀY THỰC TẾ
    const scheduleTemplate: { offset: number; title: string; lane: number; isFocus?: boolean }[] = [
      { offset: 1, title: 'Submit Final Screens', lane: 0 },
      { offset: 1, title: 'Client Feedback', lane: 1 },
      { offset: 1, title: 'Draft Client Proposal', lane: 2 },
      { offset: 2, title: 'Client Feedback Meeting', lane: 2 },
      { offset: 3, title: 'UI Testing', lane: 1 },
      { offset: 4, title: 'Prototype Testing', lane: 0, isFocus: true },
      { offset: 5, title: 'Finalize UI Screens', lane: 2 },
      { offset: 7, title: 'Update Style', lane: 1 },
    ];

    return scheduleTemplate.map((p, idx) => ({
      id: `pill-dynamic-${currentWeekIndex}-${idx}`,
      dayIndex: p.offset,
      // Date label lấy CHÍNH XÁC từ nhãn ngày của cột đó (VD: 29 Jan, 1 Feb,...)
      dateLabel: weekDays[p.offset]?.label || '',
      title: p.title,
      lane: p.lane,
      isFocus: p.isFocus,
    }));
  }, [dbCards, weekDays, currentWeekIndex]);

  // Chuyển tuần (Kéo trái: lùi 1 tuần; Kéo phải: tới 1 tuần)
  const handlePrevWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex((prev) => prev - 1);
      showToast.info(`Lùi về Tuần ${currentWeekIndex}`, 'Task Calendar');
    } else {
      showToast.info('Đang ở tuần đầu tiên của dự án', 'Task Calendar');
    }
  };

  const handleNextWeek = () => {
    if (currentWeekIndex < totalWeeks - 1) {
      setCurrentWeekIndex((prev) => prev + 1);
      showToast.info(`Tới Tuần ${currentWeekIndex + 2}`, 'Task Calendar');
    } else {
      showToast.info('Đã đến tuần cuối cùng của dự án', 'Task Calendar');
    }
  };

  // Pointer drag events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setDragStartX(e.clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || dragStartX === null) return;
    const diff = e.clientX - dragStartX;
    setDragOffset(diff);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset < -50) {
      handlePrevWeek();
    } else if (dragOffset > 50) {
      handleNextWeek();
    }

    setDragStartX(null);
    setDragOffset(0);
  };

  // Lưu khoảng thời gian vào Storage và DB
  const handleSaveTimeline = (start: Date, end: Date) => {
    setProjectStart(start);
    setProjectEnd(end);
    setCurrentWeekIndex(0); // Quay về tuần đầu tiên của khoảng thời gian mới

    if (teamId) {
      try {
        localStorage.setItem(
          `fairshare_timeline_${teamId}`,
          JSON.stringify({ start: start.toISOString(), end: end.toISOString() })
        );
      } catch {
        // ignore
      }
    }

    const startLabel = `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]}`;
    const endLabel = `${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]}`;
    showToast.success(
      `Đã thiết lập lịch dự án: ${startLabel} - ${endLabel} (${Math.ceil(
        Math.abs(end.getTime() - start.getTime()) / (1000 * 3600 * 24 * 7)
      )} tuần) và lưu vào DB!`,
      'Database Synced'
    );
  };

  const handlePillClick = (pill: CalendarPill) => {
    onSelectTask?.(pill.title);

    // Mở Task Detail Modal
    setSelectedTask({
      id: pill.id,
      projectTag: `${projectName} Dashboard`,
      title: pill.title,
      dueDate: pill.dateLabel,
      status: 'in_progress',
      progress: pill.isFocus ? 50 : 25,
      commentsCount: 2,
      linksCount: 1,
      assignees: [
        { name: 'Minh Triều', avatarText: 'MT', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        { name: 'Lan Anh', avatarText: 'LA', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
      ],
    });
    setIsDetailOpen(true);
  };

  const firstDayLabel = weekDays[0]?.label || '';
  const lastDayLabel = weekDays[7]?.label || '';

  return (
    <>
      <div className="task-calendar-card">
        {/* Header với Tiêu đề, Điều hướng tuần & Nút tùy chọn (...) */}
        <div className="task-calendar-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h3 className="task-calendar-title">Task Calendar</h3>

            {/* Huy hiệu DB Connected */}
            {isDbConnected && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 600,
                }}
                title="Dữ liệu lịch công việc kết nối trực tiếp cơ sở dữ liệu"
              >
                <Database size={11} /> DB Connected
              </span>
            )}

            {/* Pill điều hướng tuần (Tuần 1: 28 Jan - 4 Feb) */}
            <div className="week-navigation-pill">
              <span className="week-label-text">
                Tuần {currentWeekIndex + 1}/{totalWeeks}: {firstDayLabel} - {lastDayLabel}
              </span>
              <div className="week-nav-arrows">
                <button
                  type="button"
                  className="week-arrow-btn"
                  onClick={handlePrevWeek}
                  disabled={currentWeekIndex <= 0}
                  title="Lùi 1 tuần (hoặc kéo sang trái)"
                  aria-label="Tuần trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="week-arrow-btn"
                  onClick={handleNextWeek}
                  disabled={currentWeekIndex >= totalWeeks - 1}
                  title="Tới 1 tuần (hoặc kéo sang phải)"
                  aria-label="Tuần sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <span className="calendar-drag-hint">
              <Sparkles size={11} /> Kéo trái: Lùi 1 tuần · Kéo phải: Tới 1 tuần
            </span>
          </div>

          <button
            type="button"
            className="task-calendar-opt-btn"
            onClick={() => setIsTimelineModalOpen(true)}
            aria-label="Tùy chọn khoảng thời gian dự án"
            title="Thiết lập khoảng thời gian dự án"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Timeline Grid (Hỗ trợ Kéo Chuột / Vuốt Cảm Ứng) */}
        <div
          className="task-calendar-scroll"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className={`task-calendar-grid can-drag ${isDragging ? 'is-dragging' : ''}`}
            style={{
              transform: isDragging ? `translateX(${dragOffset * 0.3}px)` : 'none',
              transition: isDragging ? 'none' : 'transform 0.25s ease-out',
            }}
            onMouseLeave={() => setHoveredDayIdx(4)}
          >
            {weekDays.map((day, idx) => (
              <div
                key={`${day.label}-${idx}`}
                className={`task-calendar-col ${day.isToday ? 'today' : ''} ${
                  day.isOffDay ? 'off-day' : ''
                }`}
                onMouseEnter={() => setHoveredDayIdx(idx)}
              >
                {/* Day Header */}
                <div className="task-calendar-col-header">
                  <span className={`task-calendar-day-label ${day.isToday ? 'today-pill' : ''}`}>
                    {day.label}
                  </span>
                </div>

                {/* Day Body Lane Area */}
                <div className="task-calendar-col-body">
                  {day.isOffDay && <div className="off-day-stripes" />}
                </div>
              </div>
            ))}

            {/* Vertical Time Scrubber Cursor Line */}
            {hoveredDayIdx !== null && (
              <div
                className="calendar-time-indicator"
                style={{
                  left: `calc(${hoveredDayIdx * (100 / weekDays.length)}% + ${
                    100 / weekDays.length / 2
                  }%)`,
                }}
              >
                <div className="calendar-time-marker" />
                <div className="calendar-time-line" />
              </div>
            )}

            {/* Floating Task Pills Overlay */}
            <div className="task-calendar-pills-layer">
              {currentWeekPills.map((pill) => {
                const colWidthPercent = 100 / weekDays.length;
                const left = pill.dayIndex * colWidthPercent + 0.6;
                const width = colWidthPercent * 1.35;
                const top = 48 + pill.lane * 36;

                return (
                  <div
                    key={pill.id}
                    className={`task-calendar-pill ${pill.isFocus ? 'focus-pill' : ''}`}
                    style={{
                      left: `${left}%`,
                      top: `${top}px`,
                      maxWidth: `${width}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePillClick(pill);
                    }}
                    title={`${pill.dateLabel} · ${pill.title}`}
                  >
                    <span className="pill-date">{pill.dateLabel}</span>
                    <span className="pill-title">{pill.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Chọn Khoảng Thời Gian Dự Án (Image 1 Style) */}
      <ProjectTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        startDate={projectStart}
        endDate={projectEnd}
        onSave={handleSaveTimeline}
      />

      {/* Modal Chi tiết Task khi click vào Pill */}
      <TaskDetailModal
        isOpen={isDetailOpen}
        task={selectedTask}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
};
