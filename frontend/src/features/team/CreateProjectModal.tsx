import React, { useState } from 'react';
import { X, FolderPlus, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useNavigate } from 'react-router-dom';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'create' | 'join';
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'create',
}) => {
  const navigate = useNavigate();
  const { createProject, joinProject } = useProjectStore();
  const [mode, setMode] = useState<'create' | 'join'>(initialMode);

  // Create form state
  const [projectName, setProjectName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [description, setDescription] = useState('');

  // Join form state
  const [inviteCode, setInviteCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Vui lòng nhập tên đề tài đồ án');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const team = await createProject({
        name: projectName.trim(),
        courseName: courseName.trim(),
        description: description.trim() || undefined,
      });
      setSuccessMsg(`Tạo dự án "${team.name}" thành công!`);
      setTimeout(() => {
        onClose();
        navigate(`/teams/${team.id}`);
      }, 1000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể tạo dự án. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Vui lòng nhập mã mời');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const team = await joinProject(inviteCode.trim());
      setSuccessMsg(`Đã tham gia dự án "${team.name}" thành công!`);
      setTimeout(() => {
        onClose();
        navigate(`/teams/${team.id}`);
      }, 1000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Mã mời không chính xác hoặc đã hết hạn.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {mode === 'create' ? (
              <FolderPlus size={18} style={{ color: 'var(--accent)' }} />
            ) : (
              <KeyRound size={18} style={{ color: 'var(--ok)' }} />
            )}
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--fg)' }}>
              {mode === 'create' ? 'Khởi tạo dự án đồ án mới' : 'Tham gia dự án bằng mã mời'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn ghost"
            style={{ padding: '0.25rem', borderRadius: '6px' }}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              fontSize: '0.78rem',
              fontWeight: mode === 'create' ? 700 : 500,
              color: mode === 'create' ? 'var(--accent)' : 'var(--fg3)',
              borderBottom: mode === 'create' ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Tạo dự án mới
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('join');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              fontSize: '0.78rem',
              fontWeight: mode === 'join' ? 700 : 500,
              color: mode === 'join' ? 'var(--accent)' : 'var(--fg3)',
              borderBottom: mode === 'join' ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Nhập mã mời tham gia
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.25rem' }}>
          {error && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                background: 'color-mix(in srgb, var(--bad) 12%, var(--surface))',
                border: '1px solid color-mix(in srgb, var(--bad) 35%, var(--line))',
                color: 'var(--bad)',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                background: 'color-mix(in srgb, var(--ok) 12%, var(--surface))',
                border: '1px solid color-mix(in srgb, var(--ok) 35%, var(--line))',
                color: 'var(--ok)',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <label className="field">
                <span>Tên đề tài đồ án *</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Xây dựng Hệ thống E-Commerce Sinh viên"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                  required
                />
              </label>

              <label className="field">
                <span>Môn học / Lớp học phần</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Quản lý Dự án CNTT, Phát triển Web..."
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Mô tả tóm tắt đồ án</span>
                <textarea
                  rows={2}
                  placeholder="Mục tiêu đồ án, công nghệ sử dụng, phân công tổng quan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <div
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--line)',
                  fontSize: '0.72rem',
                  color: 'var(--fg3)',
                  lineHeight: 1.45,
                }}
              >
                💡 Sau khi tạo, hệ thống tự động thiết lập <strong>Sprint 1</strong> và <strong>Kanban Board</strong> với 4 cột chuẩn để bạn mời thành viên và phân chia công việc ngay lập tức.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={onClose} className="btn ghost" disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className="btn sq" disabled={loading}>
                  {loading && <Loader2 size={13} className="animate-spin" style={{ marginRight: '0.35rem' }} />}
                  Tạo dự án
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <label className="field">
                <span>Mã mời tham gia nhóm (Invite Code) *</span>
                <input
                  type="text"
                  placeholder="Ví dụ: FS-8K2M9P"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  autoFocus
                  required
                  style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.05em' }}
                />
              </label>

              <div
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--line)',
                  fontSize: '0.72rem',
                  color: 'var(--fg3)',
                  lineHeight: 1.45,
                }}
              >
                🔑 Mã mời do Nhóm trưởng (Leader) chia sẻ tại mục <em>Chi tiết nhóm</em>. Nhập mã để tham gia vào đồ án của nhóm bạn.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={onClose} className="btn ghost" disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className="btn sq" disabled={loading}>
                  {loading && <Loader2 size={13} className="animate-spin" style={{ marginRight: '0.35rem' }} />}
                  Tham gia nhóm
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

