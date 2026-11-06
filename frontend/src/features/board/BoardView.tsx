import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Kanban,
  Plus,
  ArrowRight,
  ArrowLeft,
  User,
  ChevronRight,
  Sparkles,
  Loader2,
  Calendar,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { boardApi } from '../../api/board.api';
import { teamApi } from '../../api/team.api';
import type { Board, BoardColumn, Card } from '../../types/board';
import type { Team } from '../../types/team';

// Helper format date time
function formatDueDate(isoString?: string): { text: string; isOverdue: boolean } {
  if (!isoString) return { text: 'Chưa đặt hạn', isOverdue: false };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { text: isoString, isOverdue: false };
    const isOverdue = d.getTime() < Date.now();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return {
      text: `${hours}:${minutes} ${day}/${month}`,
      isOverdue
    };
  } catch {
    return { text: isoString, isOverdue: false };
  }
}

// Mock default board for demo fallback
const DEFAULT_BOARD: Board = {
  id: 1,
  teamId: 1,
  name: 'FairShare Sprint 4 Board',
  description: 'Bảng theo dõi tiến độ công việc và minh chứng đóng góp nội bộ',
  columns: [
    {
      id: 1,
      boardId: 1,
      name: 'To Do',
      position: 0,
      cards: [
        {
          id: 101,
          boardId: 1,
          columnId: 1,
          title: 'Khảo sát thêm 20 sinh viên về Free-rider',
          description: 'Mở rộng mẫu khảo sát đồ án UEH',
          storyPoints: 2,
          position: 0,
          assigneeName: 'Hà Ngọc Thiện',
          assigneeId: 2,
          dueDate: '2026-11-08T23:30:00',
        },
        {
          id: 102,
          boardId: 1,
          columnId: 1,
          title: 'Thiết kế giao diện xuất báo cáo PDF',
          description: 'Tuân thủ mẫu báo cáo đồ án QLDA UEH',
          storyPoints: 3,
          position: 1,
          assigneeName: 'Nguyễn Văn Minh Triều',
          assigneeId: 1,
          dueDate: '2026-11-09T18:00:00',
        },
      ],
    },
    {
      id: 2,
      boardId: 1,
      name: 'In Progress',
      position: 1,
      cards: [
        {
          id: 103,
          boardId: 1,
          columnId: 2,
          title: 'Cài đặt thuật toán ScoringEngine v1',
          description: 'Tính điểm đóng góp theo Story Points và đúng hạn',
          storyPoints: 5,
          position: 0,
          assigneeName: 'Ngô Trọng Phúc',
          assigneeId: 3,
          dueDate: '2026-11-07T21:00:00',
        },
        {
          id: 104,
          boardId: 1,
          columnId: 2,
          title: 'Chi tiết card: API cập nhật người phụ trách, story point, hạn',
          description: 'Validation story points nguyên dương, assignee thuộc nhóm',
          storyPoints: 3,
          position: 1,
          assigneeName: 'Nguyễn Phúc Vương',
          assigneeId: 4,
          dueDate: '2026-11-06T23:30:00',
        },
      ],
    },
    {
      id: 3,
      boardId: 1,
      name: 'Review',
      position: 2,
      cards: [
        {
          id: 105,
          boardId: 1,
          columnId: 3,
          title: 'Cơ chế ẩn danh Peer Review 360 độ',
          description: 'Ngưỡng tối thiểu 3 đánh giá chống suy luận',
          storyPoints: 4,
          position: 0,
          assigneeName: 'Triệu Nguyễn Huỳnh Khang',
          assigneeId: 5,
          dueDate: '2026-11-07T12:00:00',
        },
      ],
    },
    {
      id: 4,
      boardId: 1,
      name: 'Done',
      position: 3,
      cards: [
        {
          id: 106,
          boardId: 1,
          columnId: 4,
          title: 'Khung xác thực Spring Security & JWT',
          description: 'BaseEntity, GlobalExceptionHandler & JwtAuthenticationFilter',
          storyPoints: 5,
          position: 0,
          assigneeName: 'Nguyễn Phúc Vương',
          assigneeId: 4,
          dueDate: '2026-11-02T23:30:00',
        },
      ],
    },
  ],
};

export const BoardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id) || 1;

  const [board, setBoard] = useState<Board>(DEFAULT_BOARD);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Card Modal State
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number>(1);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardStoryPoints, setNewCardStoryPoints] = useState<number>(1);
  const [newCardAssigneeId, setNewCardAssigneeId] = useState<number | undefined>();
  const [newCardDueDate, setNewCardDueDate] = useState<string>('');

  // Card Detail / Edit Modal State
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editAssigneeId, setEditAssigneeId] = useState<number | undefined>();
  const [editStoryPoints, setEditStoryPoints] = useState<number>(1);
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);

  // New Column Modal State
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadBoardData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const teamRes = await teamApi.getTeamById(teamId);
      if (teamRes?.data) {
        setTeam(teamRes.data);
      }

      const boardRes = await boardApi.getBoardsByTeam(teamId);
      if (boardRes?.data && boardRes.data.length > 0) {
        setBoard(boardRes.data[0]);
      } else {
        try {
          const createRes = await boardApi.createBoard({
            teamId,
            name: `${teamRes?.data?.name || 'FairShare'} Task Board`,
            description: 'Bảng theo dõi tiến độ và hoạt động nhóm',
          });
          if (createRes?.data) {
            setBoard(createRes.data);
          }
        } catch {
          setBoard(DEFAULT_BOARD);
        }
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể tải dữ liệu Kanban từ máy chủ. Đang hiển thị bảng ngoại tuyến.';
      setErrorMessage(errorMsg);
      // Keep default board as fallback so user can still interact in offline/demo mode
      setBoard(DEFAULT_BOARD);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // Open Edit Card Modal
  const handleOpenEditCard = (card: Card) => {
    setEditingCard(card);
    setEditAssigneeId(card.assigneeId);
    setEditStoryPoints(card.storyPoints || 1);
    setEditDueDate(card.dueDate ? card.dueDate.slice(0, 16) : '');
    setEditError(null);
  };

  // Submit Card Details Update (Assignee, Story Points, Due Date)
  const handleSaveCardDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    // Client validation
    if (editStoryPoints <= 0 || !Number.isInteger(Number(editStoryPoints))) {
      setEditError('Story point phải là số nguyên dương (ví dụ: 1, 2, 3, 5...)');
      return;
    }

    try {
      setIsUpdatingCard(true);
      setEditError(null);

      // Call API updates
      const promises: Promise<unknown>[] = [];

      if (editAssigneeId && editAssigneeId !== editingCard.assigneeId) {
        promises.push(boardApi.updateAssignee(editingCard.id, editAssigneeId));
      }

      if (editStoryPoints !== editingCard.storyPoints) {
        promises.push(boardApi.updateStoryPoints(editingCard.id, editStoryPoints));
      }

      if (editDueDate && editDueDate !== editingCard.dueDate) {
        const formattedDate = editDueDate.length === 16 ? `${editDueDate}:00` : editDueDate;
        promises.push(boardApi.updateDueDate(editingCard.id, formattedDate));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      showToast('Cập nhật chi tiết card thành công!');
      setEditingCard(null);
      loadBoardData();
    } catch (err: unknown) {
      // Local fallback update for demo
      const selectedMember = team?.members?.find((m) => m.user.id === editAssigneeId);
      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            c.id === editingCard.id
              ? {
                  ...c,
                  assigneeId: editAssigneeId,
                  assigneeName: selectedMember ? selectedMember.user.fullName : c.assigneeName,
                  storyPoints: editStoryPoints,
                  dueDate: editDueDate || c.dueDate,
                }
              : c
          ),
        })),
      }));

      showToast('Đã lưu chi tiết card (Chế độ xem)');
      setEditingCard(null);
    } finally {
      setIsUpdatingCard(false);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    try {
      await boardApi.createCard(selectedColumnId, {
        title: newCardTitle.trim(),
        description: newCardDesc.trim() || undefined,
        storyPoints: newCardStoryPoints,
        assigneeId: newCardAssigneeId,
        dueDate: newCardDueDate ? (newCardDueDate.length === 16 ? `${newCardDueDate}:00` : newCardDueDate) : undefined,
      });

      showToast('Đã tạo thẻ mới & ghi nhận ActivityEvent thành công!');
      setShowAddCard(false);
      setNewCardTitle('');
      setNewCardDesc('');
      setNewCardStoryPoints(1);
      setNewCardDueDate('');
      loadBoardData();
    } catch {
      // Fallback local update
      const newCard: Card = {
        id: Date.now(),
        boardId: board.id,
        columnId: selectedColumnId,
        title: newCardTitle,
        description: newCardDesc,
        storyPoints: newCardStoryPoints,
        dueDate: newCardDueDate || undefined,
        position: 99,
        assigneeName: team?.members?.find((m) => m.user.id === newCardAssigneeId)?.user.fullName || 'Thành viên',
        assigneeId: newCardAssigneeId,
      };

      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === selectedColumnId ? { ...col, cards: [...col.cards, newCard] } : col
        ),
      }));

      showToast('Đã tạo thẻ công việc (Local mode)');
      setShowAddCard(false);
      setNewCardTitle('');
      setNewCardDesc('');
      setNewCardDueDate('');
    }
  };

  const handleMoveCard = async (card: Card, targetColumnId: number) => {
    if (card.columnId === targetColumnId) return;

    try {
      await boardApi.moveCard(card.id, {
        targetColumnId,
        position: 0,
      });

      const targetCol = board.columns.find((c) => c.id === targetColumnId);
      const isDone = targetCol?.name.toLowerCase().includes('done') || targetCol?.name.toLowerCase().includes('hoàn thành');
      showToast(isDone ? 'Đã hoàn thành thẻ & ghi nhận điểm đóng góp!' : `Đã chuyển thẻ sang cột "${targetCol?.name}"`);

      loadBoardData();
    } catch {
      setBoard((prev) => {
        let movedCard: Card | null = null;
        const newCols = prev.columns.map((col) => {
          const remaining = col.cards.filter((c) => {
            if (c.id === card.id) {
              movedCard = { ...c, columnId: targetColumnId };
              return false;
            }
            return true;
          });
          return { ...col, cards: remaining };
        });

        if (movedCard) {
          return {
            ...prev,
            columns: newCols.map((col) =>
              col.id === targetColumnId ? { ...col, cards: [...col.cards, movedCard!] } : col
            ),
          };
        }
        return prev;
      });

      showToast('Đã chuyển thẻ công việc');
    }
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    try {
      await boardApi.createColumn(board.id, {
        name: newColumnName.trim(),
        position: board.columns.length,
      });
      showToast(`Đã thêm cột "${newColumnName}"`);
      setShowAddColumn(false);
      setNewColumnName('');
      loadBoardData();
    } catch {
      const newCol: BoardColumn = {
        id: Date.now(),
        boardId: board.id,
        name: newColumnName,
        position: board.columns.length,
        cards: [],
      };
      setBoard((prev) => ({ ...prev, columns: [...prev.columns, newCol] }));
      showToast(`Đã thêm cột "${newColumnName}" (Local mode)`);
      setShowAddColumn(false);
      setNewColumnName('');
    }
  };

  // Sort columns and their cards by position
  const sortedColumns = [...board.columns]
    .sort((a, b) => a.position - b.position)
    .map((col) => ({
      ...col,
      cards: [...col.cards].sort((a, b) => a.position - b.position),
    }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-5 duration-200">
          <Sparkles size={14} className="text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link to="/teams" className="hover:text-zinc-300 transition-colors">
          Danh sách nhóm
        </Link>
        <ChevronRight size={13} />
        <Link to={`/teams/${teamId}`} className="hover:text-zinc-300 transition-colors truncate max-w-[200px]">
          {team?.name || 'Chi tiết nhóm'}
        </Link>
        <ChevronRight size={13} />
        <span className="text-zinc-300 font-medium">Bảng Kanban nội bộ</span>
      </div>

      {/* Board Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-[#0f1015] border border-zinc-800/80 shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Kanban size={18} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{board.name}</h1>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            {board.description || 'Bảng công việc nhóm: phân công nhiệm vụ, định lượng Story Points và ghi nhận minh chứng hoàn thành.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <button
            onClick={() => loadBoardData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Làm mới bảng"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setShowAddColumn(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            <Plus size={13} />
            <span>Thêm cột</span>
          </button>

          <button
            onClick={() => {
              if (board.columns.length > 0) setSelectedColumnId(board.columns[0].id);
              setShowAddCard(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-sm"
          >
            <Plus size={13} />
            <span>+ Thêm công việc</span>
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadBoardData()}
              className="px-3 py-1 rounded bg-amber-900/60 hover:bg-amber-900 text-white font-medium transition-colors"
            >
              Thử lại
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-amber-400 hover:text-amber-200 px-1 text-xs"
              title="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center p-8 text-xs text-zinc-400 gap-2">
          <Loader2 size={16} className="animate-spin text-indigo-400" />
          <span>Đang tải dữ liệu bảng Kanban từ API...</span>
        </div>
      )}

      {/* Empty State when no columns */}
      {sortedColumns.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#121318] border border-dashed border-zinc-800 rounded-xl space-y-3">
          <Kanban size={32} className="text-zinc-600" />
          <h3 className="text-sm font-semibold text-zinc-300">Bảng chưa có cột nào</h3>
          <p className="text-xs text-zinc-500 max-w-sm">
            Hãy bấm &quot;Thêm cột&quot; để thiết lập các giai đoạn công việc (ví dụ: To Do, In Progress, Done).
          </p>
          <button
            onClick={() => setShowAddColumn(true)}
            className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white"
          >
            + Thêm cột đầu tiên
          </button>
        </div>
      )}

      {/* Kanban Board Columns Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {sortedColumns.map((column, colIdx) => (
          <div
            key={column.id}
            className="flex flex-col rounded-xl bg-[#121318] border border-zinc-800/80 p-4 space-y-3 min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-200">{column.name}</h3>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400">
                {column.cards.length}
              </span>
            </div>

            {/* Cards List */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {column.cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-zinc-800/80 rounded-lg text-zinc-500 text-xs">
                  <span>Chưa có thẻ nào</span>
                </div>
              ) : (
                column.cards.map((card) => {
                  const dueInfo = formatDueDate(card.dueDate);

                  return (
                    <div
                      key={card.id}
                      className="p-3.5 rounded-lg bg-[#181920] border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-2.5 shadow-sm group cursor-pointer"
                      onClick={() => handleOpenEditCard(card)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-medium text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                          {card.title}
                        </h4>
                        {card.storyPoints !== undefined && (
                          <span
                            title="Story Points"
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-indigo-500/20 whitespace-nowrap"
                          >
                            {card.storyPoints} SP
                          </span>
                        )}
                      </div>

                      {card.description && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                      )}

                      {/* Due Date Indicator */}
                      {card.dueDate && (
                        <div
                          className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded w-fit ${
                            dueInfo.isOverdue
                              ? 'bg-red-950/40 text-red-400 border border-red-800/30'
                              : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/30'
                          }`}
                        >
                          <Clock size={11} className={dueInfo.isOverdue ? 'text-red-400' : 'text-zinc-400'} />
                          <span>{dueInfo.text}</span>
                          {dueInfo.isOverdue && <span className="font-semibold">(Quá hạn)</span>}
                        </div>
                      )}

                      {/* Card Meta & Actions */}
                      <div
                        className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-zinc-500" />
                          <span className="truncate max-w-[100px] text-zinc-300">
                            {card.assigneeName || 'Chưa gán'}
                          </span>
                        </div>

                        {/* Move Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditCard(card)}
                            title="Chỉnh sửa chi tiết card"
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <Edit3 size={12} />
                          </button>

                          {colIdx > 0 && (
                            <button
                              onClick={() => handleMoveCard(card, sortedColumns[colIdx - 1].id)}
                              title={`Chuyển sang ${sortedColumns[colIdx - 1].name}`}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                              <ArrowLeft size={12} />
                            </button>
                          )}
                          {colIdx < sortedColumns.length - 1 && (
                            <button
                              onClick={() => handleMoveCard(card, sortedColumns[colIdx + 1].id)}
                              title={`Chuyển sang ${sortedColumns[colIdx + 1].name}`}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Add Card in Column */}
            <button
              onClick={() => {
                setSelectedColumnId(column.id);
                setShowAddCard(true);
              }}
              className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850 rounded border border-transparent hover:border-zinc-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={12} />
              <span>Thêm thẻ</span>
            </button>
          </div>
        ))}
      </div>

      {/* Modal: Card Detail & Quick Edit (Assignee, Story Points, Due Date) */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121318] border border-zinc-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Chi tiết công việc</h3>
              </div>
              <button
                onClick={() => setEditingCard(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCardDetails} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Tiêu đề công việc</label>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 font-medium">
                  {editingCard.title}
                </div>
              </div>

              {editingCard.description && (
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Mô tả</label>
                  <p className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 leading-relaxed">
                    {editingCard.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Assignee select */}
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <User size={13} className="text-indigo-400" />
                    <span>Người phụ trách (Assignee)</span>
                  </label>
                  <select
                    value={editAssigneeId || ''}
                    onChange={(e) => setEditAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Chưa chỉ định --</option>
                    {team?.members?.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.fullName} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Story Points input */}
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-400" />
                    <span>Story Points (Nguyên dương)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editStoryPoints}
                    onChange={(e) => setEditStoryPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Due date input */}
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-400" />
                  <span>Hạn hoàn thành (Due date)</span>
                </label>
                <input
                  type="datetime-local"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingCard}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors"
                >
                  {isUpdatingCard ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Card */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121318] border border-zinc-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus size={16} className="text-indigo-400" />
                <span>Tạo công việc mới</span>
              </h3>
              <button
                onClick={() => setShowAddCard(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Tiêu đề công việc *</label>
                <input
                  type="text"
                  required
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Ví dụ: Hoàn thành thiết kế ERD v2"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={newCardDesc}
                  onChange={(e) => setNewCardDesc(e.target.value)}
                  placeholder="Ghi chú chi tiết hoặc tiêu chí chấp nhận (DoD)..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Cột bắt đầu</label>
                  <select
                    value={selectedColumnId}
                    onChange={(e) => setSelectedColumnId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    {sortedColumns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Story Points</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newCardStoryPoints}
                    onChange={(e) => setNewCardStoryPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Người phụ trách</label>
                <select
                  value={newCardAssigneeId || ''}
                  onChange={(e) => setNewCardAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Chưa chỉ định --</option>
                  {team?.members?.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.fullName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Hạn hoàn thành (Due date)</label>
                <input
                  type="datetime-local"
                  value={newCardDueDate}
                  onChange={(e) => setNewCardDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddCard(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors"
                >
                  Tạo thẻ & Ghi Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Column */}
      {showAddColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#121318] border border-zinc-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Thêm cột trạng thái</h3>
              <button onClick={() => setShowAddColumn(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateColumn} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Tên cột *</label>
                <input
                  type="text"
                  required
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Ví dụ: Testing, Blocked..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddColumn(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors"
                >
                  Thêm cột
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
