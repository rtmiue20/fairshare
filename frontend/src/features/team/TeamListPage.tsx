import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from './NoProjectState';
import { CreateProjectModal } from './CreateProjectModal';
import { TeamMembersModal } from './TeamMembersModal';
import { TaskCalendar } from './TaskCalendar';
import { AllTasksSection } from './AllTasksSection';
import { FolderPlus, Users, BarChart3, Award, Key, ArrowLeft, ChevronRight, FolderKanban } from 'lucide-react';

export const TeamListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const { teams, activeTeamId, fetchTeams, setActiveTeamId, initialized } = useProjectStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');
  const [membersModalOpen, setMembersModalOpen] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (urlTeamId && !isNaN(urlTeamId) && urlTeamId !== activeTeamId) {
      setActiveTeamId(urlTeamId);
    }
  }, [urlTeamId, activeTeamId, setActiveTeamId]);

  const currentTeam = teams.find((t) => t.id === activeTeamId) || teams[0];

  if (initialized && teams.length === 0) {
    return <NoProjectState />;
  }

  return (
    <div className="page pad project-tab-page" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Page Header: Project Information & Right-Aligned Actions (Matching Alerts Page) ── */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--fg3)', marginBottom: '8px' }}>
          <Link to="/" style={{ color: 'var(--fg3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#818cf8', fontWeight: 500 }}>Dự án nhóm</span>
        </div>

        <div
          className="project-page-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ flex: '1 1 340px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#6366f1',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                <FolderKanban size={13} />
                Dự án đồ án · {currentTeam?.courseName || currentTeam?.name || 'Đồ án nhóm'}
              </span>

              {currentTeam?.inviteCode && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontFamily: 'var(--f-mono)',
                    color: 'var(--accent)',
                    background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                  }}
                  title="Chia sẻ mã này cho bạn bè để tham gia nhóm"
                >
                  <Key size={12} /> Mã mời: {currentTeam.inviteCode}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '26px', margin: '8px 0 6px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)', lineHeight: 1.25 }}>
              {currentTeam?.name || 'Chi tiết dự án'}
            </h1>
            <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '58ch', fontSize: '13.5px', lineHeight: 1.5 }}>
              {currentTeam?.description || 'Nền tảng đo lường và minh bạch hóa mức đóng góp trong đồ án nhóm.'}
            </p>
          </div>

          {/* Right-aligned Action Buttons matching AlertList header */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', marginLeft: 'auto', flexShrink: 0 }}>
            {teams.length > 1 && (
              <select
                aria-label="Chọn nhóm dự án"
                value={currentTeam?.id || ''}
                onChange={(e) => setActiveTeamId(Number(e.target.value))}
                className="sr-only"
                tabIndex={-1}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            {currentTeam && (
              <>
                <button
                  type="button"
                  onClick={() => setMembersModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Quản lý thành viên & Mã mời"
                >
                  <Users size={14} />
                  <span>Thành viên</span>
                </button>

                <Link
                  to="/peer-review"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    border: '1px solid var(--line)',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Award size={14} />
                  <span>Chấm chéo</span>
                </Link>

                <Link
                  to={`/dashboard?teamId=${currentTeam.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: 'var(--surface)',
                    color: 'var(--fg)',
                    border: '1px solid var(--line)',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <BarChart3 size={14} />
                  <span>Dashboard</span>
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setModalMode('create');
                setModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 18px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 18px -4px rgba(79, 70, 229, 0.45)',
                transition: 'all 0.15s ease',
              }}
            >
              <FolderPlus size={14} />
              <span>+ Tạo dự án</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: TASK CALENDAR (Image 1 Top Layout) ── */}
      <TaskCalendar teamId={currentTeam?.id} projectName={currentTeam?.name} />

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
