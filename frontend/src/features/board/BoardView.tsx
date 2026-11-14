import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation, Link } from 'react-router-dom';
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
  Edit3,
  GripVertical,
  CheckSquare,
  Award,
  Lock,
  Eye,
  EyeOff,
  Send,
  Paperclip,
  Trash2,
  ExternalLink,
  UploadCloud
} from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import { boardApi } from '../../api/board.api';
import { teamApi } from '../../api/team.api';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';
import type { Board, BoardColumn, Card, CardActivity, CardAttachment } from '../../types/board';
import type { Team } from '../../types/team';

// Helper format date time for card preview
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

// Helper format activity time with relative and full time tracking
function formatActivityTime(isoString?: string): { relative: string; full: string } {
  if (!isoString) return { relative: 'Gần đây', full: '' };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { relative: isoString, full: isoString };
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const pad = (n: number) => String(n).padStart(2, '0');
    const full = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

    let relative = '';
    if (diffSec < 60) {
      relative = 'vừa xong';
    } else if (diffMin < 60) {
      relative = `${diffMin} phút trước`;
    } else if (diffHour < 24) {
      relative = `${diffHour} giờ trước`;
    } else if (diffDay === 1) {
      relative = `Hôm qua lúc ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else if (diffDay < 7) {
      relative = `${diffDay} ngày trước`;
    } else {
      relative = `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())} thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
    }

    return { relative, full };
  } catch {
    return { relative: isoString, full: isoString };
  }
}

function getAvatarBgColor(name?: string): string {
  if (!name) return 'bg-zinc-700 text-zinc-200';
  const colors = [
    'bg-emerald-600 text-white',
    'bg-indigo-600 text-white',
    'bg-blue-600 text-white',
    'bg-purple-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-teal-600 text-white',
    'bg-cyan-600 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name?: string): string {
  if (!name) return 'FS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
          description: 'Mở rộng mẫu khảo sát đồ án',
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
          description: 'Tuân thủ mẫu báo cáo đồ án',
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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const pathMatch = location.pathname.match(/\/teams\/(\d+)/);
  const routeTeamId = Number(id) || (pathMatch ? Number(pathMatch[1]) : 0);
  const queryTeamId = Number(searchParams.get('teamId'));
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const teamId = routeTeamId > 0 ? routeTeamId : (queryTeamId > 0 ? queryTeamId : (activeTeamId || (teams[0]?.id ?? 1)));

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const [board, setBoard] = useState<Board>(DEFAULT_BOARD);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Phân quyền vai trò: Leader vs Thành viên
  const { user: currentUser } = useAuthStore();
  const [demoRoleOverride, setDemoRoleOverride] = useState<'AUTO' | 'LEADER' | 'MEMBER'>('AUTO');

  const detectedIsLeader =
    !currentUser ||
    currentUser?.id === 1 ||
    currentUser?.email?.startsWith('trieu') ||
    team?.currentRole === 'LEADER' ||
    Boolean(
      team?.members?.find((m) => {
        const uId = m.user?.id ?? (m as unknown as { userId?: number }).userId ?? m.id;
        return (uId === currentUser?.id || m.id === currentUser?.id) && m.role === 'LEADER';
      })
    );

  const isLeader =
    demoRoleOverride === 'AUTO'
      ? detectedIsLeader
      : demoRoleOverride === 'LEADER';

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
  const [editDifficultyLevel, setEditDifficultyLevel] = useState<number>(2);
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [checklists, setChecklists] = useState<Array<{ id: number; title: string; completed: boolean }>>([
    { id: 1, title: 'Thiết kế & cài đặt mã nguồn', completed: false },
    { id: 2, title: 'Viết unit test & kiểm thử tích hợp', completed: false },
  ]);
  const [activities, setActivities] = useState<CardActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(false);
  const [showOnlyComments, setShowOnlyComments] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [showAddUrlInput, setShowAddUrlInput] = useState<boolean>(false);
  const [attachmentUrlInput, setAttachmentUrlInput] = useState('');
  const [attachmentNameInput, setAttachmentNameInput] = useState('');

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
        const rawTeam = teamRes.data;
        const normalizedMembers = (rawTeam.members || []).map((m: unknown) => {
          const mem = m as {
            id: number;
            userId?: number;
            fullName?: string;
            email?: string;
            role?: 'LEADER' | 'MEMBER';
            hasConsented?: boolean;
            joinedAt?: string;
            user?: { id: number; fullName: string; email: string };
          };
          const uId = mem.user?.id ?? mem.userId ?? mem.id;
          const uName = mem.user?.fullName ?? mem.fullName ?? mem.email ?? `Thành viên #${uId}`;
          const uEmail = mem.user?.email ?? mem.email ?? '';
          return {
            ...mem,
            id: mem.id,
            userId: uId,
            fullName: uName,
            email: uEmail,
            role: mem.role || 'MEMBER',
            hasConsented: Boolean(mem.hasConsented),
            joinedAt: mem.joinedAt || '',
            user: mem.user || {
              id: uId,
              fullName: uName,
              email: uEmail,
            },
          };
        });
        setTeam({
          ...rawTeam,
          members: normalizedMembers,
        });
      }

      const boardRes = await boardApi.getBoardsByTeam(teamId);
      if (boardRes?.data && boardRes.data.length > 0) {
        const currentB = boardRes.data[0];
        setBoard(currentB);
        if (currentB.columns && currentB.columns.length > 0) {
          setSelectedColumnId((prevId) => {
            const exists = currentB.columns.some((c) => c.id === prevId);
            return exists ? prevId : currentB.columns[0].id;
          });
        }
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
    setEditDifficultyLevel(card.difficultyLevel || 2);
    setEditDueDate(card.dueDate ? card.dueDate.slice(0, 16) : '');
    setEditError(null);
    setCommentText('');
    setShowOnlyComments(false);
    setShowAddUrlInput(false);
    setAttachmentUrlInput('');
    setAttachmentNameInput('');

    // Load attachments from server
    boardApi.getCardAttachments(card.id)
      .then((res) => {
        if (res.data) setAttachments(res.data);
      })
      .catch(() => setAttachments([]));

    // Load activities from server for Trello-style history
    setLoadingActivities(true);
    boardApi.getCardActivities(card.id)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setActivities(res.data);
        } else {
          setActivities([
            {
              id: -1,
              cardId: card.id,
              userName: card.assigneeName || 'Thành viên',
              eventType: 'CARD_CREATED',
              displayMessage: 'đã tạo thẻ này trong danh sách To Do',
              occurredAt: card.createdAt || new Date().toISOString(),
            },
          ]);
        }
      })
      .catch(() => {
        setActivities([
          {
            id: -1,
            cardId: card.id,
            userName: card.assigneeName || 'Thành viên',
            eventType: 'CARD_CREATED',
            displayMessage: 'đã tạo thẻ này trong danh sách To Do',
            occurredAt: card.createdAt || new Date().toISOString(),
          },
        ]);
      })
      .finally(() => {
        setLoadingActivities(false);
      });
  };

  const handleToggleChecklist = async (item: { id: number; title: string; completed: boolean }) => {
    const updated = !item.completed;
    setChecklists((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, completed: updated } : c))
    );

    if (updated && editingCard) {
      const optimisticChecklistActivity: CardActivity = {
        id: Date.now(),
        cardId: editingCard.id,
        userId: currentUser?.id,
        userName: currentUser?.fullName || 'Tôi',
        eventType: 'CHECKLIST_ITEM_DONE',
        displayMessage: `đã hoàn thành mục "${item.title}"`,
        occurredAt: new Date().toISOString(),
      };
      setActivities((prev) => [optimisticChecklistActivity, ...prev]);

      try {
        await boardApi.completeChecklistItem(editingCard.id, item.title);
        showToast(`Đã hoàn thành: "${item.title}" & ghi nhận điểm Tầng 1!`);
        const res = await boardApi.getCardActivities(editingCard.id);
        if (res.data && res.data.length > 0) {
          setActivities(res.data);
        }
      } catch {
        showToast(`Đã ghi nhận hoàn thành mục (Chế độ xem)`);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !editingCard) return;

    const textToSend = commentText.trim();
    const currentUserName = currentUser?.fullName || 'Tôi';
    const nowIso = new Date().toISOString();

    const optimisticActivity: CardActivity = {
      id: Date.now(),
      cardId: editingCard.id,
      userId: currentUser?.id,
      userName: currentUserName,
      userEmail: currentUser?.email,
      eventType: 'COMMENT_ADDED',
      displayMessage: 'đã bình luận:',
      commentText: textToSend,
      occurredAt: nowIso,
    };

    setActivities((prev) => [optimisticActivity, ...prev]);
    setCommentText('');

    try {
      await boardApi.addComment(editingCard.id, textToSend, true);
      showToast('Đã gửi bình luận & ghi nhận ActivityEvent Tầng 1!');
      const res = await boardApi.getCardActivities(editingCard.id);
      if (res.data && res.data.length > 0) {
        setActivities(res.data);
      }
    } catch {
      showToast('Đã gửi bình luận (Chế độ xem)');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCard) return;

    setUploadingFile(true);
    try {
      const uploadRes = await boardApi.uploadFile(file);
      if (uploadRes.data?.url) {
        const attachRes = await boardApi.addCardAttachment(editingCard.id, {
          fileName: uploadRes.data.fileName || file.name,
          fileUrl: uploadRes.data.url,
          fileSize: uploadRes.data.fileSize || file.size,
          contentType: uploadRes.data.contentType || file.type,
        });

        if (attachRes.data) {
          setAttachments((prev) => [attachRes.data, ...prev]);
          showToast('Đã tải ảnh & đính kèm vào thẻ thành công!');
          boardApi.getCardActivities(editingCard.id).then((r) => {
            if (r.data) setActivities(r.data);
          });
        }
      }
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || 'Không thể tải tệp lên máy chủ';
      showToast(`Lỗi: ${errMsg}`);
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddLinkAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentUrlInput.trim() || !editingCard) return;

    try {
      const name = attachmentNameInput.trim() || attachmentUrlInput.trim();
      const attachRes = await boardApi.addCardAttachment(editingCard.id, {
        fileName: name,
        fileUrl: attachmentUrlInput.trim(),
      });

      if (attachRes.data) {
        setAttachments((prev) => [attachRes.data, ...prev]);
        showToast('Đã thêm link đính kèm vào thẻ!');
        setAttachmentUrlInput('');
        setAttachmentNameInput('');
        setShowAddUrlInput(false);
        boardApi.getCardActivities(editingCard.id).then((r) => {
          if (r.data) setActivities(r.data);
        });
      }
    } catch {
      showToast('Không thể thêm link đính kèm');
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!editingCard) return;
    try {
      await boardApi.deleteCardAttachment(editingCard.id, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      showToast('Đã xoá tệp đính kèm');
      boardApi.getCardActivities(editingCard.id).then((r) => {
        if (r.data) setActivities(r.data);
      });
    } catch {
      showToast('Không thể xoá tệp đính kèm');
    }
  };

  // Submit Card Details Update (Assignee, Story Points, Due Date, Difficulty)
  const handleSaveCardDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    // Client validation: Story points
    const spNumber = Number(editStoryPoints);
    if (isNaN(spNumber) || spNumber <= 0 || !Number.isInteger(spNumber)) {
      setEditError('Story point phải là số nguyên dương lớn hơn 0 (ví dụ: 1, 2, 3, 5...)');
      return;
    }

    // Client validation: Due date
    if (editDueDate) {
      const parsedDate = new Date(editDueDate);
      if (isNaN(parsedDate.getTime())) {
        setEditError('Hạn chót không đúng định dạng ngày giờ hợp lệ');
        return;
      }
    }

    try {
      setIsUpdatingCard(true);
      setEditError(null);

      // Call API updates
      const promises: Promise<unknown>[] = [];

      if (editAssigneeId !== undefined && editAssigneeId !== editingCard.assigneeId) {
        promises.push(boardApi.updateAssignee(editingCard.id, editAssigneeId));
      }

      if (spNumber !== editingCard.storyPoints) {
        promises.push(boardApi.updateStoryPoints(editingCard.id, spNumber));
      }

      const formattedDate = editDueDate ? (editDueDate.length === 16 ? `${editDueDate}:00` : editDueDate) : '';
      if (formattedDate && formattedDate !== editingCard.dueDate) {
        promises.push(boardApi.updateDueDate(editingCard.id, formattedDate));
      }

      if (editDifficultyLevel !== editingCard.difficultyLevel) {
        promises.push(boardApi.updateCard(editingCard.id, { difficultyLevel: editDifficultyLevel }));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      // Cập nhật ngay lập tức dữ liệu trên bảng Kanban (Optimistic state update)
      const selectedMember = team?.members?.find((m) => {
        const uId = m.user?.id ?? (m as unknown as { userId?: number }).userId ?? m.id;
        return uId === editAssigneeId;
      });
      const updatedAssigneeName = selectedMember
        ? (selectedMember.user?.fullName || (selectedMember as unknown as { fullName?: string }).fullName || 'Thành viên')
        : undefined;

      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            c.id === editingCard.id
              ? {
                  ...c,
                  assigneeId: editAssigneeId,
                  assigneeName: updatedAssigneeName !== undefined ? updatedAssigneeName : c.assigneeName,
                  storyPoints: spNumber,
                  difficultyLevel: editDifficultyLevel,
                  dueDate: formattedDate || c.dueDate,
                }
              : c
          ),
        })),
      }));

      showToast('Cập nhật chi tiết card thành công!');
      setEditingCard(null);
      loadBoardData();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Không thể cập nhật chi tiết thẻ. Vui lòng kiểm tra lại dữ liệu nhập.';
      setEditError(errorMsg);
    } finally {
      setIsUpdatingCard(false);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    const targetColId =
      sortedColumns.find((c) => c.id === selectedColumnId)?.id ??
      sortedColumns[0]?.id ??
      selectedColumnId;

    try {
      await boardApi.createCard(targetColId, {
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
      const assigned = team?.members?.find((m) => {
        const uId = m.user?.id ?? (m as unknown as { userId?: number }).userId ?? m.id;
        return uId === newCardAssigneeId;
      });
      const assignedName = assigned
        ? (assigned.user?.fullName || (assigned as unknown as { fullName?: string }).fullName || 'Thành viên')
        : 'Thành viên';

      const newCard: Card = {
        id: Date.now(),
        boardId: board.id,
        columnId: targetColId,
        title: newCardTitle,
        description: newCardDesc,
        storyPoints: newCardStoryPoints,
        dueDate: newCardDueDate || undefined,
        position: 99,
        assigneeName: assignedName,
        assigneeId: newCardAssigneeId,
      };

      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === targetColId ? { ...col, cards: [...(col.cards || []), newCard] } : col
        ),
      }));

      showToast('Đã tạo thẻ công việc (Local mode)');
      setShowAddCard(false);
      setNewCardTitle('');
      setNewCardDesc('');
      setNewCardDueDate('');
    }
  };

  // Xử lý kéo thả card giữa các cột (DnD) kèm Optimistic UI và Rollback khi API lỗi
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Kéo ra ngoài vùng hợp lệ
    if (!destination) return;

    // Thả tại chính vị trí cũ trong cùng cột
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColId = Number(source.droppableId);
    const destColId = Number(destination.droppableId);
    const cardId = Number(draggableId);
    const destIndex = destination.index;

    // 1. Lưu lại trạng thái trước khi kéo thả để phục vụ Rollback nếu API lỗi
    const previousBoard = board;

    // 2. Cập nhật giao diện lập tức (Optimistic UI Update)
    const newColumns = board.columns.map((col) => ({
      ...col,
      cards: [...col.cards],
    }));

    const sourceCol = newColumns.find((c) => c.id === sourceColId);
    const destCol = newColumns.find((c) => c.id === destColId);

    if (!sourceCol || !destCol) return;

    // Kiểm tra phân quyền: Thành viên chỉ được kéo thả thẻ được giao cho mình hoặc thẻ chưa gán
    const targetCard = sourceCol.cards[source.index];
    if (!targetCard) return;

    const canMoveThis =
      isLeader ||
      !targetCard.assigneeId ||
      Boolean(currentUser?.id && targetCard.assigneeId === currentUser.id);

    if (!canMoveThis) {
      showToast('Từ chối quyền: Thành viên chỉ được phép di chuyển thẻ được phân công cho mình!');
      return;
    }

    // Lấy card ra khỏi cột nguồn
    const [movedCard] = sourceCol.cards.splice(source.index, 1);
    if (!movedCard) return;

    // Cập nhật columnId & position cho card và chèn vào cột đích
    const updatedCard: Card = {
      ...movedCard,
      columnId: destColId,
      position: destIndex,
    };
    destCol.cards.splice(destIndex, 0, updatedCard);

    // Cập nhật lại chỉ số position cho các thẻ trong 2 cột
    sourceCol.cards.forEach((c, idx) => {
      c.position = idx;
    });
    destCol.cards.forEach((c, idx) => {
      c.position = idx;
    });

    setBoard({
      ...board,
      columns: newColumns,
    });

    // 3. Gọi API cập nhật cột/vị trí khi thả (truyền đầy đủ cột nguồn và cột đích)
    try {
      await boardApi.moveCard(cardId, {
        targetColumnId: destColId,
        position: destIndex,
        fromColumnId: sourceColId,
        fromColumnName: sourceCol.name,
        toColumnName: destCol.name,
      });

      const isDone =
        destCol.name.toLowerCase().includes('done') ||
        destCol.name.toLowerCase().includes('hoàn thành');
      showToast(
        isDone
          ? 'Đã hoàn thành thẻ & ghi nhận điểm đóng góp!'
          : `Đã di chuyển thẻ sang cột "${destCol.name}"`
      );
    } catch {
      // 4. Hoàn tác (rollback) giao diện nếu API lỗi
      setBoard(previousBoard);
      setErrorMessage(
        'Không thể cập nhật vị trí thẻ trên máy chủ. Đã hoàn tác giao diện về trạng thái ban đầu.'
      );
      showToast('Lỗi API: Đã hoàn tác thẻ về vị trí cũ!');
    }
  };

  const handleMoveCard = async (card: Card, targetColumnId: number) => {
    if (card.columnId === targetColumnId) return;

    // Kiểm tra phân quyền di chuyển thẻ
    const canMoveThis =
      isLeader ||
      !card.assigneeId ||
      Boolean(currentUser?.id && card.assigneeId === currentUser.id);

    if (!canMoveThis) {
      showToast('Từ chối quyền: Thành viên chỉ được phép di chuyển thẻ được phân công cho mình!');
      return;
    }

    const previousBoard = board;
    const fromCol = board.columns.find((c) => c.id === card.columnId);
    const targetCol = board.columns.find((c) => c.id === targetColumnId);

    // Optimistic UI Update
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

    try {
      await boardApi.moveCard(card.id, {
        targetColumnId,
        position: 0,
        fromColumnId: card.columnId,
        fromColumnName: fromCol?.name,
        toColumnName: targetCol?.name,
      });

      const isDone =
        targetCol?.name.toLowerCase().includes('done') ||
        targetCol?.name.toLowerCase().includes('hoàn thành');
      showToast(
        isDone
          ? 'Đã hoàn thành thẻ & ghi nhận điểm đóng góp!'
          : `Đã chuyển thẻ sang cột "${targetCol?.name}"`
      );
    } catch {
      // Rollback nếu API lỗi
      setBoard(previousBoard);
      setErrorMessage('Không thể chuyển vị trí thẻ trên máy chủ. Đã hoàn tác giao diện.');
      showToast('Lỗi API: Đã hoàn tác thẻ về vị trí cũ!');
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
      cards: [...(col.cards || [])].sort((a, b) => a.position - b.position),
    }));

  if (initialized && teams.length === 0 && routeTeamId === 0 && queryTeamId === 0) {
    return <NoProjectState />;
  }

  return (
    <div
      className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8"
      style={{ paddingTop: 'calc(var(--top) + 24px)' }}
    >
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

        <div className="flex flex-wrap items-center gap-2.5 z-10">
          {/* Badge phân quyền vai trò */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">Quyền:</span>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold flex items-center gap-1 ${
                isLeader
                  ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
              }`}
            >
              {isLeader ? <Award size={11} className="text-indigo-400" /> : <Lock size={11} className="text-zinc-400" />}
              {isLeader ? 'Leader' : 'Thành viên'}
            </span>
            <button
              type="button"
              onClick={() => setDemoRoleOverride(isLeader ? 'MEMBER' : 'LEADER')}
              className="ml-1 text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
              title="Nhấn để đổi vai trò kiểm thử ẩn/hiện nút và khóa thao tác"
            >
              (Đổi sang {isLeader ? 'Member' : 'Leader'})
            </button>
          </div>

          <button
            onClick={() => loadBoardData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Làm mới bảng"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          {/* Ẩn nút Thêm cột đối với Thành viên thường - Chỉ Leader mới có quyền tạo/quản trị cột */}
          {isLeader && (
            <button
              onClick={() => setShowAddColumn(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              <Plus size={13} />
              <span>Thêm cột</span>
            </button>
          )}

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
          {isLeader ? (
            <button
              onClick={() => setShowAddColumn(true)}
              className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white"
            >
              + Thêm cột đầu tiên
            </button>
          ) : (
            <span className="text-xs text-zinc-500 font-mono">
              (Chỉ Leader mới có quyền khởi tạo các cột trên bảng)
            </span>
          )}
        </div>
      )}

      {/* Kanban Board Columns Container with Drag and Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
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

              {/* Droppable Cards Container */}
              <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 flex-1 overflow-y-auto min-h-[160px] p-1 rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-950/25 ring-1 ring-indigo-500/30' : ''
                      }`}
                  >
                    {column.cards.length === 0 && !snapshot.isDraggingOver ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-zinc-800/80 rounded-lg text-zinc-500 text-xs">
                        <span>Chưa có thẻ nào (Kéo thả thẻ vào đây)</span>
                      </div>
                    ) : (
                      column.cards.map((card, index) => {
                        const dueInfo = formatDueDate(card.dueDate);
                        const isAssignedToCurrent = Boolean(
                          currentUser?.id && card.assigneeId === currentUser.id
                        );
                        const isUnassigned = !card.assigneeId;
                        const canMoveCard = isLeader || isAssignedToCurrent || isUnassigned;

                        return (
                          <Draggable
                            key={card.id}
                            draggableId={String(card.id)}
                            index={index}
                            isDragDisabled={!canMoveCard}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`p-3.5 rounded-lg bg-[#181920] border transition-all space-y-2.5 shadow-sm group select-none ${
                                  !canMoveCard
                                    ? 'cursor-pointer hover:border-zinc-700'
                                    : 'cursor-grab active:cursor-grabbing'
                                } ${
                                  dragSnapshot.isDragging
                                    ? 'border-indigo-500 shadow-xl ring-2 ring-indigo-500/40 bg-[#1c1e28] rotate-1 scale-[1.02]'
                                    : 'border-zinc-800/80 hover:border-zinc-700'
                                }`}
                                onClick={() => handleOpenEditCard(card)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                    {canMoveCard ? (
                                      <GripVertical
                                        size={14}
                                        className="text-zinc-600 group-hover:text-zinc-400 mt-0.5 flex-shrink-0 transition-colors"
                                      />
                                    ) : (
                                      <span
                                        title="Chỉ người được giao việc hoặc Leader mới có thể di chuyển thẻ này"
                                        className="inline-flex mt-0.5 flex-shrink-0"
                                      >
                                        <Lock size={13} className="text-zinc-500" />
                                      </span>
                                    )}
                                    <h4 className="text-xs font-medium text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                                      {card.title}
                                    </h4>
                                  </div>
                                  {card.storyPoints !== undefined && (
                                    <span
                                      title="Story Points"
                                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-indigo-500/20 whitespace-nowrap flex-shrink-0"
                                    >
                                      {card.storyPoints} SP
                                    </span>
                                  )}
                                </div>

                                {card.description && (
                                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed pl-5">
                                    {card.description}
                                  </p>
                                )}

                                {/* Due Date Indicator */}
                                {card.dueDate && (
                                  <div className="pl-5">
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

                                  {/* Move Buttons (Accessible alternative to Drag and Drop) */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOpenEditCard(card)}
                                      title="Chi tiết thẻ"
                                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                                    >
                                      <Edit3 size={12} />
                                    </button>

                                    {canMoveCard ? (
                                      <>
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
                                      </>
                                    ) : (
                                      <span
                                        className="text-[10px] text-zinc-500 font-mono flex items-center gap-0.5 px-1 py-0.5"
                                        title="Bạn chỉ có quyền xem thẻ này"
                                      >
                                        <Lock size={10} /> Chỉ xem
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

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
      </DragDropContext>

      {/* Modal: Card Detail & Quick Edit (2-Column Trello Style with Movement & Activity History) */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-[#121318] border border-zinc-800 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]">
            {/* Top Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#16171e]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Edit3 size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Chi tiết công việc</h3>
                    {(() => {
                      const col = board.columns.find((c) => c.cards.some((cd) => cd.id === editingCard.id));
                      return col ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {col.name}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono">Mã thẻ: #{editingCard.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCard(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* 2-Column Body */}
            <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-800">
              
              {/* LEFT COLUMN: Card Info & Edit Form (md:col-span-7) */}
              <div className="md:col-span-7 flex flex-col p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-70px)]">
                {editError && (
                  <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Thông báo quyền hạn nếu Thành viên xem thẻ của người khác */}
                {!isLeader && editingCard.assigneeId && editingCard.assigneeId !== currentUser?.id && (
                  <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 flex items-center gap-2">
                    <Lock size={14} className="text-blue-400 shrink-0" />
                    <span>
                      Chế độ Thành viên: Bạn chỉ có thể xem thẻ, gửi bình luận và thực hiện việc cần làm. Chỉ Leader hoặc người phụ trách ({editingCard.assigneeName || 'chính chủ'}) mới có quyền chỉnh sửa chi tiết thẻ.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSaveCardDetails} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Tiêu đề công việc</label>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 font-medium">
                      {editingCard.title}
                    </div>
                  </div>

                  {editingCard.description && (
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-medium">Mô tả</label>
                      <p className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 leading-relaxed whitespace-pre-wrap">
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
                        disabled={!isLeader && Boolean(editingCard.assigneeId && editingCard.assigneeId !== currentUser?.id)}
                        onChange={(e) => setEditAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Chưa chỉ định --</option>
                        {team?.members?.map((m) => {
                          const uId = m.user?.id ?? (m as unknown as { userId?: number }).userId ?? m.id;
                          const uName =
                            m.user?.fullName ??
                            (m as unknown as { fullName?: string }).fullName ??
                            (m as unknown as { email?: string }).email ??
                            `Thành viên #${uId}`;
                          return (
                            <option key={uId} value={uId}>
                              {uName} ({m.role})
                            </option>
                          );
                        })}
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
                        disabled={!isLeader && Boolean(editingCard.assigneeId && editingCard.assigneeId !== currentUser?.id)}
                        onChange={(e) => setEditStoryPoints(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Due date input */}
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                        <Calendar size={13} className="text-indigo-400" />
                        <span>Hạn hoàn thành (Due date)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={editDueDate}
                        disabled={!isLeader && Boolean(editingCard.assigneeId && editingCard.assigneeId !== currentUser?.id)}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Difficulty Level select (Tầng 1 feature) */}
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                        <Award size={13} className="text-amber-400" />
                        <span>Độ khó (Tầng 1)</span>
                      </label>
                      <select
                        value={editDifficultyLevel}
                        disabled={!isLeader && Boolean(editingCard.assigneeId && editingCard.assigneeId !== currentUser?.id)}
                        onChange={(e) => setEditDifficultyLevel(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value={1}>1 - Dễ (Easy)</option>
                        <option value={2}>2 - Trung bình (Medium)</option>
                        <option value={3}>3 - Khó (Hard)</option>
                        <option value={4}>4 - Rất khó (Very Hard)</option>
                      </select>
                    </div>
                  </div>

                  {/* Checklist Section */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                      <CheckSquare size={13} className="text-emerald-400" />
                      <span>Việc cần làm (Checklist - Ghi nhận Tầng 1)</span>
                    </label>
                    <div className="space-y-1.5 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                      {checklists.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 cursor-pointer hover:text-zinc-200 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklist(item)}
                            className="rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className={item.completed ? 'line-through text-zinc-500' : 'text-zinc-300'}>
                            {item.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Attachments Section (Tệp đính kèm & Minh chứng - Giống Trello) */}
                  <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                        <Paperclip size={13} className="text-amber-400" />
                        <span>Tệp đính kèm & Minh chứng</span>
                        {attachments.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                            {attachments.length}
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <label className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 cursor-pointer transition-colors flex items-center gap-1">
                          <UploadCloud size={12} />
                          <span>{uploadingFile ? 'Đang tải...' : 'Tải ảnh từ máy'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.zip"
                            disabled={uploadingFile}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAddUrlInput((prev) => !prev)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors flex items-center gap-1"
                        >
                          <Plus size={12} />
                          <span>Thêm link</span>
                        </button>
                      </div>
                    </div>

                    {/* Pop-up / form to add direct link */}
                    {showAddUrlInput && (
                      <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2 animate-in fade-in duration-150">
                        <div className="text-[11px] font-medium text-zinc-300">Đính kèm link (Google Drive, Figma, Docs)</div>
                        <input
                          type="url"
                          value={attachmentUrlInput}
                          onChange={(e) => setAttachmentUrlInput(e.target.value)}
                          placeholder="https://drive.google.com/... hoặc https://figma.com/..."
                          className="w-full px-2.5 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          value={attachmentNameInput}
                          onChange={(e) => setAttachmentNameInput(e.target.value)}
                          placeholder="Tên hiển thị (ví dụ: Tài liệu đặc tả SRS)"
                          className="w-full px-2.5 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowAddUrlInput(false)}
                            className="px-2.5 py-1 text-[11px] rounded text-zinc-400 hover:text-white"
                          >
                            Huỷ
                          </button>
                          <button
                            type="button"
                            onClick={handleAddLinkAttachment}
                            disabled={!attachmentUrlInput.trim()}
                            className="px-3 py-1 text-[11px] rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium"
                          >
                            Thêm
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Attachment List */}
                    {attachments.length === 0 ? (
                      <div className="text-center py-3.5 rounded-lg bg-zinc-900/40 border border-dashed border-zinc-800/80 text-[11px] text-zinc-500">
                        Chưa có tệp đính kèm nào. Hãy tải ảnh chụp màn hình hoặc link minh chứng lên thẻ.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {attachments.map((att) => {
                          const isImg =
                            att.contentType?.startsWith('image/') ||
                            /\.(png|jpe?g|gif|webp|svg)$/i.test(att.fileUrl) ||
                            /\.(png|jpe?g|gif|webp|svg)$/i.test(att.fileName);
                          const fullUrl = att.fileUrl.startsWith('http')
                            ? att.fileUrl
                            : `http://localhost:8080${att.fileUrl}`;

                          return (
                            <div
                              key={att.id}
                              className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                            >
                              {/* Thumbnail preview */}
                              {isImg ? (
                                <a
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-16 h-12 rounded overflow-hidden shrink-0 bg-black/60 border border-zinc-700/60 flex items-center justify-center hover:opacity-90"
                                >
                                  <img
                                    src={fullUrl}
                                    alt={att.fileName}
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              ) : (
                                <div className="w-16 h-12 rounded shrink-0 bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-indigo-400">
                                  <Paperclip size={18} />
                                </div>
                              )}

                              {/* Details */}
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <a
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-medium text-zinc-200 hover:text-indigo-400 hover:underline truncate block"
                                  title={att.fileName}
                                >
                                  {att.fileName}
                                </a>
                                <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                                  <span>{formatActivityTime(att.createdAt).relative}</span>
                                  {att.fileSize && (
                                    <span>· {(att.fileSize / 1024).toFixed(1)} KB</span>
                                  )}
                                  {att.userName && <span>· bởi {att.userName}</span>}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 pr-1">
                                <a
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                                  title="Mở trong tab mới"
                                >
                                  <ExternalLink size={13} />
                                </a>
                                {(isLeader || att.userId === currentUser?.id) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAttachment(att.id)}
                                    className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                                    title="Xoá tệp đính kèm"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Left Column Form Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setEditingCard(null)}
                      className="px-3.5 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
                    >
                      Đóng
                    </button>
                    {(isLeader || !editingCard.assigneeId || editingCard.assigneeId === currentUser?.id) && (
                      <button
                        type="submit"
                        disabled={isUpdatingCard}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors"
                      >
                        {isUpdatingCard ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        <span>Lưu thay đổi</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* RIGHT COLUMN: Nhận xét và hoạt động (Trello-Style Feed & Time Tracking) */}
              <div className="md:col-span-5 bg-[#0e0f14] flex flex-col p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-70px)]">
                {/* Header: Title & Filter toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <Clock size={16} className="text-indigo-400" />
                    <span>Nhận xét và hoạt động</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOnlyComments((prev) => !prev)}
                    className="px-2.5 py-1 text-[11px] rounded-md bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors flex items-center gap-1.5"
                  >
                    {showOnlyComments ? (
                      <>
                        <Eye size={12} className="text-zinc-400" />
                        <span>Hiện chi tiết</span>
                      </>
                    ) : (
                      <>
                        <EyeOff size={12} className="text-zinc-400" />
                        <span>Ẩn chi tiết</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Comment Input Box (Trello Style: Viết bình luận...) */}
                <form onSubmit={handleAddComment} className="space-y-2">
                  <div className="flex gap-2.5 items-start">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${getAvatarBgColor(
                        currentUser?.fullName
                      )}`}
                    >
                      {getInitials(currentUser?.fullName)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <textarea
                        rows={2}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Viết bình luận..."
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!commentText.trim()}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Send size={11} />
                          <span>Gửi</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Activity Feed & Movement History Timeline */}
                <div className="flex-1 space-y-3.5 pt-1">
                  {loadingActivities ? (
                    <div className="flex items-center justify-center py-8 text-zinc-500 gap-2 text-xs">
                      <Loader2 size={15} className="animate-spin text-indigo-400" />
                      <span>Đang tải hoạt động...</span>
                    </div>
                  ) : (
                    (() => {
                      const filtered = showOnlyComments
                        ? activities.filter((a) => a.eventType === 'COMMENT_ADDED')
                        : activities;

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-zinc-800/80 rounded-xl p-4">
                            {showOnlyComments
                              ? 'Chưa có bình luận nào cho thẻ này.'
                              : 'Chưa có hoạt động nào được ghi nhận.'}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3.5">
                          {filtered.map((act, index) => {
                            const timeInfo = formatActivityTime(act.occurredAt);
                            const isComment = act.eventType === 'COMMENT_ADDED';
                            const isCreation = act.eventType === 'CARD_CREATED';
                            const isMove = act.eventType === 'CARD_MOVED';
                            const isCompleted = act.eventType === 'CARD_COMPLETED';

                            return (
                              <div
                                key={act.id && act.id > 0 ? act.id : `act-${index}`}
                                className="flex items-start gap-2.5 text-xs group"
                              >
                                {/* User Avatar Circle */}
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-sm ${getAvatarBgColor(
                                    act.userName
                                  )}`}
                                  title={act.userEmail || act.userName}
                                >
                                  {getInitials(act.userName)}
                                </div>

                                {/* Content Details */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="leading-relaxed text-zinc-300">
                                    <span className="font-semibold text-white mr-1.5">
                                      {act.userName || 'Thành viên'}
                                    </span>
                                    {isMove ? (
                                      <span>
                                        đã di chuyển thẻ này từ danh sách{' '}
                                        <span className="font-medium text-indigo-300">
                                          {act.fromColumn || 'To Do'}
                                        </span>{' '}
                                        tới danh sách{' '}
                                        <span className="font-medium text-indigo-300">
                                          {act.toColumn || 'In Progress'}
                                        </span>
                                      </span>
                                    ) : isCompleted ? (
                                      <span className="text-emerald-300 font-medium">
                                        {act.displayMessage}
                                      </span>
                                    ) : isCreation ? (
                                      <span className="text-zinc-400">
                                        {act.displayMessage}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-300">
                                        {act.displayMessage}
                                      </span>
                                    )}
                                  </div>

                                  {/* Comment Box */}
                                  {isComment && act.commentText && (
                                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 mt-1 whitespace-pre-wrap break-words leading-relaxed shadow-sm">
                                      {act.commentText}
                                    </div>
                                  )}

                                  {/* Time Tracking (Relative Time + Exact Datetime Tooltip) */}
                                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 pt-0.5">
                                    <Clock size={11} className="text-zinc-500 shrink-0" />
                                    <span
                                      className="hover:text-zinc-300 transition-colors cursor-help underline decoration-dotted decoration-zinc-700"
                                      title={`Thời gian chính xác: ${timeInfo.full}`}
                                    >
                                      {timeInfo.relative}
                                    </span>
                                    <span className="text-zinc-600">·</span>
                                    <span className="text-[10px] text-zinc-600 font-mono">
                                      {timeInfo.full}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
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
                  {team?.members?.map((m) => {
                    const uId = m.user?.id ?? (m as unknown as { userId?: number }).userId ?? m.id;
                    const uName =
                      m.user?.fullName ??
                      (m as unknown as { fullName?: string }).fullName ??
                      (m as unknown as { email?: string }).email ??
                      `Thành viên #${uId}`;
                    return (
                      <option key={uId} value={uId}>
                        {uName} ({m.role})
                      </option>
                    );
                  })}
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
