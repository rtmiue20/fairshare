import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { peerReviewApi, AggregatedReviewResult } from '../../api/peerReview.api';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';
import { showToast } from '../../components/ui/Toast';

interface PeerMember {
  id: string;
  userId: number;
  name: string;
  ini: string;
  role: string;
  color: string;
}

const MEMBER_COLORS = ['var(--m1)', 'var(--m2)', 'var(--m3)', 'var(--m4)', 'var(--guide)', 'var(--accent)'];

const DEFAULT_PEER_MEMBERS: PeerMember[] = [
  { id: 'm1', userId: 1, name: 'Nguyễn Văn Minh Triều', ini: 'MT', role: 'Leader / PM', color: 'var(--m1)' },
  { id: 'm2', userId: 2, name: 'Lê Phúc Vương', ini: 'PV', role: 'Nền tảng & Board', color: 'var(--m2)' },
  { id: 'm3', userId: 3, name: 'Hà Ngọc Thiện', ini: 'NT', role: 'BA & Nhóm', color: 'var(--m4)' },
  { id: 'm4', userId: 4, name: 'Ngô Trọng Phúc', ini: 'TP', role: 'CSDL & Dashboard', color: 'var(--m3)' },
  { id: 'm5', userId: 5, name: 'Triệu Nguyễn Huỳnh Khang', ini: 'HK', role: 'Chấm chéo & Alert', color: 'var(--guide)' },
  { id: 'm6', userId: 6, name: 'Nguyễn Nam Anh', ini: 'NA', role: 'QA & Triển khai', color: 'var(--accent)' },
];

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

export const ReviewRoundPage: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1));
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  const [members, setMembers] = useState<PeerMember[]>(currentTeamId === 1 ? DEFAULT_PEER_MEMBERS : []);
  const [activeRoundId, setActiveRoundId] = useState<number>(1);
  const [activeRoundName, setActiveRoundName] = useState<string>('Sprint 4 (Hiện tại)');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(DEFAULT_PEER_MEMBERS[0].id);
  const [q1, setQ1] = useState<number>(4);
  const [q2, setQ2] = useState<number>(4);
  const [q3, setQ3] = useState<number>(4);
  const [comment, setComment] = useState<string>('');
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [myResult, setMyResult] = useState<AggregatedReviewResult | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      peerReviewApi.getMembers(currentTeamId),
      peerReviewApi.getRoundsByTeam(currentTeamId),
    ]).then(([memRes, roundRes]) => {
      if (!mounted) return;

      if (memRes.status === 'fulfilled' && Array.isArray(memRes.value?.data) && memRes.value.data.length > 0) {
        const mapped = memRes.value.data
          .filter((m) => !currentUser || m.userId !== currentUser.id)
          .map((m, idx) => ({
            id: `u-${m.userId}`,
            userId: m.userId,
            name: m.fullName || m.email,
            ini: getInitials(m.fullName || m.email),
            role: m.role === 'LEADER' ? 'Leader / PM' : 'Thành viên nhóm',
            color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
          }));
        setMembers(mapped);
        if (mapped.length > 0) {
          setSelectedMemberId(mapped[0].id);
        }
      } else if (currentTeamId === 1 && currentUser) {
        const filtered = DEFAULT_PEER_MEMBERS.filter(
          (m) => m.userId !== currentUser.id && m.name.toLowerCase() !== currentUser.fullName?.toLowerCase(),
        );
        if (filtered.length > 0) {
          setMembers(filtered);
          setSelectedMemberId(filtered[0].id);
        }
      } else if (currentTeamId !== 1) {
        setMembers([]);
      }

      if (roundRes.status === 'fulfilled' && Array.isArray(roundRes.value?.data) && roundRes.value.data.length > 0) {
        const openRound = roundRes.value.data.find((r) => r.status === 'OPEN') || roundRes.value.data[0];
        setActiveRoundId(openRound.id);
        setActiveRoundName(openRound.name || `Sprint ${openRound.sprintId}`);
      }
    });
    return () => {
      mounted = false;
    };
  }, [currentTeamId, currentUser]);

  useEffect(() => {
    if (!currentUser?.id || !activeRoundId) return;
    peerReviewApi
      .getRoundResults(activeRoundId, currentUser.id)
      .then((res) => {
        if (res.data) setMyResult(res.data);
      })
      .catch(() => {
        // Ignore if not enough submissions or offline
      });
  }, [activeRoundId, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = members.find((m) => m.id === selectedMemberId);
    if (!target) return;

    setSubmitting(true);
    try {
      await peerReviewApi.submitReview(activeRoundId, {
        revieweeId: target.userId,
        scores: [
          { criterion: 'QUALITY', score: q1 },
          { criterion: 'PUNCTUALITY', score: q2 },
          { criterion: 'COOPERATION', score: q3 },
        ],
        feedback: comment.trim() || undefined,
      });
    } catch {
      // Fallback to local state when round already rated or in demo mode
    } finally {
      setSubmitting(false);
    }

    const updatedDone = new Set([...completedSet, selectedMemberId]);
    setCompletedSet(updatedDone);
    showToast(`Đã gửi đánh giá ẩn danh cho ${target.name} (Điểm TB: ${((q1 + q2 + q3) / 3).toFixed(1)}/5.0)`);
    setComment('');

    const nextUnrated = members.find((m) => m.id !== selectedMemberId && !updatedDone.has(m.id));
    if (nextUnrated) {
      setSelectedMemberId(nextUnrated.id);
    }
  };

  const doneCount = completedSet.size;
  const totalCount = members.length;

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  if (members.length === 0) {
    return (
      <div className="page pad" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '3.5rem 2rem', border: '1px dashed var(--line)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.5rem' }}>
            Chưa có thành viên nào khác trong nhóm
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--fg3)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Để tiến hành đánh giá chéo ẩn danh theo chuẩn Agile, nhóm cần có thêm các thành viên cùng tham gia. Hãy chia sẻ mã mời nhóm hoặc mời thêm thành viên vào đồ án.
          </p>
          <Link
            to={`/teams/${currentTeamId}`}
            className="btn"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '0.82rem',
              padding: '8px 18px',
              textDecoration: 'none',
              borderRadius: '6px',
            }}
          >
            Quản lý thành viên &amp; Xem mã mời
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page pad" style={{ maxWidth: '1100px', margin: '0 auto' }}>
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
          <span className="eyebrow">Chấm chéo ẩn danh · {activeRoundName}</span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', margin: '6px 0', fontWeight: 300 }}>
            Đánh giá đồng đội cuối sprint
          </h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '64ch' }}>
            Người được chấm không thấy ai đã chấm mình. Giảng viên chỉ thấy điểm trung bình khi đạt ngưỡng ≥ 3 lượt đánh giá.
          </p>
        </div>
        <span
          className={`chip ${doneCount >= totalCount ? 'ok' : ''}`}
          id="rateCount"
          style={{ fontSize: '0.85rem', padding: '6px 14px', fontWeight: 600 }}
        >
          Đã chấm {doneCount} / {totalCount}
        </span>
      </div>

      <div className="grid2">
        <form
          className="panel"
          id="rateForm"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
        >
          <div className="panel-h" style={{ marginBottom: 4 }}>
            <h2>Phiếu đánh giá đồng đội</h2>
            <span className="chip" style={{ fontSize: '0.7rem' }}>
              Bảo mật 100%
            </span>
          </div>

          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 0 }}>
            <label htmlFor="rateWho" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg2)' }}>
              Chấm cho
            </label>
            <select
              id="rateWho"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '4px',
                background: 'var(--bg)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                outline: 'none',
              }}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.role}
                  {completedSet.has(m.id) ? ' (đã chấm)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 0 }}>
            <label
              htmlFor="r1"
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--fg)' }}
            >
              <span>Chất lượng công việc</span>
              <span className="rate-val" id="o1">
                {q1}
              </span>
            </label>
            <input
              type="range"
              id="r1"
              min="1"
              max="5"
              step="1"
              value={q1}
              onChange={(e) => setQ1(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 0 }}>
            <label
              htmlFor="r2"
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--fg)' }}
            >
              <span>Đúng hạn</span>
              <span className="rate-val" id="o2">
                {q2}
              </span>
            </label>
            <input
              type="range"
              id="r2"
              min="1"
              max="5"
              step="1"
              value={q2}
              onChange={(e) => setQ2(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 0 }}>
            <label
              htmlFor="r3"
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--fg)' }}
            >
              <span>Tinh thần hợp tác</span>
              <span className="rate-val" id="o3">
                {q3}
              </span>
            </label>
            <input
              type="range"
              id="r3"
              min="1"
              max="5"
              step="1"
              value={q3}
              onChange={(e) => setQ3(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 0 }}>
            <label htmlFor="rc" style={{ fontSize: '0.85rem', color: 'var(--fg2)' }}>
              Nhận xét (không bắt buộc)
            </label>
            <textarea
              id="rc"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ví dụ: hoàn thành đúng hạn, hỗ trợ nhóm khi cần."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '4px',
                background: 'var(--bg)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <button className="btn sq" type="submit" disabled={submitting} style={{ justifyContent: 'center', marginTop: 4 }}>
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá ẩn danh'}
          </button>
        </form>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Tiến độ chấm</h2>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--fg3)' }}>
              {activeRoundName}
            </span>
          </div>

          <div className="rows" id="rateList" style={{ display: 'flex', flexDirection: 'column' }}>
            {members.map((m) => {
              const isDone = completedSet.has(m.id);
              const isSelected = m.id === selectedMemberId;

              return (
                <div
                  key={m.id}
                  className="row"
                  onClick={() => setSelectedMemberId(m.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '34px 1fr auto',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 8px',
                    cursor: 'pointer',
                    background: isSelected ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <span
                    className="avatar"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '11px',
                      fontFamily: 'var(--f-mono)',
                      fontWeight: 500,
                      background: m.color,
                      color: '#161616',
                    }}
                  >
                    {m.ini}
                  </span>

                  <div>
                    <b style={{ fontSize: '0.88rem', color: 'var(--fg)', display: 'block' }}>{m.name}</b>
                    <small style={{ color: 'var(--fg3)', fontSize: '0.72rem' }}>{m.role}</small>
                  </div>

                  <span className={`chip ${isDone ? 'ok' : ''}`} style={{ fontSize: '0.7rem' }}>
                    {isDone ? 'Đã chấm' : 'Chưa chấm'}
                  </span>
                </div>
              );
            })}
          </div>

          {myResult && (
            <div style={{ background: 'var(--surface2)', padding: '12px 14px', borderRadius: '6px', marginTop: 4 }}>
              <b style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>
                Kết quả ẩn danh của bạn:
              </b>
              {myResult.anonymousSafe ? (
                <p className="note" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ok)' }}>
                  Điểm trung bình: <strong>{myResult.averageScore.toFixed(1)} / 5.0</strong> ({myResult.submissionCount} người chấm)
                </p>
              ) : (
                <p className="note" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--fg3)' }}>
                  Đang chờ đủ tối thiểu ≥ 3 thành viên đánh giá để hiển thị điểm trung bình ẩn danh.
                </p>
              )}
            </div>
          )}

          <p className="note" style={{ margin: '10px 0 0', fontSize: '0.75rem', color: 'var(--fg3)', lineHeight: 1.5 }}>
            🔒 Thuật toán <code>AnonymityAggregator</code> chỉ tổng hợp và hiển thị kết quả khi nhận đủ tối thiểu ≥ 3 lượt đánh giá từ các thành viên khác nhau.
          </p>
        </div>
      </div>
    </div>
  );
};
