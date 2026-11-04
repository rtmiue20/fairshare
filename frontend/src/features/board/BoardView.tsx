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
  Loader2
} from 'lucide-react';
import { boardApi } from '../../api/board.api';
import { teamApi } from '../../api/team.api';
import type { Board, BoardColumn, Card } from '../../types/board';
import type { Team } from '../../types/team';

// Mock default board for demo fallback
const DEFAULT_BOARD: Board = {
  id: 1,
  teamId: 1,
  name: 'FairShare Sprint 3 Board',
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
        },
        {
          id: 104,
          boardId: 1,
          columnId: 2,
          title: 'Cơ chế ẩn danh Peer Review 360 độ',
          description: 'Ngưỡng tối thiểu 3 đánh giá chống suy luận',
          storyPoints: 4,
          position: 1,
          assigneeName: 'Triệu Nguyễn Huỳnh Khang',
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
          title: 'Kiểm thử Auth & Team Controller',
          description: 'Chạy bộ test suite M5 QA',
          storyPoints: 2,
          position: 0,
          assigneeName: 'Khiếu Hoàng Nam Anh',
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

  // New Card Modal State
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number>(1);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardStoryPoints, setNewCardStoryPoints] = useState<number>(1);
  const [newCardAssigneeId, setNewCardAssigneeId] = useState<number | undefined>();

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
    } catch {
      setBoard(DEFAULT_BOARD);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    try {
      await boardApi.createCard(selectedColumnId, {
        title: newCardTitle.trim(),
        description: newCardDesc.trim() || undefined,
        storyPoints: newCardStoryPoints,
        assigneeId: newCardAssigneeId,
      });

      showToast('Đã tạo thẻ mới & ghi nhận ActivityEvent thành công!');
      setShowAddCard(false);
      setNewCardTitle('');
      setNewCardDesc('');
      setNewCardStoryPoints(1);
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
        position: 99,
        assigneeName: team?.members?.find((m) => m.user.id === newCardAssigneeId)?.user.fullName || 'Thành viên',
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

  return (
    <div className="space-y-6 pt-2">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-emerald-500/30 text-emerald-300 text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Sparkles size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <Link to="/teams" className="hover:text-zinc-300 transition-colors">
              Danh sách nhóm
            </Link>
            <ChevronRight size={12} className="text-zinc-600" />
            <Link to={`/teams/${teamId}`} className="hover:text-zinc-300 transition-colors">
              {team?.name || 'Chi tiết nhóm'}
            </Link>
            <ChevronRight size={12} className="text-zinc-600" />
            <span className="text-zinc-300">Task Board (Sprint 3)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Kanban size={26} className="text-indigo-400" />
            <span>{board.name}</span>
            {loading && <Loader2 size={16} className="animate-spin text-zinc-400" />}
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              Module Board Nội bộ
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
            {board.description} • Mọi thao tác tạo và di chuyển thẻ đều tự động sinh bản ghi <code className="text-emerald-400 font-mono">ActivityEvent</code> để đối soát công bằng.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowAddColumn(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Plus size={13} />
            <span>+ Cột mới</span>
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

      {/* Kanban Board Columns Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {board.columns.map((column, colIdx) => (
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
                column.cards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3.5 rounded-lg bg-[#181920] border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-2.5 shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-medium text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                        {card.title}
                      </h4>
                      {card.storyPoints !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                          {card.storyPoints} SP
                        </span>
                      )}
                    </div>

                    {card.description && (
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {card.description}
                      </p>
                    )}

                    {/* Card Meta & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-zinc-500" />
                        <span className="truncate max-w-[110px]">{card.assigneeName || 'Chưa gán'}</span>
                      </div>

                      {/* Move Buttons */}
                      <div className="flex items-center gap-1">
                        {colIdx > 0 && (
                          <button
                            onClick={() => handleMoveCard(card, board.columns[colIdx - 1].id)}
                            title={`Chuyển sang ${board.columns[colIdx - 1].name}`}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <ArrowLeft size={12} />
                          </button>
                        )}
                        {colIdx < board.columns.length - 1 && (
                          <button
                            onClick={() => handleMoveCard(card, board.columns[colIdx + 1].id)}
                            title={`Chuyển sang ${board.columns[colIdx + 1].name}`}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
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
                    {board.columns.map((col) => (
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
                    max="13"
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
