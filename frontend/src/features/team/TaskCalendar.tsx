import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Database,
} from 'lucide-react';
import { ProjectTimelineModal } from './ProjectTimelineModal';
import { TaskDetailModal, parseChecklistFromDescription } from './TaskDetailModal';
import { TaskItem } from './AllTasksSection';
import { showToast } from '../../components/ui/Toast';
import { boardApi } from '../../api/board.api';
import { teamApi } from '../../api/team.api';
import { toYmd, fromYmd, startOfDay } from './TimelinePicker';
import { getMemberAvatarGradient, getMemberInitials } from '../../utils/format';

export interface CalendarPill {
  id: string;
  cardId?: number;
  dayIndex: number; // 0..7
  dateLabel: string;
  title: string;
  lane: number; // 0, 1, 2
  isFocus?: boolean;
}

interface DbCalendarCard {
  id: number;
  title: string;
  description?: string;
  dueDate?: string;
  columnId: number;
  columnName: string;
  assigneeName?: string;
  assigneeId?: number;
  storyPoints?: number;
  difficultyLevel?: number;
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

function mapColumnProgress(colName: string, description?: string): number {
  const { items } = parseChecklistFromDescription(description);
  if (items.length > 0) {
    return Math.round((items.filter((x) => x.completed).length / items.length) * 100);
  }
  const lower = colName.toLowerCase();
  if (lower.includes('done') || lower.includes('complete') || lower.includes('hoàn thành')) return 100;
  if (lower.includes('review') || lower.includes('đánh giá')) return 75;
  if (lower.includes('progress') || lower.includes('đang')) return 40;
  return 0;
}

export const TaskCalendar: React.FC<{
  onSelectTask?: (title: string) => void;
  teamId?: number;
  projectName?: string;
}> = ({ onSelectTask, teamId, projectName = 'EduConnect' }) => {
  // Khoảng thời gian dự án: lấy từ DB (teams.start_date / end_date). Dự án cũ chưa có lịch sẽ tự căn theo hạn chót thẻ.
  const [projectStart, setProjectStart] = useState<Date>(() => startOfDay(new Date()));
  const [projectEnd, setProjectEnd] = useState<Date>(() => {
    const s = startOfDay(new Date());
    return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6 * 7 - 1);
  });
  const hasCustomTimelineRef = useRef<boolean>(false);

  // Thời gian thực: cập nhật mỗi 30 giây để highlight luôn đúng ngày hôm nay (kể cả qua nửa đêm)
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Trạng thái đồng bộ Database
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [dbCards, setDbCards] = useState<DbCalendarCard[]>([]);

  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Tải lịch dự án từ Database theo teamId (teams.start_date / end_date)
  useEffect(() => {
    hasCustomTimelineRef.current = false;
    setDbCards([]);
    setIsDbConnected(false);
    if (!teamId) return;
    let cancelled = false;
    teamApi
      .getTeamById(teamId)
      .then((res) => {
        if (cancelled) return;
        const team = res.data;
        if (team?.startDate && team?.endDate) {
          setProjectStart(fromYmd(team.startDate));
          setProjectEnd(fromYmd(team.endDate));
          hasCustomTimelineRef.current = true;
        }
      })
      .catch(() => {
        // Giữ khoảng thời gian mặc định nếu không tải được
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  // ── KẾT NỐI DB: Lấy dữ liệu Cards đầy đủ từ Database qua boardApi ──
  const fetchBoardCards = useCallback(async () => {
    if (!teamId) return;
    try {
      const res = await boardApi.getBoardsByTeam(teamId);
      if (res.data && res.data.length > 0) {
        const boardRes = await boardApi.getBoardById(res.data[0].id);
        const board = boardRes.data;

        if (board.columns) {
          const cardsList: DbCalendarCard[] = [];
          board.columns.forEach((col) => {
            if (col.cards) {
              col.cards.forEach((card) => {
                cardsList.push({
                  id: card.id,
                  title: card.title,
                  description: card.description,
                  dueDate: card.dueDate,
                  columnId: col.id,
                  columnName: col.name,
                  assigneeName: card.assigneeName,
                  assigneeId: card.assigneeId,
                  storyPoints: card.storyPoints,
                  difficultyLevel: card.difficultyLevel,
                });
              });
            }
          });
          setDbCards(cardsList);
          setIsDbConnected(true);

          // Tự động căn chỉnh khung tuần mặc định theo ngày due_date thực tế trong DB nếu người dùng chưa tự cấu hình
          if (!hasCustomTimelineRef.current) {
            const datedTimes = cardsList
              .map((c) => (c.dueDate ? new Date(c.dueDate).getTime() : NaN))
              .filter((t) => !isNaN(t))
              .sort((a, b) => a - b);

            if (datedTimes.length > 0) {
              const latest = startOfDay(new Date(datedTimes[datedTimes.length - 1]));
              const earliest = startOfDay(new Date(datedTimes[0]));
              const today = startOfDay(new Date());
              const startCandidate = earliest.getTime() < today.getTime() ? earliest : today;
              const minEnd = new Date(startCandidate.getFullYear(), startCandidate.getMonth(), startCandidate.getDate() + 6 * 7 - 1);
              setProjectStart(startCandidate);
              setProjectEnd(latest.getTime() > minEnd.getTime() ? latest : minEnd);
            }
          }
        }
      }
    } catch (err) {
      console.warn('TaskCalendar DB fetch fallback:', err);
    }
  }, [teamId]);

  useEffect(() => {
    fetchBoardCards();
  }, [fetchBoardCards]);

  // Tự động đồng bộ lại lịch khi Kanban / AllTasksSection cập nhật thẻ
  useEffect(() => {
    const handleBoardUpdated = () => {
      fetchBoardCards();
    };
    window.addEventListener('fairshare:board-updated', handleBoardUpdated);
    return () => window.removeEventListener('fairshare:board-updated', handleBoardUpdated);
  }, [fetchBoardCards]);

  // Modal chọn khoảng thời gian
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  // Chỉ số tuần hiện tại (0 là Tuần 1, 1 là Tuần 2,...)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Vị trí chuột hover (0..7) cho Vertical Time Scrubber; null = bám theo ngày hôm nay
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

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

  // Mỗi khi lịch dự án thay đổi (tải từ DB / lưu mới), nhảy tới tuần chứa ngày hôm nay
  useEffect(() => {
    const diff = Math.floor((startOfDay(new Date()).getTime() - startOfDay(projectStart).getTime()) / (24 * 3600 * 1000));
    const idx = Math.floor(diff / 7);
    setCurrentWeekIndex(Math.min(Math.max(0, idx), totalWeeks - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectStart, projectEnd]);

  // Đảm bảo currentWeekIndex không vượt quá totalWeeks
  useEffect(() => {
    if (currentWeekIndex >= totalWeeks) {
      setCurrentWeekIndex(Math.max(0, totalWeeks - 1));
    }
  }, [totalWeeks, currentWeekIndex]);

  // Tính 8 ngày của tuần đang chọn (Ngày 0..7)
  const todayKey = toYmd(now);
  const weekDays = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const base = startOfDay(projectStart);
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + currentWeekIndex * 7 + i);
      const dayOfWeek = d.getDay(); // 0: CN
      const isOffDay = dayOfWeek === 0;
      const label = `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`;

      // Highlight đúng ngày hôm nay (thời gian thực)
      const isToday = toYmd(d) === todayKey;

      return {
        date: d,
        label,
        isOffDay,
        isToday,
        dayIndex: i,
      };
    });
  }, [currentWeekIndex, todayKey, projectStart]);

  const todayIdx = weekDays.findIndex((w) => w.isToday);
  const indicatorIdx = hoveredDayIdx ?? (todayIdx >= 0 ? todayIdx : null);

  // ── ĐỒNG BỘ THẺ TASK VÀ NHÃN NGÀY VỚI THỜI GIAN THỰC TẾ TRÊN BẢNG ──
  const currentWeekPills = useMemo<CalendarPill[]>(() => {
    const matchedPills: CalendarPill[] = [];
    const dayLanes: Record<number, number[]> = {};

    // Chỉ hiển thị task THẬT từ Database (hạn chót = due_date của thẻ)
    const sorted = [...dbCards]
      .filter((c) => Boolean(c.dueDate))
      .sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime());

    sorted.forEach((card) => {
      const cardDate = new Date(card.dueDate as string);
      const dayIdx = weekDays.findIndex((w) => isSameDate(w.date, cardDate));
      if (dayIdx < 0) return;
      // Pill rộng ~1.35 cột nên tránh trùng lane với pill của ngày liền trước
      const taken = new Set<number>([...(dayLanes[dayIdx] || []), ...(dayLanes[dayIdx - 1] || [])]);
      let lane = 0;
      while (taken.has(lane)) lane++;
      dayLanes[dayIdx] = [...(dayLanes[dayIdx] || []), lane];
      matchedPills.push({
        id: `db-card-${card.id}`,
        cardId: card.id,
        dayIndex: dayIdx,
        dateLabel: weekDays[dayIdx].label,
        title: card.title,
        lane,
        isFocus: weekDays[dayIdx].isToday,
      });
    });

    return matchedPills;
  }, [dbCards, weekDays]);

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

  // Lưu khoảng thời gian vào Storage
  const handleSaveTimeline = async (start: Date, end: Date) => {
    if (end.getTime() < start.getTime()) {
      showToast.error('Ngày kết thúc phải sau ngày bắt đầu', 'Timeline');
      throw new Error('invalid range');
    }

    // Lưu vào Database (teams.start_date / end_date)
    if (teamId) {
      try {
        await teamApi.updateTeam(teamId, { startDate: toYmd(start), endDate: toYmd(end) });
      } catch (err) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Không thể lưu lịch vào cơ sở dữ liệu';
        showToast.error(msg, 'Timeline');
        throw err;
      }
    }

    hasCustomTimelineRef.current = true;
    setProjectStart(start);
    setProjectEnd(end);

    const startLabel = `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]}`;
    const endLabel = `${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]}`;
    showToast.success(
      `Đã thiết lập lịch dự án: ${startLabel} - ${endLabel} (${Math.ceil(
        Math.abs(end.getTime() - start.getTime()) / (1000 * 3600 * 24 * 7)
      )} tuần) và đồng bộ lịch!`,
      'Timeline Updated'
    );
  };

  const handlePillClick = (pill: CalendarPill) => {
    onSelectTask?.(pill.title);

    const matchedCard = pill.cardId ? dbCards.find((c) => c.id === pill.cardId) : undefined;
    if (matchedCard) {
      setSelectedTask({
        id: String(matchedCard.id),
        projectTag: `${projectName} · ${matchedCard.columnName}`,
        title: matchedCard.title,
        description: matchedCard.description,
        dueDate: pill.dateLabel,
        status: String(matchedCard.columnId),
        progress: mapColumnProgress(matchedCard.columnName, matchedCard.description),
        storyPoints: matchedCard.storyPoints,
        difficultyLevel: matchedCard.difficultyLevel,
        assigneeId: matchedCard.assigneeId,
        commentsCount: 0,
        linksCount: 0,
        assignees: matchedCard.assigneeName
          ? [
              {
                name: matchedCard.assigneeName,
                avatarText: getMemberInitials(matchedCard.assigneeName),
                bg: getMemberAvatarGradient(matchedCard.assigneeName),
              },
            ]
          : [],
      });
    } else {
      setSelectedTask({
        id: pill.id,
        projectTag: `${projectName} Dashboard`,
        title: pill.title,
        dueDate: pill.dateLabel,
        status: 'in_progress',
        progress: pill.isFocus ? 50 : 25,
        commentsCount: 0,
        linksCount: 0,
        assignees: [],
      });
    }
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
              minHeight: `${Math.max(155, 48 + (Math.max(-1, ...currentWeekPills.map((p) => p.lane)) + 1) * 36 + 16)}px`,
              transform: isDragging ? `translateX(${dragOffset * 0.3}px)` : 'none',
              transition: isDragging ? 'none' : 'transform 0.25s ease-out',
            }}
            onMouseLeave={() => setHoveredDayIdx(null)}
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
            {indicatorIdx !== null && (
              <div
                className="calendar-time-indicator"
                style={{
                  left: `calc(${indicatorIdx * (100 / weekDays.length)}% + ${
                    100 / weekDays.length / 2
                  }%)`,
                }}
              >
                <div className="calendar-time-marker" />
                <div className="calendar-time-line" />
              </div>
            )}

            {isDbConnected && currentWeekPills.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 70,
                  textAlign: 'center',
                  fontSize: 12.5,
                  color: 'var(--fg3, #94a3b8)',
                  pointerEvents: 'none',
                }}
              >
                Chưa có task nào đến hạn trong tuần này
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
        teamId={teamId}
        onClose={() => setIsDetailOpen(false)}
        onTaskUpdated={() => {
          fetchBoardCards();
        }}
      />
    </>
  );
};
