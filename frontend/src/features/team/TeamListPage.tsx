import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from './NoProjectState';
import { CreateProjectModal } from './CreateProjectModal';
import { TeamMembersModal } from './TeamMembersModal';
import { TaskCalendar } from './TaskCalendar';
import { AllTasksSection } from './AllTasksSection';
import { FolderPlus, Users, BarChart3, Award } from 'lucide-react';

export const TeamListPage: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, setActiveTeamId, initialized } = useProjectStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');
  const [membersModalOpen, setMembersModalOpen] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const currentTeam = teams.find((t) => t.id === activeTeamId) || teams[0];

  if (initialized && teams.length === 0) {
    return <NoProjectState />;
  }

  return (
    <div className="page pad project-tab-page" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Page Header: Project Information & Actions ── */}
      <div
        className="project-page-head"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '4px',
        }}
      >
        <div>
          <span className="eyebrow">Dự án đồ án · {currentTeam?.name || 'Đồ án nhóm'}</span>
          <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 42px)', margin: '4px 0 6px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
            {currentTeam?.name || 'Chi tiết dự án'}
          </h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '68ch', fontSize: '14px' }}>
            {currentTeam?.description || 'Nền tảng đo lường và minh bạch hóa mức đóng góp trong đồ án nhóm.'}
          </p>

          {currentTeam?.inviteCode && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  color: 'var(--accent)',
                  background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                }}
              >
                🔑 Mã mời: {currentTeam.inviteCode}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--fg3)' }}>
                (Chia sẻ mã này cho bạn bè để tham gia nhóm)
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {teams.length > 1 && (
            <select
              aria-label="Chọn nhóm dự án"
              value={currentTeam?.id || ''}
              onChange={(e) => setActiveTeamId(Number(e.target.value))}
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'var(--surface)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              setModalMode('create');
              setModalOpen(true);
            }}
            className="btn ghost sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '12px' }}
          >
            <FolderPlus size={14} />
            <span>+ Tạo dự án</span>
          </button>

          {currentTeam && (
            <>
              <button
                type="button"
                onClick={() => setMembersModalOpen(true)}
                className="btn ghost sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '12px', cursor: 'pointer' }}
                title="Quản lý thành viên & Mã mời"
              >
                <Users size={14} />
                <span>Thành viên</span>
              </button>
              <Link
                to="/peer-review"
                className="btn ghost sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '12px' }}
              >
                <Award size={14} />
                <span>Chấm chéo</span>
              </Link>
              <Link
                to={`/dashboard?teamId=${currentTeam.id}`}
                className="btn sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '12px' }}
              >
                <BarChart3 size={14} />
                <span>Dashboard</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── SECTION 1: TASK CALENDAR (Image 1 Top Layout) ── */}
      <TaskCalendar teamId={currentTeam?.id} />

      {/* ── SECTION 2: ALL TASK (Image 1 Bottom Layout) ── */}
      <AllTasksSection projectName={currentTeam?.name} teamId={currentTeam?.id} />

      {/* Modal tạo dự án */}
      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
      />

      {/* Modal Thành viên theo mẫu thiết kế */}
      {currentTeam && (
        <TeamMembersModal
          isOpen={membersModalOpen}
          onClose={() => setMembersModalOpen(false)}
          teamId={currentTeam.id}
          projectName={currentTeam.name}
          inviteCode={currentTeam.inviteCode}
          onMemberUpdated={fetchTeams}
        />
      )}
    </div>
  );
};
