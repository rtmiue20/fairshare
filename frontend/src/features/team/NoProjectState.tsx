import React, { useState } from 'react';
import { FolderPlus, KeyRound, Sparkles, ShieldCheck, Users, Kanban } from 'lucide-react';
import { CreateProjectModal } from './CreateProjectModal';

export interface NoProjectStateProps {
  title?: string;
  description?: string;
}

export const NoProjectState: React.FC<NoProjectStateProps> = ({
  title = 'Chào mừng bạn đến với FairShare!',
  description = 'Bạn chưa tham gia đồ án nhóm nào. Hãy tạo một dự án mới để phân công công việc cho thành viên, hoặc tham gia vào nhóm bằng mã mời từ bạn bè.',
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');

  return (
    <div className="page pad" style={{ maxWidth: '840px', margin: '40px auto' }}>
      <div
        className="panel"
        style={{
          textAlign: 'center',
          padding: '3.5rem 2rem',
          border: '1px dashed var(--line)',
          background: 'var(--surface)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'color-mix(in srgb, var(--accent) 15%, var(--surface2))',
            border: '1px solid color-mix(in srgb, var(--accent) 35%, var(--line))',
            color: 'var(--accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <Sparkles size={32} />
        </div>

        <h1
          style={{
            margin: '0 0 0.75rem',
            fontSize: 'clamp(1.4rem, 2.8vw, 1.85rem)',
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>

        <p
          style={{
            maxWidth: '560px',
            margin: '0 auto 2rem',
            color: 'var(--fg2)',
            fontSize: '0.88rem',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setModalMode('create');
              setModalOpen(true);
            }}
            className="btn sq"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', fontSize: '0.85rem' }}
          >
            <FolderPlus size={16} />
            <span>Tạo dự án mới</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode('join');
              setModalOpen(true);
            }}
            className="btn ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', fontSize: '0.85rem' }}
          >
            <KeyRound size={16} />
            <span>Tham gia bằng mã mời</span>
          </button>
        </div>

        {/* Feature highlight grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '3rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--line)',
            textAlign: 'left',
          }}
        >
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--surface2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
              <Kanban size={15} />
              <span>Kanban tự động</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--fg3)', lineHeight: 1.5 }}>
              Tự khởi tạo 4 cột chuẩn (To Do, In Progress, Review, Done) cho từng Sprint.
            </p>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--surface2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ok)', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
              <Users size={15} />
              <span>Phân công minh bạch</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--fg3)', lineHeight: 1.5 }}>
              Mời thành viên qua email và ghi nhận chính xác khối lượng đóng góp thực tế.
            </p>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--surface2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--m3)', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
              <ShieldCheck size={15} />
              <span>Chống Free-rider</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--fg3)', lineHeight: 1.5 }}>
              Đo lường đa chiều 4 tầng D1–D4 và chấm chéo bảo vệ dữ liệu theo NĐ 13/2023.
            </p>
          </div>
        </div>
      </div>

      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
      />
    </div>
  );
};

