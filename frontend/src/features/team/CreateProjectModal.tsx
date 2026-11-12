import React, { useState, useEffect } from 'react';
import {
  X,
  FolderPlus,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Kanban,
  Users,
  Check,
} from 'lucide-react';
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

  // Mode: 'create' or 'join'
  const [mode, setMode] = useState<'create' | 'join'>(initialMode);
  // Current step in the wizard (1, 2, 3)
  const [step, setStep] = useState<number>(1);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset or initialize state when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStep(1);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Total steps depending on mode
  const totalSteps = mode === 'create' ? 3 : 2;

  // Handle Step Forward
  const handleNext = () => {
    setError(null);
    if (step === 1) {
      setStep(2);
      return;
    }

    if (mode === 'create') {
      if (step === 2) {
        if (!projectName.trim()) {
          setError('Vui lòng nhập tên đề tài đồ án');
          return;
        }
        setStep(3);
      }
    }
  };

  // Handle Step Back
  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Submit Create Project
  const handleCreateSubmit = async () => {
    if (!projectName.trim()) {
      setError('Vui lòng nhập tên đề tài đồ án');
      setStep(2);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const team = await createProject({
        name: projectName.trim(),
        courseName: courseName.trim() || undefined,
        description: description.trim() || undefined,
      });
      setSuccessMsg(`Khởi tạo dự án "${team.name}" thành công!`);
      setTimeout(() => {
        onClose();
        navigate(`/teams/${team.id}`);
      }, 1000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể tạo dự án. Vui lòng kiểm tra lại kết nối.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Submit Join Project
  const handleJoinSubmit = async () => {
    if (!inviteCode.trim()) {
      setError('Vui lòng nhập mã mời nhóm');
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Mã mời không chính xác hoặc đã hết hạn.';
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
        padding: '1.25rem',
        background: 'rgba(0, 0, 0, 0.68)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="mini-window"
        style={{
          width: '100%',
          maxWidth: '560px',
          borderRadius: '26px',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          color: 'var(--fg)',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.42), 0 0 0 1px var(--glass-line)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Top bar with Close button */}
        <div
          style={{
            padding: '1.5rem 1.75rem 0.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div style={{ flex: 1, paddingRight: '2rem' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.35rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
                lineHeight: 1.3,
              }}
            >
              {step === 1 && 'Bắt đầu với đồ án của bạn'}
              {step === 2 && mode === 'create' && 'Thông tin đề tài đồ án'}
              {step === 3 && mode === 'create' && 'Xác nhận & Khởi tạo'}
              {step === 2 && mode === 'join' && 'Nhập mã mời nhóm'}
            </h2>
            <p
              style={{
                margin: '0.4rem 0 0',
                fontSize: '0.85rem',
                color: 'var(--fg3)',
                lineHeight: 1.45,
              }}
            >
              {step === 1 && 'Chọn tạo một dự án mới hoặc tham gia nhóm đã có sẵn.'}
              {step === 2 && mode === 'create' && 'Điền tên đề tài và môn học để thiết lập không gian nhóm.'}
              {step === 3 && mode === 'create' && 'Kiểm tra lại thông tin trước khi tạo không gian làm việc.'}
              {step === 2 && mode === 'join' && 'Dán mã mời do Nhóm trưởng (Leader) chia sẻ để tham gia.'}
            </p>
          </div>

          {/* Circular Close Button (Image 3 Style) */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface2)',
              border: '1px solid var(--line)',
              color: 'var(--fg2)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--fg)';
              e.currentTarget.style.borderColor = 'var(--fg3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--fg2)';
              e.currentTarget.style.borderColor = 'var(--line)';
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem 1.75rem 1.5rem' }}>
          {/* Error Message */}
          {error && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '14px',
                background: 'color-mix(in srgb, var(--bad) 12%, var(--surface2))',
                border: '1px solid color-mix(in srgb, var(--bad) 35%, var(--line))',
                color: 'var(--bad)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '14px',
                background: 'color-mix(in srgb, var(--ok) 12%, var(--surface2))',
                border: '1px solid color-mix(in srgb, var(--ok) 35%, var(--line))',
                color: 'var(--ok)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ──────────────── STEP 1: CHOOSE MODE ──────────────── */}
          {step === 1 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '1rem',
                marginTop: '0.5rem',
              }}
            >
              {/* Card 1: Tạo dự án mới */}
              <button
                type="button"
                onClick={() => setMode('create')}
                style={{
                  padding: '1.4rem 1.25rem',
                  borderRadius: '20px',
                  border: mode === 'create' ? '2px solid var(--accent)' : '1.5px solid var(--line)',
                  background: mode === 'create' ? 'color-mix(in srgb, var(--accent) 8%, var(--surface2))' : 'var(--surface2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: mode === 'create' ? '0 8px 24px -6px color-mix(in srgb, var(--accent) 25%, transparent)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: mode === 'create' ? 'var(--accent)' : 'var(--surface)',
                    color: mode === 'create' ? '#ffffff' : 'var(--fg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <FolderPlus size={22} />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--fg)', marginBottom: '0.35rem' }}>
                  Tạo dự án mới
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--fg3)', lineHeight: 1.45 }}>
                  Khởi tạo đồ án, thiết lập Sprint 1 & bảng Kanban phân công công việc.
                </div>
                {mode === 'create' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>

              {/* Card 2: Nhập mã mời */}
              <button
                type="button"
                onClick={() => setMode('join')}
                style={{
                  padding: '1.4rem 1.25rem',
                  borderRadius: '20px',
                  border: mode === 'join' ? '2px solid var(--accent)' : '1.5px solid var(--line)',
                  background: mode === 'join' ? 'color-mix(in srgb, var(--accent) 8%, var(--surface2))' : 'var(--surface2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: mode === 'join' ? '0 8px 24px -6px color-mix(in srgb, var(--accent) 25%, transparent)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: mode === 'join' ? 'var(--accent)' : 'var(--surface)',
                    color: mode === 'join' ? '#ffffff' : 'var(--fg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <KeyRound size={22} />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--fg)', marginBottom: '0.35rem' }}>
                  Nhập mã mời
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--fg3)', lineHeight: 1.45 }}>
                  Tham gia vào dự án có sẵn do bạn cùng nhóm hoặc trưởng nhóm đã tạo.
                </div>
                {mode === 'join' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>
            </div>
          )}

          {/* ──────────────── STEP 2 (CREATE): PROJECT DETAILS ──────────────── */}
          {step === 2 && mode === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '0.45rem',
                    color: 'var(--fg)',
                  }}
                >
                  Tên đề tài đồ án <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Xây dựng Hệ thống E-Commerce Sinh viên"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '14px',
                    background: 'var(--surface2)',
                    border: '1.5px solid var(--line)',
                    color: 'var(--fg)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '0.45rem',
                    color: 'var(--fg)',
                  }}
                >
                  Môn học / Lớp học phần
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Quản lý Dự án CNTT, Phát triển Web..."
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '14px',
                    background: 'var(--surface2)',
                    border: '1.5px solid var(--line)',
                    color: 'var(--fg)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '0.45rem',
                    color: 'var(--fg)',
                  }}
                >
                  Mô tả tóm tắt đồ án
                </label>
                <textarea
                  rows={2}
                  placeholder="Mục tiêu đồ án, công nghệ sử dụng, phân công tổng quan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '14px',
                    background: 'var(--surface2)',
                    border: '1.5px solid var(--line)',
                    color: 'var(--fg)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
                />
              </div>

              <div
                style={{
                  padding: '0.75rem 0.95rem',
                  borderRadius: '14px',
                  background: 'color-mix(in srgb, var(--accent) 7%, var(--surface2))',
                  border: '1px solid color-mix(in srgb, var(--accent) 22%, var(--line))',
                  fontSize: '0.76rem',
                  color: 'var(--fg2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  lineHeight: 1.45,
                }}
              >
                <Sparkles size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>
                  Hệ thống sẽ tự động cấu hình <strong>Sprint 1</strong> và bảng <strong>Kanban 4 cột</strong> để phân công công việc ngay sau khi tạo.
                </span>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 3 (CREATE): CONFIRMATION & REVIEW ──────────────── */}
          {step === 3 && mode === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Summary Card */}
              <div
                style={{
                  padding: '1.25rem 1.4rem',
                  borderRadius: '20px',
                  background: 'var(--surface2)',
                  border: '1.5px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', fontWeight: 700 }}>
                    Tên đề tài
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--fg)', marginTop: '0.2rem' }}>
                    {projectName}
                  </div>
                </div>

                {courseName && (
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.65rem' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg3)', fontWeight: 600 }}>
                      Môn học / Lớp
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--fg)', marginTop: '0.15rem' }}>
                      {courseName}
                    </div>
                  </div>
                )}

                {description && (
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.65rem' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg3)', fontWeight: 600 }}>
                      Mô tả
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--fg2)', marginTop: '0.15rem', lineHeight: 1.45 }}>
                      {description}
                    </div>
                  </div>
                )}
              </div>

              {/* Ready features */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '12px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.76rem',
                    color: 'var(--fg2)',
                  }}
                >
                  <Kanban size={15} style={{ color: 'var(--accent)' }} />
                  <span>Kanban Board</span>
                </div>
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '12px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.76rem',
                    color: 'var(--fg2)',
                  }}
                >
                  <Users size={15} style={{ color: 'var(--m2)' }} />
                  <span>Chấm chéo ẩn danh</span>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 2 (JOIN): ENTER INVITE CODE ──────────────── */}
          {step === 2 && mode === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '0.55rem',
                    color: 'var(--fg)',
                  }}
                >
                  Mã mời tham gia nhóm (Invite Code) <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: FS-8K2M9P"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.95rem 1rem',
                    borderRadius: '16px',
                    background: 'var(--surface2)',
                    border: '1.5px solid var(--line)',
                    color: 'var(--fg)',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.12em',
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
                />
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '16px',
                  background: 'color-mix(in srgb, var(--accent) 7%, var(--surface2))',
                  border: '1px solid color-mix(in srgb, var(--accent) 22%, var(--line))',
                  fontSize: '0.78rem',
                  color: 'var(--fg2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  lineHeight: 1.5,
                }}
              >
                <KeyRound size={17} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Mã mời gồm 6-8 ký tự do <strong>Nhóm trưởng (Leader)</strong> chia sẻ tại mục <em>Chi tiết nhóm</em>. Nhập mã để được tự động thêm vào nhóm và xem danh sách task của đồ án.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ──────────────── FOOTER BAR (Image 3 Style: Progress bar + Pill buttons) ──────────────── */}
        <div
          style={{
            padding: '1.1rem 1.75rem',
            borderTop: '1px solid var(--line)',
            background: 'var(--surface2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Progress bar and Step label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '90px',
                height: '6px',
                borderRadius: '999px',
                background: 'var(--line)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(step / totalSteps) * 100}%`,
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, var(--accent), var(--ital))',
                  transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--fg3)',
                letterSpacing: '0.02em',
              }}
            >
              Bước {step}/{totalSteps}
            </span>
          </div>

          {/* Action Navigation Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--fg)',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--fg3)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
              >
                <ChevronLeft size={15} />
                Quay lại
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--fg3)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg3)')}
              >
                Hủy
              </button>
            )}

            {/* Next / Submit Button */}
            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                style={{
                  padding: '0.55rem 1.4rem',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: 'var(--accent)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 4px 14px -3px color-mix(in srgb, var(--accent) 50%, transparent)',
                  transition: 'all 0.15s ease',
                }}
              >
                Tiếp tục
                <ChevronRight size={15} />
              </button>
            ) : mode === 'create' ? (
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={loading}
                style={{
                  padding: '0.55rem 1.45rem',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: 'var(--accent)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 14px -3px color-mix(in srgb, var(--accent) 50%, transparent)',
                  transition: 'all 0.15s ease',
                }}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                Khởi tạo dự án
              </button>
            ) : (
              <button
                type="button"
                onClick={handleJoinSubmit}
                disabled={loading}
                style={{
                  padding: '0.55rem 1.45rem',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: 'var(--accent)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 14px -3px color-mix(in srgb, var(--accent) 50%, transparent)',
                  transition: 'all 0.15s ease',
                }}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                Tham gia nhóm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
