import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  FileText,
  Plus,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { TaskItem, TaskStatus } from './AllTasksSection';
import { showToast } from '../../components/ui/Toast';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<TaskItem>) => void;
  defaultStatus?: TaskStatus;
  columns?: { id: string; title: string }[];
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultStatus = 'in_progress',
  columns,
}) => {
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);

  useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus, isOpen]);
  const [dueDate, setDueDate] = useState('Feb 02, 2027');
  const [tag, setTag] = useState('Dashboard');
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Urgent');
  const [description, setDescription] = useState('Create wireframe for Dashboard page');
  const [comment, setComment] = useState('');

  const [assignees, setAssignees] = useState<
    { name: string; avatarText: string; bg: string; color: string }[]
  >([
    { name: 'Kiara Laras', avatarText: 'KL', bg: '#e0f2fe', color: '#0369a1' },
    { name: 'Joe Tesla', avatarText: 'JT', bg: '#dcfce7', color: '#15803d' },
    { name: 'Tania', avatarText: 'TA', bg: '#ffedd5', color: '#c2410c' },
  ]);

  if (!isOpen) return null;

  const handleRemoveAssignee = (name: string) => {
    setAssignees((prev) => prev.filter((a) => a.name !== name));
  };

  const handleAddAssignee = () => {
    const names = ['Tyler', 'Alex', 'Sarah', 'Minh Triều'];
    const pick = names[Math.floor(Math.random() * names.length)];
    if (!assignees.some((a) => a.name === pick)) {
      setAssignees((prev) => [
        ...prev,
        {
          name: pick,
          avatarText: pick.substring(0, 2).toUpperCase(),
          bg: '#f3e8ff',
          color: '#7e22ce',
        },
      ]);
    }
  };

  const handleSave = () => {
    onSave({
      projectTag: tag || 'ABC Dashboard',
      title: description || 'New Task',
      dueDate: dueDate || 'Feb 14, 2027',
      status,
      progress: status === 'completed' ? 100 : status === 'in_review' ? 60 : status === 'in_progress' ? 25 : 0,
      commentsCount: comment ? 1 : 0,
      linksCount: 1,
      assignees: assignees.map((a) => ({
        name: a.name,
        avatarText: a.avatarText,
        bg: a.bg,
      })),
    });

    showToast.success('Đã tạo task mới thành công!', 'Success!');
    onClose();
  };

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
                type="text"
                className="task-input-pill"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="VD: Feb 02, 2027"
              />
            </div>
          </div>

          {/* Row 3: Assignee */}
          <div className="task-form-row">
            <div className="task-form-label">
              <User size={16} />
              <span>Assignee</span>
            </div>
            <div className="task-form-field task-assignee-chips">
              {assignees.map((a) => (
                <span
                  key={a.name}
                  className="assignee-tag-chip"
                  style={{ backgroundColor: a.bg, color: a.color }}
                >
                  <span>{a.name}</span>
                  <button
                    type="button"
                    className="assignee-tag-remove"
                    onClick={() => handleRemoveAssignee(a.name)}
                    aria-label={`Xóa ${a.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}

              <button
                type="button"
                className="assignee-add-btn"
                onClick={handleAddAssignee}
                title="Thêm người thực hiện"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Row 4: Tags */}
          <div className="task-form-row">
            <div className="task-form-label">
              <Tag size={16} />
              <span>Tags</span>
            </div>
            <div className="task-form-field">
              <select
                className="task-select-pill"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="Dashboard">Dashboard</option>
                <option value="Website">Website</option>
                <option value="Mobile App">Mobile App</option>
                <option value="Backend API">Backend API</option>
              </select>
            </div>
          </div>

          {/* Row 5: Priority */}
          <div className="task-form-row">
            <div className="task-form-label">
              <Flame size={16} />
              <span>Priority</span>
            </div>
            <div className="task-form-field">
              <span
                className="priority-pill-badge"
                onClick={() => {
                  const opts: ('Urgent' | 'High' | 'Medium' | 'Low')[] = ['Urgent', 'High', 'Medium', 'Low'];
                  const nextIdx = (opts.indexOf(priority) + 1) % opts.length;
                  setPriority(opts[nextIdx]);
                }}
                title="Bấm để đổi độ ưu tiên"
              >
                {priority}
              </span>
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

          {/* + Add Section Button */}
          <div className="add-section-row">
            <button
              type="button"
              className="add-section-btn"
              onClick={() => showToast.info('Đã thêm một mục mới', 'Add Section')}
            >
              <Plus size={14} />
              <span>Add Section</span>
            </button>
          </div>

          {/* Comment Box */}
          <div className="task-comment-box">
            <div className="task-comment-avatar">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                alt="Me"
                onError={(e) => {
                  // Fallback nếu ảnh không load được
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="task-avatar-fallback">MT</div>
            </div>
            <textarea
              className="task-comment-input"
              rows={2}
              placeholder="Add a comment"
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
              {assignees.map((a, i) => (
                <div
                  key={a.name}
                  className="collab-avatar"
                  style={{ background: a.bg, color: a.color, zIndex: 10 - i }}
                  title={a.name}
                >
                  {a.avatarText}
                </div>
              ))}
              <button
                type="button"
                className="collab-add-btn"
                onClick={handleAddAssignee}
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
