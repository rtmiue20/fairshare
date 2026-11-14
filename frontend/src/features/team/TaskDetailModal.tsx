import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  User as UserIcon,
  Tag,
  FileText,
  Plus,
  Clock,
  Flame,
  CheckCircle2,
  Share2,
  FileSpreadsheet,
  Check,
  Search,
  Send,
  Loader2,
  Edit2,
  Save,
  Paperclip,
  Trash2,
  ExternalLink,
  UploadCloud,
  Eye,
  EyeOff,
} from 'lucide-react';
import { TaskItem } from './AllTasksSection';
import { showToast } from '../../components/ui/Toast';
import { boardApi } from '../../api/board.api';
import { teamApi } from '../../api/team.api';
import { activityApi, ActivityEventDto } from '../../api/activity.api';
import { useAuthStore } from '../../store/authStore';
import { TeamMember } from '../../types/team';
import type { CardActivity, CardAttachment } from '../../types/board';

interface TaskDetailModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  teamId?: number;
  onTaskUpdated?: (updated: TaskItem) => void;
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
    } else if (diffDay < 7) {
      relative = `${diffDay} ngày trước`;
    } else {
      relative = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    }
    return { relative, full };
  } catch {
    return { relative: isoString, full: isoString };
  }
}

const PRIORITY_MAP: Record<number, { label: string; color: string; bg: string }> = {
  4: { label: 'Urgent',  color: '#ef4444', bg: '#fee2e2' },
  3: { label: 'High',    color: '#f97316', bg: '#ffedd5' },
  2: { label: 'Medium',  color: '#eab308', bg: '#fef9c3' },
  1: { label: 'Low',     color: '#22c55e', bg: '#dcfce7' },
};

function getStatusLabel(status: string): string {
  if (status === 'todo') return 'To-do';
  if (status === 'in_progress') return 'On Progress';
  if (status === 'in_review') return 'In Review';
  if (status === 'completed') return 'Completed';
  return status;
}

export interface SubtaskLocal {
  id: string;
  title: string;
  completed: boolean;
}

/** Tách description và checklist JSON được lưu trong description */
export function parseChecklistFromDescription(rawDesc?: string): { cleanDesc: string; items: SubtaskLocal[] } {
  if (!rawDesc) return { cleanDesc: '', items: [] };

  const markerMatch = rawDesc.match(/<!-- FAIRSHARE_CHECKLIST:([\s\S]*?)-->/);
  if (markerMatch && markerMatch[1]) {
    try {
      const items = JSON.parse(markerMatch[1]);
      const cleanDesc = rawDesc.replace(/<!-- FAIRSHARE_CHECKLIST:[\s\S]*?-->/, '').trim();
      return { cleanDesc, items: Array.isArray(items) ? items : [] };
    } catch {
      // parse error, fallback
    }
  }

  // Hỗ trợ cả định dạng Markdown checkbox: - [ ] hoặc - [x]
  const lines = rawDesc.split('\n');
  const items: SubtaskLocal[] = [];
  const cleanLines: string[] = [];
  lines.forEach((line, idx) => {
    const checkMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      items.push({
        id: `md-sub-${idx}`,
        title: checkMatch[2].trim(),
        completed: checkMatch[1].toLowerCase() === 'x',
      });
    } else {
      cleanLines.push(line);
    }
  });

  if (items.length > 0) {
    return { cleanDesc: cleanLines.join('\n').trim(), items };
  }

  return { cleanDesc: rawDesc, items: [] };
}

/** Nối description và checklist JSON để lưu xuống cột description trong DB */
export function serializeDescriptionWithChecklist(cleanDesc: string, items: SubtaskLocal[]): string {
  const base = cleanDesc.trim();
  if (items.length === 0) {
    return base;
  }
  const jsonStr = JSON.stringify(items);
  return base ? `${base}\n\n<!-- FAIRSHARE_CHECKLIST:${jsonStr} -->` : `<!-- FAIRSHARE_CHECKLIST:${jsonStr} -->`;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  teamId,
  onTaskUpdated,
}) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'subtasks' | 'attachments' | 'comments' | 'activities'>('subtasks');
  const [subtasks, setSubtasks] = useState<SubtaskLocal[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [comments, setComments] = useState<{ author: string; text: string; time: string }[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [checkingItem, setCheckingItem] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityEventDto[]>([]);

  // Tệp đính kèm & minh chứng
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showAddUrlInput, setShowAddUrlInput] = useState(false);
  const [attachmentUrlInput, setAttachmentUrlInput] = useState('');
  const [attachmentNameInput, setAttachmentNameInput] = useState('');

  // Lịch sử hoạt động chuẩn Trello & Kéo thả thẻ
  const [cardActivities, setCardActivities] = useState<CardActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showOnlyComments, setShowOnlyComments] = useState(false);

  // Editable fields
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);

  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState('');
  const [savingDueDate, setSavingDueDate] = useState(false);

  // Assignee picker
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [savingAssignee, setSavingAssignee] = useState(false);
  const assigneePickerRef = useRef<HTMLDivElement>(null);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Tải dữ liệu từ DB mỗi khi mở modal
  useEffect(() => {
    if (!isOpen || !task) return;

    setActiveTab('subtasks');
    setComments([]);
    setCommentText('');
    setNewSubtask('');
    setIsEditingDesc(false);
    setIsEditingDueDate(false);
    setDueDateValue('');
    setAssigneePickerOpen(false);
    setShowAddUrlInput(false);
    setAttachmentUrlInput('');
    setAttachmentNameInput('');

    // Tách ban đầu từ task prop
    const parsedInitial = parseChecklistFromDescription(task.description || '');
    setDescValue(parsedInitial.cleanDesc || task.title || '');
    setSubtasks(parsedInitial.items);

    const cardIdNum = Number(task.id);
    const hasRealCardId = !isNaN(cardIdNum) && cardIdNum > 0;

    // 1. Tải card mới nhất từ DB
    if (hasRealCardId) {
      boardApi.getCardById(cardIdNum)
        .then((res) => {
          if (res.data) {
            const card = res.data;
            const parsed = parseChecklistFromDescription(card.description || '');
            setDescValue(parsed.cleanDesc || card.title || '');
            setSubtasks(parsed.items);
          }
        })
        .catch(() => {});

      // Tải tệp đính kèm từ bảng card_attachments trong DB
      boardApi.getCardAttachments(cardIdNum)
        .then((res) => {
          if (res.data) {
            setAttachments(res.data);
            if (onTaskUpdated && task) {
              onTaskUpdated({ ...task, linksCount: res.data.length });
            }
          }
        })
        .catch(() => setAttachments([]));

      // Tải lịch sử hoạt động & kéo thả thẻ chuẩn Trello từ DB
      setLoadingActivities(true);
      boardApi.getCardActivities(cardIdNum)
        .then((res) => {
          if (res.data) setCardActivities(res.data);
        })
        .catch(() => {})
        .finally(() => setLoadingActivities(false));
    }

    // 2. Tải danh sách thành viên nhóm để phân công
    if (teamId) {
      teamApi.getMembers(teamId)
        .then((res) => {
          if (res.data) setMembers(res.data);
        })
        .catch(() => {});
    }

    // 3. Tải hoạt động và bình luận từ bảng activity_events trong DB
    if (teamId && hasRealCardId) {
      activityApi.getByTeam(teamId)
        .then((res) => {
          if (res.data) {
            const allEvents = res.data;
            const cardTitleLower = task.title.toLowerCase();
            const relevantEvents = allEvents.filter((ev) =>
              ev.details && ev.details.toLowerCase().includes(cardTitleLower)
            );

            // Xếp từ mới nhất trước (thời gian giảm dần)
            const sortedEvents = (relevantEvents.length > 0 ? relevantEvents : allEvents.slice(0, 15))
              .slice()
              .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

            setActivities(sortedEvents);

            // Trích xuất bình luận
            const dbComments: { author: string; text: string; time: string }[] = [];
            relevantEvents.forEach((ev) => {
              if (ev.eventType === 'COMMENT_ADDED') {
                const parts = ev.details.split("': ");
                const content = parts.length > 1 ? parts.slice(1).join("': ") : ev.details;
                const d = new Date(ev.occurredAt);
                const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                dbComments.push({
                  author: ev.userId === user?.id ? (user?.fullName || 'Bạn') : `Thành viên #${ev.userId || ''}`,
                  text: content,
                  time: timeStr,
                });
              }
            });

            if (dbComments.length > 0) {
              setComments(dbComments);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, task?.id, teamId, user?.id, user?.fullName, task?.title, task?.description]);

  // Đóng assignee dropdown khi click ra ngoài
  useEffect(() => {
    if (!assigneePickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(e.target as Node)) {
        setAssigneePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [assigneePickerOpen]);

  if (!isOpen || !task) return null;

  const cardIdNum = Number(task.id);
  const hasRealCardId = !isNaN(cardIdNum) && cardIdNum > 0;

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progressPercent = subtasks.length > 0
    ? Math.round((completedCount / subtasks.length) * 100)
    : task.progress;

  const difficultyLevel = task.difficultyLevel || (
    progressPercent >= 75 ? 4 :
    progressPercent >= 50 ? 3 :
    progressPercent >= 25 ? 2 : 1
  );
  const priorityInfo = PRIORITY_MAP[difficultyLevel] ?? PRIORITY_MAP[2];

  // Helper cập nhật checklist trực tiếp xuống DB qua cards.description
  const persistChecklistToDb = async (updatedItems: SubtaskLocal[]) => {
    if (!hasRealCardId) return;
    const fullDesc = serializeDescriptionWithChecklist(descValue, updatedItems);
    try {
      await boardApi.updateCard(cardIdNum, { description: fullDesc });
      if (onTaskUpdated) {
        onTaskUpdated({
          ...task,
          description: fullDesc,
          progress: updatedItems.length > 0
            ? Math.round((updatedItems.filter((x) => x.completed).length / updatedItems.length) * 100)
            : task.progress,
        });
      }
    } catch (err) {
      console.warn('Lỗi khi lưu checklist vào DB:', err);
      showToast.error('Không thể lưu checklist vào DB', 'Lỗi kết nối');
    }
  };

  // 1. Thêm mới Checklist Item & LƯU NGAY XUỐNG DB
  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    const itemTitle = newSubtask.trim();
    const newItem: SubtaskLocal = {
      id: `sub-${Date.now()}`,
      title: itemTitle,
      completed: false,
    };
    const updated = [...subtasks, newItem];
    setSubtasks(updated);
    setNewSubtask('');

    if (hasRealCardId) {
      await persistChecklistToDb(updated);
      showToast.success(`Đã thêm và lưu "${itemTitle}" vào DB!`, 'Checklist Saved');
    }
  };

  // 2. Tích chọn/Bỏ chọn hoàn thành Checklist & LƯU NGAY XUỐNG DB
  const toggleSubtask = async (sub: SubtaskLocal) => {
    const isNowCompleted = !sub.completed;
    setCheckingItem(sub.id);

    const updated = subtasks.map((s) => (s.id === sub.id ? { ...s, completed: isNowCompleted } : s));
    setSubtasks(updated);

    if (hasRealCardId) {
      await persistChecklistToDb(updated);

      if (isNowCompleted) {
        // Ghi nhận sự kiện đóng góp điểm cống hiến Tầng 1 vào activity_events
        boardApi.completeChecklistItem(cardIdNum, sub.title)
          .then(() => {
            showToast.success(`"${sub.title}" đã hoàn thành & lưu DB!`, 'Checklist Synced');
          })
          .catch(() => {});
      } else {
        showToast.info(`Đã mở lại "${sub.title}" và lưu DB!`, 'Checklist Synced');
      }
    }
    setCheckingItem(null);
  };

  // 3. Xóa Checklist Item & LƯU NGAY XUỐNG DB
  const handleDeleteSubtask = async (subId: string) => {
    const updated = subtasks.filter((s) => s.id !== subId);
    setSubtasks(updated);

    if (hasRealCardId) {
      await persistChecklistToDb(updated);
      showToast.info('Đã xóa mục checklist và cập nhật DB', 'DB Synced');
    }
  };

  // Helper tải lại lịch sử và tệp đính kèm mới nhất từ DB
  const refreshCardData = () => {
    if (!hasRealCardId) return;
    boardApi.getCardAttachments(cardIdNum)
      .then((res) => {
        if (res.data) {
          setAttachments(res.data);
          if (onTaskUpdated && task) {
            onTaskUpdated({ ...task, linksCount: res.data.length });
          }
        }
      })
      .catch(() => {});

    setLoadingActivities(true);
    boardApi.getCardActivities(cardIdNum)
      .then((res) => {
        if (res.data) setCardActivities(res.data);
      })
      .catch(() => {})
      .finally(() => setLoadingActivities(false));
  };

  // 4. Gửi bình luận và lưu vào DB
  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    const myName = user?.fullName || user?.email || 'Bạn';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const newComment = { author: myName, text: commentText.trim(), time: timeStr };
    setComments((prev) => [...prev, newComment]);
    const savedText = commentText.trim();
    setCommentText('');

    if (hasRealCardId) {
      try {
        await boardApi.addComment(cardIdNum, savedText, savedText.length > 15);
        showToast.success('Đã lưu bình luận vào Database!', 'DB Synced');
        refreshCardData();
      } catch (e) {
        console.warn('addComment error:', e);
        showToast.error('Không gửi được bình luận vào DB.', 'Lỗi');
        setComments((prev) => prev.filter((c) => c !== newComment));
        setCommentText(savedText);
      }
    }
    setSendingComment(false);
  };

  const handleKeydownComment = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSendComment();
    }
  };

  // 4.1 Tải tệp ảnh/tài liệu từ máy tính lên Server & Lưu vào card_attachments trong DB
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !hasRealCardId) return;

    setUploadingFile(true);
    try {
      const uploadRes = await boardApi.uploadFile(file);
      if (uploadRes.data?.url) {
        const attachRes = await boardApi.addCardAttachment(cardIdNum, {
          fileName: uploadRes.data.fileName || file.name,
          fileUrl: uploadRes.data.url,
          fileSize: uploadRes.data.fileSize || file.size,
          contentType: uploadRes.data.contentType || file.type,
        });

        if (attachRes.data) {
          const updated = [attachRes.data, ...attachments];
          setAttachments(updated);
          showToast.success('Đã tải ảnh minh chứng & lưu vào Database!', 'Đính kèm thành công');
          if (onTaskUpdated && task) {
            onTaskUpdated({ ...task, linksCount: updated.length });
          }
          refreshCardData();
        }
      }
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || 'Không thể tải tệp lên máy chủ';
      showToast.error(`Lỗi tải tệp: ${errMsg}`, 'Lỗi');
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  // 4.2 Thêm đường dẫn liên kết ngoài (Drive, Figma, GitHub, Docs...) & Lưu vào DB
  const handleAddLinkAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentUrlInput.trim() || !hasRealCardId) return;

    try {
      const name = attachmentNameInput.trim() || attachmentUrlInput.trim();
      const attachRes = await boardApi.addCardAttachment(cardIdNum, {
        fileName: name,
        fileUrl: attachmentUrlInput.trim(),
      });

      if (attachRes.data) {
        const updated = [attachRes.data, ...attachments];
        setAttachments(updated);
        showToast.success('Đã lưu liên kết minh chứng vào Database!', 'Đính kèm thành công');
        setAttachmentUrlInput('');
        setAttachmentNameInput('');
        setShowAddUrlInput(false);
        if (onTaskUpdated && task) {
          onTaskUpdated({ ...task, linksCount: updated.length });
        }
        refreshCardData();
      }
    } catch {
      showToast.error('Không thể lưu link đính kèm vào DB', 'Lỗi');
    }
  };

  // 4.3 Xóa tệp đính kèm khỏi DB
  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!hasRealCardId) return;
    try {
      await boardApi.deleteCardAttachment(cardIdNum, attachmentId);
      const updated = attachments.filter((a) => a.id !== attachmentId);
      setAttachments(updated);
      showToast.info('Đã xóa tệp đính kèm khỏi Database', 'DB Synced');
      if (onTaskUpdated && task) {
        onTaskUpdated({ ...task, linksCount: updated.length });
      }
      refreshCardData();
    } catch {
      showToast.error('Không thể xóa tệp đính kèm', 'Lỗi');
    }
  };

  // 5. Lưu mô tả công việc vào DB
  const handleSaveDescription = async () => {
    if (!hasRealCardId) {
      setIsEditingDesc(false);
      return;
    }
    setSavingDesc(true);
    try {
      const fullDesc = serializeDescriptionWithChecklist(descValue, subtasks);
      await boardApi.updateCard(cardIdNum, { description: fullDesc });
      showToast.success('Đã cập nhật mô tả vào Database!', 'DB Synced');
      setIsEditingDesc(false);
      if (onTaskUpdated) {
        onTaskUpdated({ ...task, description: fullDesc });
      }
    } catch (e) {
      console.warn('updateCard description error:', e);
      showToast.error('Không thể cập nhật mô tả vào DB.', 'Lỗi');
    } finally {
      setSavingDesc(false);
    }
  };

  // 6. Lưu hạn chót vào DB
  const handleSaveDueDate = async () => {
    if (!dueDateValue || !hasRealCardId) {
      setIsEditingDueDate(false);
      return;
    }
    setSavingDueDate(true);
    try {
      const isoDate = new Date(dueDateValue).toISOString();
      await boardApi.updateDueDate(cardIdNum, isoDate);
      const d = new Date(isoDate);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const displayStr = `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}, ${d.getFullYear()}`;
      showToast.success(`Đã cập nhật hạn chót "${displayStr}" vào DB!`, 'DB Synced');
      setIsEditingDueDate(false);
      if (onTaskUpdated) {
        onTaskUpdated({ ...task, dueDate: displayStr });
      }
    } catch (e) {
      console.warn('updateDueDate error:', e);
      showToast.error('Không thể cập nhật deadline vào DB.', 'Lỗi');
    } finally {
      setSavingDueDate(false);
    }
  };

  // 7. Lưu người thực hiện vào DB
  const handleSelectAssignee = async (member: TeamMember) => {
    const memberUserId = member.userId ?? member.id;
    if (!memberUserId || !hasRealCardId) {
      setAssigneePickerOpen(false);
      return;
    }
    setSavingAssignee(true);
    try {
      await boardApi.updateAssignee(cardIdNum, memberUserId);
      const memberName = member.fullName || member.email || 'Member';
      showToast.success(`Đã giao việc cho "${memberName}" và lưu vào DB!`, 'DB Synced');
      setAssigneePickerOpen(false);
      if (onTaskUpdated) {
        onTaskUpdated({
          ...task,
          assigneeId: memberUserId,
          assignees: [
            {
              name: memberName,
              avatarText: memberName.slice(0, 2).toUpperCase(),
              bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            },
          ],
        });
      }
    } catch (e) {
      console.warn('updateAssignee error:', e);
      showToast.error('Không thể phân công thành viên vào DB.', 'Lỗi');
    } finally {
      setSavingAssignee(false);
    }
  };

  return (
    <div className="task-modal-backdrop" onClick={onClose}>
      <div className="task-detail-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Top Header bar */}
        <div className="task-detail-top-nav">
          <div className="task-detail-breadcrumbs">
            <span>FairShare</span>
            <span className="crumb-sep">&gt;</span>
            <span>All Task</span>
            <span className="crumb-sep">&gt;</span>
            <strong className="crumb-active">{task.projectTag}</strong>
          </div>

          <div className="task-detail-top-actions">
            <div className="task-detail-search">
              <Search size={14} className="search-icon" />
              <input type="text" placeholder="Search task..." />
            </div>

            <button
              type="button"
              className="task-detail-icon-btn"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                showToast.info('Đã sao chép liên kết task', 'Share');
              }}
              title="Chia sẻ task"
            >
              <Share2 size={16} />
            </button>

            <button
              type="button"
              className="task-detail-close-btn"
              onClick={onClose}
              aria-label="Đóng chi tiết"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="task-detail-content-scroll">
          {/* Main Title */}
          <div className="task-detail-main-head">
            <div className="task-detail-icon-box">
              <FileSpreadsheet size={20} />
            </div>

            <div className="task-detail-title-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 className="task-detail-h1">{task.title}</h1>
                <span
                  className="task-urgent-badge"
                  style={{ background: priorityInfo.bg, color: priorityInfo.color }}
                >
                  {priorityInfo.label}
                </span>
                {hasRealCardId && (
                  <span style={{ fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>
                    Card #{task.id} (DB Synced)
                  </span>
                )}
              </div>

              <div className="task-detail-meta-right">
                <span className="task-meta-time">
                  <Clock size={13} />
                  {task.dueDate ? ` Due: ${task.dueDate}` : ' Chưa có deadline'}
                </span>

                <div className="task-detail-assignees-stack">
                  {task.assignees.map((a, i) => (
                    <div
                      key={a.name}
                      className="task-avatar-circle"
                      style={{ background: a.bg, zIndex: 10 - i }}
                      title={a.name}
                    >
                      {a.avatarText}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="new-member-btn"
                  onClick={() => setActiveTab('attachments')}
                  title="Xem tệp đính kèm và ảnh minh chứng"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Paperclip size={12} />
                  <span>Đính kèm {attachments.length > 0 ? `(${attachments.length})` : ''}</span>
                </button>

                <button
                  type="button"
                  className="new-member-btn"
                  onClick={() => setAssigneePickerOpen((p) => !p)}
                  title="Phân công người thực hiện từ nhóm"
                >
                  + New member
                </button>
              </div>
            </div>
          </div>

          {/* Properties */}
          <div className="task-properties-box">
            {/* Status */}
            <div className="prop-row">
              <div className="prop-label">
                <CheckCircle2 size={16} />
                <span>Status</span>
              </div>
              <div className="prop-value">
                <span className="prop-status-pill">
                  <Clock size={13} className={task.status === 'in_progress' ? 'spin-slow' : ''} />
                  <span>{getStatusLabel(task.status)}</span>
                </span>
              </div>
            </div>

            {/* Due date (editable) */}
            <div className="prop-row">
              <div className="prop-label">
                <Calendar size={16} />
                <span>Due date</span>
              </div>
              <div className="prop-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditingDueDate ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="date"
                      value={dueDateValue}
                      onChange={(e) => setDueDateValue(e.target.value)}
                      className="task-input-pill"
                      style={{ padding: '4px 8px', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      className="btn solid-black"
                      onClick={handleSaveDueDate}
                      disabled={savingDueDate}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      {savingDueDate ? <Loader2 size={12} className="spin-slow" /> : <Save size={12} />}
                      Lưu
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setIsEditingDueDate(false)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="prop-text">
                      {task.dueDate || <em style={{ opacity: 0.5 }}>Chưa thiết lập</em>}
                    </span>
                    <button
                      type="button"
                      className="col-icon-btn"
                      onClick={() => setIsEditingDueDate(true)}
                      title="Sửa ngày hạn chót và lưu DB"
                      style={{ padding: '2px 4px' }}
                    >
                      <Edit2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Assignee (editable from DB) */}
            <div className="prop-row" style={{ position: 'relative' }}>
              <div className="prop-label">
                <UserIcon size={16} />
                <span>Assignee</span>
              </div>
              <div className="prop-value prop-assignees-list" ref={assigneePickerRef}>
                {task.assignees.length > 0 ? (
                  task.assignees.map((a) => (
                    <span
                      key={a.name}
                      className="assignee-tag-chip"
                      style={{
                        background: a.bg.startsWith('linear') ? undefined : a.bg,
                        backgroundImage: a.bg.startsWith('linear') ? a.bg : undefined,
                        color: '#fff',
                      }}
                    >
                      <span>{a.name}</span>
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#a1a1aa', fontSize: '13px' }}>Chưa phân công</span>
                )}
                <button
                  type="button"
                  className="assignee-add-btn"
                  onClick={() => setAssigneePickerOpen((p) => !p)}
                  title="Thay đổi người thực hiện và lưu vào DB"
                >
                  <Plus size={13} />
                </button>

                {/* Member picker dropdown */}
                {assigneePickerOpen && (
                  <div className="member-picker-dropdown" style={{ top: '100%', left: 0, marginTop: '4px' }}>
                    {members.length === 0 ? (
                      <div className="member-picker-empty">Không tìm thấy thành viên</div>
                    ) : (
                      members.map((m) => {
                        const mId = m.userId ?? m.id;
                        const mName = m.fullName || m.email || 'Member';
                        return (
                          <button
                            key={mId}
                            type="button"
                            className="member-picker-item"
                            onClick={() => handleSelectAssignee(m)}
                            disabled={savingAssignee}
                          >
                            <span className="member-picker-avatar" style={{ background: '#3b82f6', color: '#fff' }}>
                              {mName.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="member-picker-name">{mName}</span>
                            <span className="member-picker-role" style={{ color: '#a1a1aa', fontSize: '11px' }}>
                              {m.role}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="prop-row">
              <div className="prop-label">
                <Tag size={16} />
                <span>Tags</span>
              </div>
              <div className="prop-value">
                <span className="prop-tag-pill">{task.projectTag}</span>
              </div>
            </div>

            {/* Priority */}
            <div className="prop-row">
              <div className="prop-label">
                <Flame size={16} />
                <span>Priority</span>
              </div>
              <div className="prop-value">
                <span
                  className="priority-pill-badge"
                  style={{ background: priorityInfo.bg, color: priorityInfo.color }}
                >
                  {priorityInfo.label}
                </span>
              </div>
            </div>

            {/* Attachments (Tệp đính kèm & Minh chứng) */}
            <div className="prop-row">
              <div className="prop-label">
                <Paperclip size={16} />
                <span>Attachments</span>
              </div>
              <div className="prop-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="prop-text">
                  {attachments.length > 0 ? (
                    <span style={{ color: '#818cf8', fontWeight: 600 }}>{attachments.length} tệp minh chứng</span>
                  ) : (
                    <em style={{ opacity: 0.5 }}>Chưa có tệp đính kèm</em>
                  )}
                </span>
                <button
                  type="button"
                  className="col-icon-btn"
                  onClick={() => setActiveTab('attachments')}
                  title="Xem và tải ảnh minh chứng lên DB"
                  style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={12} />
                  <span>Đính kèm</span>
                </button>
              </div>
            </div>

            {/* Description (editable & saves to DB) */}
            <div className="prop-row prop-row--top">
              <div className="prop-label">
                <FileText size={16} />
                <span>Description</span>
              </div>
              <div className="prop-value" style={{ width: '100%' }}>
                {isEditingDesc ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <textarea
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      rows={3}
                      className="task-desc-textarea"
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn solid-black"
                        onClick={handleSaveDescription}
                        disabled={savingDesc}
                        style={{ padding: '5px 14px', fontSize: '12px' }}
                      >
                        {savingDesc ? <Loader2 size={12} className="spin-slow" /> : <Save size={12} />}
                        Lưu vào DB
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setIsEditingDesc(false)}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="prop-description-box"
                    onClick={() => setIsEditingDesc(true)}
                    title="Click để chỉnh sửa mô tả và lưu vào DB"
                    style={{ cursor: 'pointer' }}
                  >
                    {descValue || <em style={{ opacity: 0.5 }}>Chưa có mô tả, click để thêm...</em>}
                    <Edit2 size={12} style={{ marginLeft: '8px', opacity: 0.5 }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="task-detail-sub-tabs">
            <button
              type="button"
              className={`sub-tab-btn ${activeTab === 'subtasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('subtasks')}
            >
              Subtasks
              {subtasks.length > 0 && (
                <span className="tab-count-bubble">{subtasks.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`sub-tab-btn ${activeTab === 'attachments' ? 'active' : ''}`}
              onClick={() => setActiveTab('attachments')}
            >
              Attachments
              {attachments.length > 0 && (
                <span className="tab-count-bubble">{attachments.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`sub-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              Comments
              {comments.length > 0 && (
                <span className="tab-count-bubble">{comments.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`sub-tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
              onClick={() => setActiveTab('activities')}
            >
              Activities
              {(cardActivities.length > 0 ? cardActivities.length : activities.length) > 0 && (
                <span className="tab-count-bubble">
                  {cardActivities.length > 0 ? cardActivities.length : activities.length}
                </span>
              )}
            </button>
          </div>

          {/* Subtasks Tab */}
          {activeTab === 'subtasks' && (
            <div className="subtasks-container">
              <div className="subtasks-head">
                <h3>Checklist ({completedCount}/{subtasks.length})</h3>
                <div className="subtasks-progress">
                  <div className="subtasks-track">
                    <div
                      className="subtasks-fill"
                      style={{ width: `${progressPercent}%`, backgroundColor: '#0d9488' }}
                    />
                  </div>
                  <span className="subtasks-pct">Progress: {progressPercent}%</span>
                </div>
              </div>

              <div className="subtasks-checklist">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className={`subtask-item ${sub.completed ? 'completed' : ''}`}
                    onClick={() => !checkingItem && toggleSubtask(sub)}
                    style={{ cursor: checkingItem === sub.id ? 'wait' : 'pointer' }}
                  >
                    <div className="subtask-drag-handle">⋮⋮</div>
                    <div className={`subtask-checkbox ${sub.completed ? 'checked' : ''}`}>
                      {checkingItem === sub.id ? (
                        <Loader2 size={12} className="spin-slow" />
                      ) : (
                        sub.completed && <Check size={13} strokeWidth={3} />
                      )}
                    </div>
                    <div className="subtask-body">
                      <span className="subtask-title">{sub.title}</span>
                    </div>
                    <button
                      type="button"
                      className="subtask-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubtask(sub.id);
                      }}
                      title="Xóa việc này và cập nhật DB"
                      aria-label="Xóa"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {subtasks.length === 0 && (
                  <div style={{ padding: '16px 0', color: '#a1a1aa', fontSize: '13px' }}>
                    Chưa có mục nào trong checklist. Hãy nhập bên dưới để thêm và lưu vào DB!
                  </div>
                )}
              </div>

              {/* Add subtask inline */}
              <div className="subtask-add-row">
                <input
                  type="text"
                  className="subtask-add-input"
                  placeholder="+ Thêm mục mới (Enter để lưu vào DB)..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); }}
                />
                {newSubtask.trim() && (
                  <button type="button" className="subtask-add-confirm" onClick={handleAddSubtask}>
                    Add
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Attachments Tab (Minh chứng & Tệp đính kèm chuẩn Trello) */}
          {activeTab === 'attachments' && (
            <div className="attachments-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Paperclip size={16} style={{ color: '#6366f1' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                    Tệp đính kèm & Minh chứng ({attachments.length})
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label
                    className="btn sm"
                    style={{
                      cursor: uploadingFile ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'var(--accent, #6366f1)',
                      color: '#fff',
                      border: 'none',
                    }}
                  >
                    {uploadingFile ? (
                      <Loader2 size={13} className="spin-slow" />
                    ) : (
                      <UploadCloud size={13} />
                    )}
                    <span>{uploadingFile ? 'Đang tải lên...' : 'Tải ảnh từ máy'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      disabled={uploadingFile}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowAddUrlInput((p) => !p)}
                    className="btn ghost sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--line, rgba(255,255,255,0.1))',
                    }}
                  >
                    <Plus size={13} />
                    <span>{showAddUrlInput ? 'Đóng form link' : 'Thêm link'}</span>
                  </button>
                </div>
              </div>

              {/* Form thêm link liên kết ngoài */}
              {showAddUrlInput && (
                <form
                  onSubmit={handleAddLinkAttachment}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--line, rgba(255,255,255,0.1))',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg)' }}>
                    Đính kèm liên kết ngoài (Google Docs, Drive, Figma, GitHub...)
                  </span>
                  <input
                    type="url"
                    required
                    placeholder="Dán đường dẫn (URL) https://..."
                    value={attachmentUrlInput}
                    onChange={(e) => setAttachmentUrlInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line, rgba(255,255,255,0.15))',
                      background: 'var(--surface, #1e1f26)',
                      color: 'var(--fg)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Tên hiển thị (Tùy chọn, vd: Kịch bản kiểm thử Sprint 2)"
                    value={attachmentNameInput}
                    onChange={(e) => setAttachmentNameInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line, rgba(255,255,255,0.15))',
                      background: 'var(--surface, #1e1f26)',
                      color: 'var(--fg)',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddUrlInput(false)}
                      className="btn ghost sm"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={!attachmentUrlInput.trim()}
                      className="btn sm"
                      style={{
                        fontSize: '11px',
                        padding: '4px 14px',
                        background: '#6366f1',
                        color: '#fff',
                        border: 'none',
                      }}
                    >
                      Lưu vào DB
                    </button>
                  </div>
                </form>
              )}

              {/* Danh sách tệp đính kèm */}
              {attachments.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    borderRadius: '10px',
                    border: '1px dashed var(--line, rgba(255,255,255,0.15))',
                    color: 'var(--fg3, #a1a1aa)',
                    fontSize: '13px',
                  }}
                >
                  Chưa có tệp đính kèm nào. Hãy bấm <strong>"Tải ảnh từ máy"</strong> hoặc <strong>"Thêm link"</strong> để lưu minh chứng vào DB!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {attachments.map((att) => {
                    const isImg =
                      att.contentType?.startsWith('image/') ||
                      /\.(png|jpe?g|gif|webp|svg)$/i.test(att.fileUrl) ||
                      /\.(png|jpe?g|gif|webp|svg)$/i.test(att.fileName);
                    const fullUrl = att.fileUrl.startsWith('http')
                      ? att.fileUrl
                      : `http://localhost:8080${att.fileUrl}`;
                    const timeInfo = formatActivityTime(att.createdAt);

                    return (
                      <div
                        key={att.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--line, rgba(255, 255, 255, 0.08))',
                        }}
                      >
                        {/* Thumbnail preview */}
                        {isImg ? (
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Click để xem ảnh kích thước gốc"
                            style={{
                              width: '64px',
                              height: '48px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              background: '#000',
                              border: '1px solid rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <img
                              src={fullUrl}
                              alt={att.fileName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </a>
                        ) : (
                          <div
                            style={{
                              width: '64px',
                              height: '48px',
                              borderRadius: '6px',
                              flexShrink: 0,
                              background: 'rgba(99, 102, 241, 0.12)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#818cf8',
                            }}
                          >
                            <Paperclip size={20} />
                          </div>
                        )}

                        {/* Thông tin chi tiết */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--fg)',
                              textDecoration: 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={att.fileName}
                          >
                            {att.fileName}
                          </a>
                          <div style={{ fontSize: '11px', color: 'var(--fg3, #a1a1aa)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span title={timeInfo.full}>{timeInfo.relative}</span>
                            {att.fileSize && (
                              <span>· {(att.fileSize / 1024).toFixed(1)} KB</span>
                            )}
                            {att.userName && <span>· bởi {att.userName}</span>}
                          </div>
                        </div>

                        {/* Nút thao tác */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="task-detail-icon-btn"
                            title="Mở trong tab mới"
                            style={{ padding: '6px', borderRadius: '6px' }}
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="task-detail-icon-btn"
                            title="Xoá tệp đính kèm khỏi DB"
                            style={{ padding: '6px', borderRadius: '6px', color: '#f87171' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="comments-tab-content">
              {/* Comment list */}
              {comments.length === 0 ? (
                <div style={{ color: '#a1a1aa', fontSize: '13px', padding: '12px 0' }}>
                  Chưa có bình luận nào. Hãy là người đầu tiên bình luận và lưu vào DB!
                </div>
              ) : (
                comments.map((c, i) => (
                  <div key={i} className="comment-bubble">
                    <strong>{c.author}</strong>
                    <span style={{ color: '#a1a1aa', fontSize: '11px', marginLeft: '8px' }}>{c.time}</span>
                    <br />
                    {c.text}
                  </div>
                ))
              )}

              {/* Comment input */}
              <div className="comment-input-row">
                <div className="task-comment-avatar" style={{ width: '32px', height: '32px', flexShrink: 0 }}>
                  <div className="task-avatar-fallback">
                    {(user?.fullName || user?.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <textarea
                    ref={commentInputRef}
                    className="task-comment-input"
                    rows={2}
                    placeholder="Viết bình luận... (Ctrl+Enter để gửi và lưu vào DB)"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={handleKeydownComment}
                    style={{
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      resize: 'none',
                      background: 'rgba(0,0,0,0.02)',
                    }}
                  />
                  <button
                    type="button"
                    className="btn solid-black"
                    onClick={handleSendComment}
                    disabled={sendingComment || !commentText.trim()}
                    style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 18px' }}
                  >
                    {sendingComment ? <Loader2 size={14} className="spin-slow" /> : <Send size={14} />}
                    Gửi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Activities Tab (Lịch sử kéo thả thẻ & Hoạt động chuẩn Trello) */}
          {activeTab === 'activities' && (
            <div className="activities-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Filter / Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                  <Clock size={15} style={{ color: '#10b981' }} />
                  <span>Nhận xét và hoạt động (Lịch sử kéo thẻ Trello)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOnlyComments((p) => !p)}
                  className="btn ghost sm"
                  style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {showOnlyComments ? (
                    <>
                      <Eye size={12} />
                      <span>Hiện tất cả hoạt động</span>
                    </>
                  ) : (
                    <>
                      <EyeOff size={12} />
                      <span>Chỉ xem bình luận</span>
                    </>
                  )}
                </button>
              </div>

              {/* Feed Content */}
              {loadingActivities ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#a1a1aa', gap: '8px', fontSize: '12px' }}>
                  <Loader2 size={14} className="spin-slow" />
                  <span>Đang tải lịch sử hoạt động từ DB...</span>
                </div>
              ) : cardActivities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cardActivities
                    .filter((act) => !showOnlyComments || act.eventType === 'COMMENT_ADDED')
                    .map((act) => {
                      const timeInfo = formatActivityTime(act.occurredAt);
                      const author = act.userName || 'Thành viên';
                      const initials = author.slice(0, 2).toUpperCase();

                      let eventColor = '#3b82f6';
                      if (act.eventType === 'CARD_MOVED') eventColor = '#10b981';
                      else if (act.eventType === 'CARD_COMPLETED') eventColor = '#059669';
                      else if (act.eventType === 'CARD_ATTACHMENT_ADDED') eventColor = '#6366f1';
                      else if (act.eventType === 'COMMENT_ADDED') eventColor = '#f59e0b';

                      return (
                        <div
                          key={act.id}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--line, rgba(255, 255, 255, 0.08))',
                            borderLeft: `3px solid ${eventColor}`,
                          }}
                        >
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: eventColor,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '11px',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            {initials}
                          </div>

                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg)' }}>
                                {author}
                              </span>
                              <span
                                title={timeInfo.full}
                                style={{ fontSize: '11px', color: 'var(--fg3, #a1a1aa)', flexShrink: 0 }}
                              >
                                {timeInfo.relative}
                              </span>
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--fg2, #cbd5e1)', lineHeight: 1.4 }}>
                              {act.displayMessage || act.eventType}
                            </div>

                            {act.commentText && (
                              <div
                                style={{
                                  marginTop: '4px',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(0, 0, 0, 0.2)',
                                  fontSize: '12px',
                                  color: 'var(--fg)',
                                }}
                              >
                                {act.commentText}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : activities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activities
                    .slice()
                    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
                    .map((act) => (
                      <div key={act.id} className="comment-bubble" style={{ borderLeft: '3px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '12px', color: '#10b981' }}>{act.eventType}</span>
                          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                            {new Date(act.occurredAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--fg)' }}>{act.details}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ color: '#a1a1aa', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>
                  Chưa có hoạt động nào được ghi nhận cho thẻ này.
                  {hasRealCardId && (
                    <span style={{ display: 'block', marginTop: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
                      Card ID: #{task.id}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
