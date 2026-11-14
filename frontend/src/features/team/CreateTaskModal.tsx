import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  FileText,
  Plus,
  Flame,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { TaskItem, TaskStatus } from './AllTasksSection';
import { showToast } from '../../components/ui/Toast';
import { teamApi } from '../../api/team.api';
import { TeamMember } from '../../types/team';
import { useAuthStore } from '../../store/authStore';

export interface CreateTaskSavePayload extends Partial<TaskItem> {
  assigneeId?: number;
  dueDateIso?: string;
  description?: string;
  difficultyLevel?: number;
  storyPoints?: number;
  initialComment?: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: CreateTaskSavePayload) => void;
  defaultStatus?: TaskStatus;
  columns?: { id: string; title: string }[];
  teamId?: number;
}

const AVATAR_COLORS = [
  { bg: '#e0f2fe', color: '#0369a1' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#ffedd5', color: '#c2410c' },
  { bg: '#f3e8ff', color: '#7e22ce' },
  { bg: '#fef9c3', color: '#a16207' },
  { bg: '#fce7f3', color: '#be185d' },
];

function getAvatarColor(idx: number) {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

const PRIORITY_LEVELS: Array<'Urgent' | 'High' | 'Medium' | 'Low'> = ['Urgent', 'High', 'Medium', 'Low'];

const PRIORITY_DIFFICULTY_MAP: Record<'Urgent' | 'High' | 'Medium' | 'Low', { difficulty: number; points: number }> = {
  Urgent: { difficulty: 4, points: 5.0 },
  High: { difficulty: 3, points: 3.0 },
  Medium: { difficulty: 2, points: 2.0 },
  Low: { difficulty: 1, points: 1.0 },
};

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultStatus = 'in_progress',
  columns,
  teamId,
}) => {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [title, setTitle] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [tag, setTag] = useState('');
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');

  // Members from API
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus(defaultStatus);
      setTitle('');
      setDueDateInput('');
      setTag('');
      setPriority('Medium');
      setDescription('');
      setComment('');
      setSelectedMemberIds([]);
      setMemberPickerOpen(false);
    }
  }, [isOpen, defaultStatus]);

  // Fetch team members from DB
  useEffect(() => {
    if (!isOpen || !teamId) return;
    setLoadingMembers(true);
    teamApi.getMembers(teamId)
      .then((res) => {
        if (res.data) setMembers(res.data);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [isOpen, teamId]);

  // Close picker on outside click
  useEffect(() => {
    if (!memberPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setMemberPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [memberPickerOpen]);

  if (!isOpen) return null;

  const toggleMember = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const removeMember = (id: number) => {
    setSelectedMemberIds((prev) => prev.filter((x) => x !== id));
  };

  const selectedMembers = members.filter((m) => {
    const id = m.userId ?? m.id;
    return selectedMemberIds.includes(id);
  });

  // Convert "Feb 02, 2027" or "YYYY-MM-DD" → ISO string for backend
  const parseDateToIso = (raw: string): string | undefined => {
    if (!raw.trim()) return undefined;
    const direct = new Date(raw);
    if (!isNaN(direct.getTime())) return direct.toISOString();
    const monthMap: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const m = raw.match(/^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m && monthMap[m[1]] !== undefined) {
      const d = new Date(Number(m[3]), monthMap[m[1]], Number(m[2]));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return undefined;
  };

  const formatDisplayDate = (raw: string): string => {
    if (!raw.trim()) return '';
    const iso = parseDateToIso(raw);
    if (!iso) return raw;
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}, ${d.getFullYear()}`;
  };

  const handleSave = () => {
    if (!title.trim()) {
      showToast.error('Tên task không được để trống', 'Lỗi');
      return;
    }

    const dueDateIso = parseDateToIso(dueDateInput);
    const displayDate = dueDateInput.trim()
      ? formatDisplayDate(dueDateInput) || dueDateInput
      : '';

    // Build assignee display list from selected members
    const assigneeChips = selectedMembers.map((m, i) => {
      const name = m.fullName || m.email || 'Unknown';
      const colorSet = getAvatarColor(i);
      return {
        name,
        avatarText: name.slice(0, 2).toUpperCase(),
        bg: colorSet.bg,
      };
    });

    const assigneeId =
      selectedMembers.length > 0 ? (selectedMembers[0].userId ?? selectedMembers[0].id) : undefined;

    const diffInfo = PRIORITY_DIFFICULTY_MAP[priority];

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      projectTag: tag.trim() || undefined,
      dueDate: displayDate,
      dueDateIso,
      status,
      difficultyLevel: diffInfo.difficulty,
      storyPoints: diffInfo.points,
      progress: priority === 'Urgent' ? 10 : priority === 'High' ? 25 : 10,
      commentsCount: comment.trim() ? 1 : 0,
      linksCount: 0,
      assignees: assigneeChips.length > 0 ? assigneeChips : undefined,
      assigneeId,
      initialComment: comment.trim() || undefined,
    });

    onClose();
  };

  const userInitials = (user?.fullName || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="task-modal-backdrop" onClick={onClose}>
      <div className="create-task-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="create-task-modal-head">
          <h2 className="create-task-modal-title">Create Task</h2>
          <button type="button" className="create-task-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Rows */}
        <div className="create-task-form">
          {/* Row 0: Title (required) */}
          <div className="task-form-row">
            <div className="task-form-label">
              <FileText size={16} />
              <span>Title <span style={{ color: '#ef4444' }}>*</span></span>
            </div>
            <div className="task-form-field">
              <input
                type="text"
                className="task-input-pill"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tên công việc..."
                autoFocus
              />
            </div>
          </div>

          {/* Row 1: Status */}
          <div className="task-form-row">
            <div className="task-form-label">
              <CheckCircle2 size={16} />
              <span>Status</span>
            </div>
            <div className="task-form-field">
              <select
                className="task-select-pill"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {columns && columns.length > 0 ? (
                  columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="todo">To-do</option>
                    <option value="in_progress">On Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Row 2: Due Date */}
          <div className="task-form-row">
            <div className="task-form-label">
              <Calendar size={16} />
              <span>Due date</span>
            </div>
            <div className="task-form-field">
              <input
                type="date"
                className="task-input-pill"
                value={dueDateInput}
                onChange={(e) => setDueDateInput(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Assignee — real team members from DB */}
          <div className="task-form-row" style={{ alignItems: 'flex-start' }}>
            <div className="task-form-label" style={{ paddingTop: '6px' }}>
              <User size={16} />
              <span>Assignee</span>
            </div>
            <div className="task-form-field task-assignee-chips" style={{ position: 'relative', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              {/* Selected chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedMembers.map((m, i) => {
                  const id = m.userId ?? m.id;
                  const name = m.fullName || m.email || 'Unknown';
                  const colorSet = getAvatarColor(i);
                  return (
                    <span
                      key={id}
                      className="assignee-tag-chip"
                      style={{ backgroundColor: colorSet.bg, color: colorSet.color }}
                    >
                      <span>{name}</span>
                      <button
                        type="button"
                        className="assignee-tag-remove"
                        onClick={() => removeMember(id)}
                        aria-label={`Xóa ${name}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                {/* Add button */}
                <button
                  type="button"
                  className="assignee-add-btn"
                  onClick={() => setMemberPickerOpen((p) => !p)}
                  title="Thêm người thực hiện"
                  disabled={loadingMembers}
                >
                  {loadingMembers ? <Loader2 size={14} className="spin-slow" /> : <Plus size={14} />}
                </button>
              </div>

              {/* Dropdown picker */}
              {memberPickerOpen && (
                <div ref={pickerRef} className="member-picker-dropdown">
                  {members.length === 0 ? (
                    <div className="member-picker-empty">
                      {!teamId ? 'Không có team ID' : 'Chưa có thành viên'}
                    </div>
                  ) : (
                    members.map((m, i) => {
                      const id = m.userId ?? m.id;
                      const name = m.fullName || m.email || 'Unknown';
                      const isSelected = selectedMemberIds.includes(id);
                      const colorSet = getAvatarColor(i);
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`member-picker-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleMember(id)}
                        >
                          <span
                            className="member-picker-avatar"
                            style={{ background: colorSet.bg, color: colorSet.color }}
                          >
                            {name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="member-picker-name">{name}</span>
                          <span className="member-picker-role" style={{ color: '#a1a1aa', fontSize: '11px' }}>
                            {m.role === 'LEADER' ? 'Leader' : 'Member'}
                          </span>
                          {isSelected && <span className="member-picker-check">✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Tags */}
          <div className="task-form-row">
            <div className="task-form-label">
              <Tag size={16} />
              <span>Tags</span>
            </div>
            <div className="task-form-field">
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="task-input-pill"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="VD: Dashboard, Backend API..."
                  list="tag-suggestions"
                />
                <datalist id="tag-suggestions">
                  <option value="Dashboard" />
                  <option value="Website" />
                  <option value="Mobile App" />
                  <option value="Backend API" />
                  <option value="UI/UX" />
                  <option value="Testing" />
                </datalist>
              </div>
            </div>
          </div>

          {/* Row 5: Priority */}
          <div className="task-form-row">
            <div className="task-form-label">
              <Flame size={16} />
              <span>Priority</span>
            </div>
            <div className="task-form-field" style={{ gap: '6px' }}>
              {PRIORITY_LEVELS.map((p) => (
                <span
                  key={p}
                  className={`priority-pill-badge ${priority === p ? 'priority-pill--active' : 'priority-pill--inactive'}`}
                  onClick={() => setPriority(p)}
                  title={p}
                  style={{ cursor: 'pointer', opacity: priority === p ? 1 : 0.4 }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Row 6: Description */}
          <div className="task-form-row task-form-row--align-top">
            <div className="task-form-label">
              <FileText size={16} />
              <span>Description</span>
            </div>
            <div className="task-form-field">
              <textarea
                className="task-desc-textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả công việc cần làm..."
              />
            </div>
          </div>

          {/* Comment Box */}
          <div className="task-comment-box">
            <div className="task-comment-avatar">
              <div className="task-avatar-fallback">{userInitials}</div>
            </div>
            <textarea
              className="task-comment-input"
              rows={2}
              placeholder="Thêm ghi chú/bình luận ban đầu (lưu trực tiếp vào DB)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="create-task-modal-footer">
          <div className="collaborators-area">
            <span className="collaborators-label">Collaborators</span>
            <div className="collaborators-avatars">
              {selectedMembers.map((m, i) => {
                const id = m.userId ?? m.id;
                const name = m.fullName || m.email || 'Unknown';
                const colorSet = getAvatarColor(i);
                return (
                  <div
                    key={id}
                    className="collab-avatar"
                    style={{ background: colorSet.bg, color: colorSet.color, zIndex: 10 - i }}
                    title={name}
                  >
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                );
              })}
              <button
                type="button"
                className="collab-add-btn"
                onClick={() => setMemberPickerOpen((p) => !p)}
                title="Thêm cộng tác viên"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div className="modal-actions-right">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn solid-black" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
