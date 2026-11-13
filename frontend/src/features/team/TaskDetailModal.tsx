import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  FileText,
  Plus,
  Clock,
  Flame,
  CheckCircle2,
  Share2,
  FileSpreadsheet,
  Figma,
  Check,
  Search,
} from 'lucide-react';
import { TaskItem } from './AllTasksSection';
import { showToast } from '../../components/ui/Toast';

interface TaskDetailModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'subtasks' | 'comments' | 'activities'>('subtasks');
  const [subtasks, setSubtasks] = useState([
    {
      id: 'sub-1',
      title: 'Meeting & Mind Mapping with Tyler',
      note: 'Note: Some employees have different KPI cases',
      completed: true,
    },
    {
      id: 'sub-2',
      title: 'Collect moodboards about KPI programs',
      note: '',
      completed: false,
    },
    {
      id: 'sub-3',
      title: 'High-fidelity wireframe prototype screens',
      note: '',
      completed: false,
    },
  ]);

  if (!isOpen || !task) return null;

  const toggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / subtasks.length) * 100);

  return (
    <div className="task-modal-backdrop" onClick={onClose}>
      <div className="task-detail-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Top Header bar with Breadcrumbs & Actions */}
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
              onClick={() => showToast.info('Đã sao chép liên kết task', 'Share')}
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

        {/* Task Detail Body Scrollable */}
        <div className="task-detail-content-scroll">
          {/* Main Title & Header */}
          <div className="task-detail-main-head">
            <div className="task-detail-icon-box">
              <FileSpreadsheet size={20} />
            </div>

            <div className="task-detail-title-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 className="task-detail-h1">{task.projectTag}</h1>
                <span className="task-urgent-badge">Urgent</span>
              </div>

              <div className="task-detail-meta-right">
                <span className="task-meta-time">
                  <Clock size={13} /> 3 min ago
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
                  onClick={() => showToast.info('Mở cửa sổ thêm thành viên', 'Thành viên')}
                >
                  + New member
                </button>
              </div>
            </div>
          </div>

          {/* Properties Form (Image 2 Style) */}
          <div className="task-properties-box">
            {/* Status */}
            <div className="prop-row">
              <div className="prop-label">
                <CheckCircle2 size={16} />
                <span>Status</span>
              </div>
              <div className="prop-value">
                <span className="prop-status-pill">
                  <Clock size={13} className="spin-slow" />
                  <span>On Progress</span>
                </span>
              </div>
            </div>

            {/* Due date */}
            <div className="prop-row">
              <div className="prop-label">
                <Calendar size={16} />
                <span>Due date</span>
              </div>
              <div className="prop-value">
                <span className="prop-text">{task.dueDate}</span>
              </div>
            </div>

            {/* Assignee */}
            <div className="prop-row">
              <div className="prop-label">
                <User size={16} />
                <span>Assignee</span>
              </div>
              <div className="prop-value prop-assignees-list">
                <span className="assignee-tag-chip" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                  Kiara Laras <span className="chip-x">×</span>
                </span>
                <span className="assignee-tag-chip" style={{ background: '#dcfce7', color: '#15803d' }}>
                  Joe Tesla <span className="chip-x">×</span>
                </span>
                <span className="assignee-tag-chip" style={{ background: '#ffedd5', color: '#c2410c' }}>
                  Tania <span className="chip-x">×</span>
                </span>
                <button type="button" className="assignee-add-btn">
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="prop-row">
              <div className="prop-label">
                <Tag size={16} />
                <span>Tags</span>
              </div>
              <div className="prop-value">
                <span className="prop-tag-pill">Dashboard ▾</span>
              </div>
            </div>

            {/* Priority */}
            <div className="prop-row">
              <div className="prop-label">
                <Flame size={16} />
                <span>Priority</span>
              </div>
              <div className="prop-value">
                <span className="priority-pill-badge">Urgent</span>
              </div>
            </div>

            {/* Description */}
            <div className="prop-row prop-row--top">
              <div className="prop-label">
                <FileText size={16} />
                <span>Description</span>
              </div>
              <div className="prop-value">
                <div className="prop-description-box">
                  {task.title}
                </div>
              </div>
            </div>
          </div>

          {/* ── Attachments Section (Image 2 Style) ── */}
          <div className="attachments-section">
            <div className="attachments-header">
              <h3>Attachment (2)</h3>
              <button
                type="button"
                className="download-all-link"
                onClick={() => showToast.success('Bắt đầu tải tất cả tệp đính kèm')}
              >
                Download All
              </button>
            </div>

            <div className="attachments-list">
              {/* Attachment 1: Word/PDF */}
              <div className="attachment-card">
                <div className="attachment-icon attachment-icon--pdf">
                  <FileText size={18} />
                </div>
                <div className="attachment-info">
                  <span className="attachment-name">Design brief.pdf</span>
                  <span className="attachment-size">
                    1,5 MB · <span className="attachment-dl-btn">Download file</span>
                  </span>
                </div>
              </div>

              {/* Attachment 2: Figma */}
              <div className="attachment-card">
                <div className="attachment-icon attachment-icon--figma">
                  <Figma size={18} />
                </div>
                <div className="attachment-info">
                  <span className="attachment-name">ABC Dashboard.fig</span>
                  <span className="attachment-size">2,5 MB</span>
                </div>
              </div>

              {/* Add attachment button */}
              <button
                type="button"
                className="attachment-add-card"
                onClick={() => showToast.info('Chọn tệp từ máy tính để tải lên')}
                title="Thêm tệp đính kèm"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* ── Tabs: Subtasks | Comments | Activities ── */}
          <div className="task-detail-sub-tabs">
            <button
              type="button"
              className={`sub-tab-btn ${activeTab === 'subtasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('subtasks')}
            >
              Subtasks
            </button>
            <button
              type="button"
              className={`sub-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              Comments <span className="tab-count-bubble">3</span>
            </button>
            <button
              type="button"
              className={`sub-tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
              onClick={() => setActiveTab('activities')}
            >
              Activities
            </button>
          </div>

          {/* ── Subtasks Tab Content (Image 2 Style) ── */}
          {activeTab === 'subtasks' && (
            <div className="subtasks-container">
              <div className="subtasks-head">
                <h3>Our Design Process</h3>
                <div className="subtasks-progress">
                  <div className="subtasks-track">
                    <div
                      className="subtasks-fill"
                      style={{ width: `${progressPercent}%`, backgroundColor: '#0d9488' }}
                    />
                  </div>
                  <span className="subtasks-pct">Progress : {progressPercent}%</span>
                </div>
              </div>

              <div className="subtasks-checklist">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className={`subtask-item ${sub.completed ? 'completed' : ''}`}
                    onClick={() => toggleSubtask(sub.id)}
                  >
                    <div className="subtask-drag-handle">⋮⋮</div>
                    <div className={`subtask-checkbox ${sub.completed ? 'checked' : ''}`}>
                      {sub.completed && <Check size={13} strokeWidth={3} />}
                    </div>
                    <div className="subtask-body">
                      <span className="subtask-title">{sub.title}</span>
                      {sub.note && <div className="subtask-note-box">{sub.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Tab Content */}
          {activeTab === 'comments' && (
            <div className="comments-tab-content">
              <div className="comment-bubble">
                <strong>Minh Triều:</strong> Wireframe đã hoàn thiện bản thảo trang Dashboard, hãy xem xét các biểu đồ.
              </div>
              <div className="comment-bubble">
                <strong>Lan Anh:</strong> Các trường dữ liệu từ API Backend đã sẵn sàng tích hợp.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
