import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { peerReviewApi } from '../../api/peerReview.api';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from './NoProjectState';
import { CreateProjectModal } from './CreateProjectModal';
import { FolderPlus, Kanban, Users, BarChart3 } from 'lucide-react';

interface SprintItem {
  id: number;
  n: string;
  t: string;
  d: string;
  p: number;
  st: string;
  c: 'ok' | 'acc' | '';
  cur?: boolean;
}

export const TeamListPage: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, setActiveTeamId, initialized } = useProjectStore();
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const currentTeam = teams.find((t) => t.id === activeTeamId) || teams[0];

  useEffect(() => {
    if (!currentTeam?.id) {
      setSprints([]);
      return;
    }

    let mounted = true;
    peerReviewApi
      .getSprints(currentTeam.id)
      .then((res) => {
        if (!mounted) return;
        if (Array.isArray(res.data) && res.data.length > 0) {
          const mapped: SprintItem[] = res.data.map((sp, idx) => {
            const isCur = sp.status === 'ACTIVE' || (idx === 0 && res.data.length === 1);
            const isDone = sp.status === 'CLOSED';
            return {
              id: sp.id,
              n: `S${idx + 1}`,
              t: sp.name || `Sprint ${idx + 1}`,
              d: sp.startDate && sp.endDate
                ? `Thời gian thực hiện: ${sp.startDate} → ${sp.endDate}`
                : 'Theo dõi tiến độ và hoạt động công việc',
              p: isDone ? 100 : isCur ? 75 : 0,
              st: isDone ? 'Hoàn thành' : isCur ? 'Đang chạy' : 'Sắp tới',
              c: isDone ? 'ok' : isCur ? 'acc' : '',
              cur: isCur,
            };
          });
          setSprints(mapped);
        } else {
          setSprints([]);
        }
      })
      .catch(() => {
        if (mounted) setSprints([]);
      });

    return () => {
      mounted = false;
    };
  }, [currentTeam?.id]);

  if (initialized && teams.length === 0) {
    return <NoProjectState />;
  }

  return (
    <div className="page pad" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div
        className="page-head"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '24px',
        }}
      >
        <div>
          <span className="eyebrow">Dự án đồ án · {currentTeam?.name || 'Đồ án nhóm'}</span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', margin: '6px 0', fontWeight: 300 }}>
            {currentTeam?.name || 'Chi tiết dự án'}
          </h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '64ch' }}>
            {currentTeam?.description || 'Nền tảng đo lường và minh bạch hóa mức đóng góp trong đồ án nhóm.'}
          </p>
          {currentTeam?.inviteCode && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="chip" style={{ fontFamily: 'var(--f-mono)', color: 'var(--accent)' }}>
                🔑 Mã mời: {currentTeam.inviteCode}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--fg3)' }}>
                (Chia sẻ mã này cho bạn bè để tham gia nhóm)
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {teams.length > 1 && (
            <select
              aria-label="Chọn nhóm dự án"
              value={currentTeam?.id || ''}
              onChange={(e) => setActiveTeamId(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--surface)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                fontSize: '13px',
                fontWeight: 600,
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <FolderPlus size={13} />
            <span>+ Tạo dự án</span>
          </button>

          {currentTeam && (
            <>
              <Link to={`/teams/${currentTeam.id}`} className="btn ghost sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={13} />
                <span>Thành viên</span>
              </Link>
              <Link to={`/board?teamId=${currentTeam.id}`} className="btn sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Kanban size={13} />
                <span>Kanban Board →</span>
              </Link>
              <Link to={`/dashboard?teamId=${currentTeam.id}`} className="btn ghost sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <BarChart3 size={13} />
                <span>Dashboard</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Lộ trình Sprint ({sprints.length} Sprint)</span>
          {currentTeam && (
            <span className="chip" style={{ color: 'var(--ok)' }}>
              ● Đang theo dõi
            </span>
          )}
        </div>

        {sprints.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--fg3)' }}>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Chưa có Sprint nào trong dự án này.</p>
          </div>
        ) : (
          <div className="rows" id="sprints" style={{ display: 'flex', flexDirection: 'column' }}>
            {sprints.map((s) => (
              <div
                key={s.id || s.n}
                className={`row sprint ${s.cur ? 'cur' : ''}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px minmax(0, 1fr) 150px 90px',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <span
                  className="n"
                  style={{
                    fontFamily: 'var(--f-display)',
                    fontSize: '13px',
                    color: s.cur ? 'var(--accent)' : 'var(--fg3)',
                    fontWeight: 700,
                  }}
                >
                  {s.n}
                </span>

                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: 'var(--fg)' }}>{s.t}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--fg2)' }}>{s.d}</p>
                </div>

                <div className="bar" style={{ height: '6px', background: 'var(--surface2)', position: 'relative', borderRadius: '3px', overflow: 'hidden' }}>
                  <i
                    style={{
                      position: 'absolute',
                      inset: '0 auto 0 0',
                      width: `${s.p}%`,
                      background: s.c === 'ok' ? 'var(--ok)' : 'var(--accent)',
                      height: '100%',
                    }}
                  />
                </div>

                <span className={`chip ${s.c}`} style={{ fontSize: '0.72rem', textAlign: 'center' }}>
                  {s.st}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
      />
    </div>
  );
};
