import React, { useState } from 'react';
import { Plus, KeyRound, Info, Folder } from 'lucide-react';
import { CreateProjectModal } from './CreateProjectModal';
import { useProjectStore } from '../../store/projectStore';
import { useNavigate } from 'react-router-dom';

export interface NoProjectStateProps {
  title?: string;
  description?: string;
}

export const NoProjectState: React.FC<NoProjectStateProps> = ({
  title = 'Bắt đầu với đồ án của bạn',
  description = 'Khởi tạo một đồ án mới để phân công công việc cho thành viên, hoặc tham gia vào nhóm bằng mã mời từ bạn bè.',
}) => {
  const navigate = useNavigate();
  const { teams, activeTeamId, setActiveTeamId } = useProjectStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(activeTeamId || (teams[0]?.id ?? null));

  const handleContinue = () => {
    if (selectedTeamId) {
      setActiveTeamId(selectedTeamId);
      navigate(`/teams/${selectedTeamId}`);
    } else {
      setModalMode('create');
      setModalOpen(true);
    }
  };

  return (
    <div
      className="page pad"
      style={{
        maxWidth: '860px',
        margin: '36px auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - var(--top) - 140px)',
      }}
    >
      {/* Outer Floating Canvas (Matching Image 2 Ender design: Soft, Clean, Rounded-3xl) */}
      <div
        className="panel"
        style={{
          width: '100%',
          textAlign: 'center',
          padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 3rem)',
          borderRadius: '32px',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          boxShadow: '0 24px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--glass-line)',
          position: 'relative',
        }}
      >
        {/* Header Section */}
        <h1
          style={{
            margin: '0 0 0.6rem',
            fontSize: 'clamp(1.5rem, 3vw, 1.95rem)',
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>

        <p
          style={{
            maxWidth: '520px',
            margin: '0 auto 2.5rem',
            color: 'var(--fg2)',
            fontSize: '0.88rem',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>

        {/* Horizontal Cards Row (Matching Image 2 layout with soft rounded cards) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            gap: '1.25rem',
            flexWrap: 'wrap',
            margin: '0 auto 2rem',
            maxWidth: '680px',
          }}
        >
          {/* Existing Teams as Project Cards (if user is already in any project) */}
          {teams.map((team, idx) => {
            const isSelected = selectedTeamId === team.id;
            const avatarGradients = [
              'linear-gradient(135deg, #ec4899, #f43f5e)',
              'linear-gradient(135deg, #10b981, #06b6d4)',
              'linear-gradient(135deg, #8b5cf6, #6366f1)',
              'linear-gradient(135deg, #f59e0b, #ef4444)',
            ];
            const bgGrad = avatarGradients[idx % avatarGradients.length];

            return (
              <div
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                style={{
                  width: '180px',
                  minHeight: '210px',
                  padding: '1.5rem 1rem',
                  borderRadius: '24px',
                  background: 'var(--surface2)',
                  border: isSelected ? '2px solid var(--accent)' : '1.5px solid var(--line)',
                  boxShadow: isSelected
                    ? '0 12px 30px -8px color-mix(in srgb, var(--accent) 30%, transparent)'
                    : '0 6px 18px -4px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                }}
              >
                {/* Avatar Circle */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: bgGrad,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    boxShadow: '0 6px 16px -4px rgba(0,0,0,0.2)',
                  }}
                >
                  <Folder size={26} />
                </div>
                {/* Team Name */}
                <div
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    color: 'var(--fg)',
                    marginBottom: '0.3rem',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={team.name}
                >
                  {team.name}
                </div>
                {/* Course Name / Subtext */}
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--fg3)',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {team.courseName || 'Đồ án nhóm'}
                </div>
              </div>
            );
          })}

          {/* Card (+) Tạo dự án mới (Matching Image 2 "Add child" card design) */}
          <div
            onClick={() => {
              setModalMode('create');
              setModalOpen(true);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setModalMode('create');
                setModalOpen(true);
              }
            }}
            style={{
              width: '180px',
              minHeight: '210px',
              padding: '1.5rem 1rem',
              borderRadius: '24px',
              background: 'color-mix(in srgb, var(--accent) 4%, var(--surface2))',
              border: '1.5px solid color-mix(in srgb, var(--accent) 55%, var(--line))',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 6px 18px -4px color-mix(in srgb, var(--accent) 15%, transparent)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 28px -6px color-mix(in srgb, var(--accent) 30%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 55%, var(--line))';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 6px 18px -4px color-mix(in srgb, var(--accent) 15%, transparent)';
            }}
          >
            {/* (+) Icon Circle (Image 2 style) */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--accent) 16%, var(--surface))',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                transition: 'transform 0.2s ease',
              }}
            >
              <Plus size={26} strokeWidth={2.6} />
            </div>

            <div
              style={{
                fontSize: '0.96rem',
                fontWeight: 700,
                color: 'var(--accent)',
                marginBottom: '0.3rem',
              }}
            >
              Tạo dự án mới
            </div>

            <div style={{ fontSize: '0.76rem', color: 'var(--fg3)' }}>
              Khởi tạo đồ án nhóm
            </div>
          </div>

          {/* Card (🔑) Nhập mã mời tham gia */}
          <div
            onClick={() => {
              setModalMode('join');
              setModalOpen(true);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setModalMode('join');
                setModalOpen(true);
              }
            }}
            style={{
              width: '180px',
              minHeight: '210px',
              padding: '1.5rem 1rem',
              borderRadius: '24px',
              background: 'var(--surface2)',
              border: '1.5px solid var(--line)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 6px 18px -4px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--fg3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {/* Key icon Circle */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--m2) 14%, var(--surface))',
                color: 'var(--m2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <KeyRound size={24} strokeWidth={2.2} />
            </div>

            <div
              style={{
                fontSize: '0.96rem',
                fontWeight: 700,
                color: 'var(--fg)',
                marginBottom: '0.3rem',
              }}
            >
              Nhập mã mời
            </div>

            <div style={{ fontSize: '0.76rem', color: 'var(--fg3)' }}>
              Vào nhóm đã có sẵn
            </div>
          </div>
        </div>

        {/* Info hint (Matching Image 2 text: "You can add a child anytime from the settings.") */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.82rem',
            color: 'var(--fg3)',
            marginBottom: '1.75rem',
          }}
        >
          <Info size={15} style={{ flexShrink: 0 }} />
          <span>Bạn có thể tạo nhiều đồ án hoặc mời thêm bạn cùng nhóm bất kỳ lúc nào.</span>
        </div>

        {/* Action Button: "Tiếp tục" / "Bắt đầu ngay" (Matching Image 2 Pill button) */}
        <div>
          <button
            type="button"
            onClick={handleContinue}
            style={{
              padding: '0.72rem 2.5rem',
              borderRadius: '999px',
              fontSize: '0.92rem',
              fontWeight: 700,
              background: 'var(--fg)',
              color: 'var(--bg)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 24px -6px rgba(0,0,0,0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
          >
            {selectedTeamId ? 'Vào bảng điều khiển' : 'Tiếp tục'}
          </button>
        </div>

        {/* Pagination Dots indicator (Matching Image 2: three dots at bottom) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            marginTop: '2.5rem',
          }}
          aria-hidden="true"
        >
          <span style={{ width: '16px', height: '4px', borderRadius: '999px', background: 'var(--fg)' }} />
          <span style={{ width: '16px', height: '4px', borderRadius: '999px', background: 'var(--fg)' }} />
          <span style={{ width: '16px', height: '4px', borderRadius: '999px', background: 'var(--line)' }} />
        </div>
      </div>

      {/* Existing CreateProjectModal (Image 3) */}
      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
      />
    </div>
  );
};
