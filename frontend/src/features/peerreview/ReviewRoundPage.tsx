import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  peerReviewApi,
  ReviewRound,
  AggregatedReviewResult,
  ReviewSprint,
  ReviewCriterion,
} from '../../api/peerReview.api';
import { teamApi } from '../../api/team.api';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';
import { showToast } from '../../components/ui/Toast';
import {
  ShieldCheck,
  ShieldAlert,
  Star,
  CheckCircle,
  Users,
  ArrowLeft,
  Send,
  Sparkles,
  Lock,
  MessageSquare,
  Award,
  Plus,
  Play,
  Square,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';

interface TeamMemberItem {
  id: number;
  name: string;
  email: string;
  role: string;
  isLeader: boolean;
  color: string;
}

const MEMBER_COLORS = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
];

function getInitials(fullName: string): string {
  if (!fullName) return 'FS';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

const CRITERIA_DEFINITIONS: {
  key: ReviewCriterion;
  label: string;
  desc: string;
  options: { score: number; label: string; detail: string }[];
}[] = [
  {
    key: 'QUALITY',
    label: 'Chất lượng công việc & Kết quả kỹ thuật',
    desc: 'Độ hoàn thiện, tính ổn định của code/thiết kế và ít phát sinh lỗi',
    options: [
      { score: 1, label: 'Rất kém', detail: 'Nhiều lỗi nghiêm trọng, chưa đạt yêu cầu' },
      { score: 2, label: 'Cần cải thiện', detail: 'Chưa hoàn thiện, cần nhóm hỗ trợ nhiều' },
      { score: 3, label: 'Đạt chuẩn', detail: 'Tính năng ổn định, hoàn thành đúng đặc tả' },
      { score: 4, label: 'Rất tốt', detail: 'Code sạch, kiểm thử kỹ, ít phát sinh lỗi' },
      { score: 5, label: 'Xuất sắc', detail: 'Vượt kỳ vọng, kiến trúc tối ưu, chất lượng cao' },
    ],
  },
  {
    key: 'PUNCTUALITY',
    label: 'Tiến độ & Tinh thần đúng hạn',
    desc: 'Khả năng bàn giao task đúng hạn theo cam kết trong Sprint',
    options: [
      { score: 1, label: 'Trễ hạn', detail: 'Trễ hạn nghiêm trọng, ảnh hưởng tiến độ sprint' },
      { score: 2, label: 'Thường chậm', detail: 'Cần nhắc nhở và đôn đốc liên tục' },
      { score: 3, label: 'Đúng hạn', detail: 'Bàn giao công việc đúng kế hoạch đã thỏa thuận' },
      { score: 4, label: 'Nhanh nhẹn', detail: 'Hoàn thành trước deadline, chủ động báo cáo' },
      { score: 5, label: 'Vượt tiến độ', detail: 'Bàn giao sớm, chủ động hỗ trợ giải quyết blocker' },
    ],
  },
  {
    key: 'COOPERATION',
    label: 'Tinh thần hợp tác & Giao tiếp Agile',
    desc: 'Tham gia họp Scrum, phối hợp với đồng đội và xử lý phản hồi',
    options: [
      { score: 1, label: 'Thiếu hợp tác', detail: 'Khó liên lạc, không phản hồi tin nhắn' },
      { score: 2, label: 'Hạn chế', detail: 'Làm việc riêng lẻ, ít chia sẻ thông tin' },
      { score: 3, label: 'Hợp tác tốt', detail: 'Tham gia đầy đủ họp nhóm, giao tiếp văn minh' },
      { score: 4, label: 'Nhiệt tình', detail: 'Chủ động phối hợp, lắng nghe góp ý xây dựng' },
      { score: 5, label: 'Cột trụ nhóm', detail: 'Tinh thần đồng đội cao, gắn kết và truyền cảm hứng' },
    ],
  },
];

export const ReviewRoundPage: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1));
  const { user: currentUser } = useAuthStore();

  // Data states
  const [rounds, setRounds] = useState<ReviewRound[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<number>(0);
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [sprints, setSprints] = useState<ReviewSprint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Evaluator (allows demo switcher or defaults to currentUser)
  const [currentEvaluatorId, setCurrentEvaluatorId] = useState<number>(currentUser?.id || 109);

  // View tabs
  const [activeTab, setActiveTab] = useState<'form' | 'results'>('form');

  // Review Form States
  const [selectedRevieweeId, setSelectedRevieweeId] = useState<number>(0);
  const [qualityScore, setQualityScore] = useState<number>(5);
  const [punctualityScore, setPunctualityScore] = useState<number>(5);
  const [cooperationScore, setCooperationScore] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completedReviewees, setCompletedReviewees] = useState<Set<number>>(new Set());

  // Results State
  const [resultsMap, setResultsMap] = useState<Record<number, AggregatedReviewResult>>({});
  const [loadingResults, setLoadingResults] = useState<boolean>(false);
  const [selectedResultMemberId, setSelectedResultMemberId] = useState<number>(0);

  // Create Round Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newRoundSprintId, setNewRoundSprintId] = useState<number>(0);
  const [newRoundName, setNewRoundName] = useState<string>('');
  const [creatingRound, setCreatingRound] = useState<boolean>(false);

  // Fetch initial teams
  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  // Load team members and review rounds
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [roundRes, sprintRes, memberRes] = await Promise.allSettled([
        peerReviewApi.getRoundsByTeam(currentTeamId),
        peerReviewApi.getSprints(currentTeamId),
        peerReviewApi.getMembers(currentTeamId),
      ]);

      // 1. Members mapping with robust fallback
      let loadedMembers: TeamMemberItem[] = [];
      if (memberRes.status === 'fulfilled' && Array.isArray(memberRes.value?.data) && memberRes.value.data.length > 0) {
        loadedMembers = memberRes.value.data.map((m, idx) => ({
          id: m.userId,
          name: m.fullName || m.email,
          email: m.email,
          role: m.role === 'LEADER' ? 'Trưởng nhóm (Team Leader)' : 'Thành viên nhóm (Developer)',
          isLeader: m.role === 'LEADER',
          color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
        }));
      } else {
        // Fallback to teamApi.getTeamById
        try {
          const fallbackTeam = await teamApi.getTeamById(currentTeamId);
          if (fallbackTeam?.data?.members && Array.isArray(fallbackTeam.data.members)) {
            loadedMembers = fallbackTeam.data.members.map((m, idx) => {
              const raw = m as unknown as { userId?: number; fullName?: string };
              const uid = m.user?.id ?? raw.userId ?? m.id;
              const uname = m.user?.fullName ?? raw.fullName ?? m.user?.email ?? `Thành viên #${uid}`;
              return {
                id: uid,
                name: uname,
                email: m.user?.email || `user${uid}@fairshare.io`,
                role: m.role === 'LEADER' ? 'Trưởng nhóm (Team Leader)' : 'Thành viên nhóm',
                isLeader: m.role === 'LEADER',
                color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
              };
            });
          }
        } catch {
          // ignore fallback error
        }
      }

      setMembers(loadedMembers);

      // Set evaluator
      if (currentUser?.id && loadedMembers.some((m) => m.id === currentUser.id)) {
        setCurrentEvaluatorId(currentUser.id);
      } else if (loadedMembers.length > 0 && !loadedMembers.some((m) => m.id === currentEvaluatorId)) {
        setCurrentEvaluatorId(loadedMembers[0].id);
      }

      // 2. Sprints
      if (sprintRes.status === 'fulfilled' && Array.isArray(sprintRes.value?.data)) {
        setSprints(sprintRes.value.data);
      }

      // 3. Rounds
      if (roundRes.status === 'fulfilled' && Array.isArray(roundRes.value?.data) && roundRes.value.data.length > 0) {
        setRounds(roundRes.value.data);
        const openRound = roundRes.value.data.find((r) => r.status === 'OPEN') || roundRes.value.data[0];
        setActiveRoundId(openRound.id);
      } else {
        setRounds([]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentTeamId, currentUser?.id, currentEvaluatorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Current active round object
  const activeRound = useMemo(() => {
    return rounds.find((r) => r.id === activeRoundId) || rounds[0];
  }, [rounds, activeRoundId]);

  // Evaluator object
  const currentEvaluator = useMemo(() => {
    return members.find((m) => m.id === currentEvaluatorId) || members[0];
  }, [members, currentEvaluatorId]);

  const isEvaluatorLeader = currentEvaluator?.isLeader ?? false;

  // Teammates to review (Anti-Self-Review: strictly excludes currentEvaluatorId)
  const teammatesToReview = useMemo(() => {
    return members.filter((m) => m.id !== currentEvaluatorId);
  }, [members, currentEvaluatorId]);

  // Automatically select the first candidate when candidates change
  useEffect(() => {
    if (teammatesToReview.length > 0) {
      if (!teammatesToReview.some((m) => m.id === selectedRevieweeId)) {
        setSelectedRevieweeId(teammatesToReview[0].id);
      }
    } else {
      setSelectedRevieweeId(0);
    }
  }, [teammatesToReview, selectedRevieweeId]);

  // Selected Reviewee object
  const selectedReviewee = useMemo(() => {
    return members.find((m) => m.id === selectedRevieweeId) || teammatesToReview[0];
  }, [members, selectedRevieweeId, teammatesToReview]);

  // Auto-fill new round sprint ID when sprints change
  useEffect(() => {
    if (sprints.length > 0) {
      const activeSprint = sprints.find((s) => s.status === 'ACTIVE') || sprints[0];
      setNewRoundSprintId(activeSprint.id);
      setNewRoundName(`Đánh giá chéo ${activeSprint.name}`);
    }
  }, [sprints]);

  // Reset form when changing reviewee
  useEffect(() => {
    setQualityScore(5);
    setPunctualityScore(5);
    setCooperationScore(5);
    setFeedbackText('');
  }, [selectedRevieweeId]);

  // Fetch aggregated results for all members when activeRoundId changes or results tab is active
  const loadAggregatedResults = useCallback(async () => {
    if (!activeRoundId || members.length === 0) return;
    setLoadingResults(true);
    const newMap: Record<number, AggregatedReviewResult> = {};

    await Promise.allSettled(
      members.map(async (m) => {
        try {
          const res = await peerReviewApi.getRoundResults(activeRoundId, m.id);
          if (res?.data) {
            newMap[m.id] = res.data;
          }
        } catch {
          // ignore individual fetch errors
        }
      })
    );

    setResultsMap(newMap);
    setLoadingResults(false);

    if (members.length > 0 && !selectedResultMemberId) {
      setSelectedResultMemberId(members[0].id);
    }
  }, [activeRoundId, members, selectedResultMemberId]);

  useEffect(() => {
    if (activeRoundId && members.length > 0) {
      loadAggregatedResults();
    }
  }, [activeRoundId, members.length, loadAggregatedResults]);

  // Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoundId || !selectedReviewee) return;

    if (activeRound?.status !== 'OPEN') {
      showToast('Đợt chấm chéo này hiện không mở để gửi đánh giá.');
      return;
    }

    setSubmitting(true);
    try {
      await peerReviewApi.submitReview(activeRoundId, {
        revieweeId: selectedReviewee.id,
        scores: [
          { criterion: 'QUALITY', score: qualityScore },
          { criterion: 'PUNCTUALITY', score: punctualityScore },
          { criterion: 'COOPERATION', score: cooperationScore },
        ],
        feedback: feedbackText.trim() || undefined,
      });

      const updatedSet = new Set([...completedReviewees, selectedReviewee.id]);
      setCompletedReviewees(updatedSet);

      const avgScore = ((qualityScore + punctualityScore + cooperationScore) / 3).toFixed(1);
      showToast(`Đã gửi đánh giá ẩn danh cho ${selectedReviewee.name} (Điểm TB: ${avgScore}/5.0)`);
      setFeedbackText('');

      // Auto advance to next unrated teammate
      const nextUnrated = teammatesToReview.find((m) => m.id !== selectedReviewee.id && !updatedSet.has(m.id));
      if (nextUnrated) {
        setSelectedRevieweeId(nextUnrated.id);
      }

      // Refresh results
      loadAggregatedResults();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Lỗi khi gửi đánh giá.';
      showToast(msg || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Leader Actions: Open / Close Round
  const handleOpenRound = async () => {
    if (!activeRoundId) return;
    try {
      await peerReviewApi.openRound(activeRoundId);
      showToast(`Đã mở đợt chấm: ${activeRound?.name}`);
      loadData();
    } catch {
      showToast('Không thể mở đợt chấm. Chỉ Trưởng nhóm có quyền thao tác.');
    }
  };

  const handleCloseRound = async () => {
    if (!activeRoundId) return;
    if (!window.confirm(`Bạn có chắc chắn muốn đóng đợt chấm "${activeRound?.name}" và khóa nhận bài?`)) return;
    try {
      await peerReviewApi.closeRound(activeRoundId);
      showToast(`Đã đóng đợt chấm và hoàn tất tổng hợp điểm ẩn danh.`);
      loadData();
    } catch {
      showToast('Không thể đóng đợt chấm. Chỉ Trưởng nhóm có quyền thao tác.');
    }
  };

  // Leader Action: Create Round
  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundSprintId || !newRoundName.trim()) return;

    setCreatingRound(true);
    try {
      await peerReviewApi.createRound(newRoundSprintId, {
        name: newRoundName.trim(),
      });
      showToast(`Đã khởi tạo đợt chấm mới: ${newRoundName}`);
      setShowCreateModal(false);
      loadData();
    } catch {
      showToast('Không thể tạo đợt chấm chéo mới. Vui lòng kiểm tra quyền hạn.');
    } finally {
      setCreatingRound(false);
    }
  };

  // Calculated average of current form
  const currentFormAverage = useMemo(() => {
    return ((qualityScore + punctualityScore + cooperationScore) / 3).toFixed(1);
  }, [qualityScore, punctualityScore, cooperationScore]);

  // Selected Result Member Data
  const activeResult = resultsMap[selectedResultMemberId] || null;

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  return (
    <div className="page pad" style={{ maxWidth: '1240px', margin: '0 auto', color: '#f8fafc' }}>
      {/* 1. Header & Breadcrumb */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#818cf8', fontWeight: 500 }}>Chấm chéo ẩn danh (Peer Review 360°)</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
                Đánh giá chéo đồng đội Agile
              </h1>
              {activeRound && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: activeRound.status === 'OPEN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    color: activeRound.status === 'OPEN' ? '#34d399' : '#94a3b8',
                    border: `1px solid ${activeRound.status === 'OPEN' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: activeRound.status === 'OPEN' ? '#10b981' : '#94a3b8',
                    }}
                  />
                  {activeRound.status === 'OPEN' ? 'Đang mở đánh giá' : 'Đợt chấm đã đóng'}
                </span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#94a3b8', maxWidth: '780px', lineHeight: 1.5 }}>
              Thuật toán tổng hợp K-Anonymity (Nghị định 13/2023/NĐ-CP): Điểm trung bình và nhận xét chỉ được giải mã khi đạt tối thiểu ≥ 3 lượt đánh giá để bảo vệ danh tính tuyệt đối.
            </p>
          </div>

          {/* Action buttons (Leader controls & Create round) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isEvaluatorLeader && activeRound?.status === 'OPEN' && (
              <button
                onClick={handleCloseRound}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Square size={14} /> Đóng đợt chấm
              </button>
            )}

            {isEvaluatorLeader && activeRound?.status === 'DRAFT' && (
              <button
                onClick={handleOpenRound}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Play size={14} /> Mở đợt chấm
              </button>
            )}

            {isEvaluatorLeader && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> Tạo đợt chấm mới
              </button>
            )}

            <button
              onClick={() => {
                loadData();
                loadAggregatedResults();
              }}
              title="Làm mới dữ liệu"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                padding: '7px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Filter & Context Bar (Rounds & Evaluator Selector) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          padding: '14px 18px',
          backgroundColor: '#121318',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          marginBottom: '20px',
        }}
      >
        {/* Dropdown 1: Round selection */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
            Đợt chấm chéo (Review Round):
          </label>
          <select
            value={activeRoundId}
            onChange={(e) => setActiveRoundId(Number(e.target.value))}
            style={{
              width: '100%',
              backgroundColor: '#0c0d12',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.status === 'OPEN' ? '(Đang mở)' : '(Đã đóng)'}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown 2: Evaluator identity switcher */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
            Đang chấm với tư cách (Người đánh giá):
          </label>
          <select
            value={currentEvaluatorId}
            onChange={(e) => {
              const newId = Number(e.target.value);
              setCurrentEvaluatorId(newId);
              setCompletedReviewees(new Set());
            }}
            style={{
              width: '100%',
              backgroundColor: '#0c0d12',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.role} {m.id === currentUser?.id ? '(Tài khoản của bạn)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: '#0c0d12',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '3px',
            }}
          >
            <button
              onClick={() => setActiveTab('form')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'form' ? '#6366f1' : 'transparent',
                color: activeTab === 'form' ? '#fff' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <FileCheck2 size={15} /> Phiếu chấm điểm ({completedReviewees.size}/{teammatesToReview.length})
            </button>
            <button
              onClick={() => setActiveTab('results')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'results' ? '#6366f1' : 'transparent',
                color: activeTab === 'results' ? '#fff' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <TrendingUp size={15} /> Báo cáo 360° tổng hợp
            </button>
          </div>
        </div>
      </div>

      {/* 3. Anti-Self-Review and Anonymity Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '8px',
          marginBottom: '22px',
          fontSize: '13px',
          color: '#cbd5e1',
        }}
      >
        <ShieldCheck size={20} color="#818cf8" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <strong style={{ color: '#fff' }}>Nguyên tắc bảo vệ danh tính &amp; Chống thiên vị:</strong>{' '}
          Hệ thống chặn tự đánh giá bản thân (Anti-Self-Review) và tách rời danh tính người gửi khỏi phiếu điểm. Nhận xét định tính được làm sạch thông tin nhận dạng trước khi tổng hợp.
        </div>
      </div>

      {/* 4. Tab 1: Phiếu Chấm Điểm (Interactive 2-column Layout) */}
      {activeTab === 'form' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '22px', alignItems: 'start' }}>
          {/* Left Column: Teammates List */}
          <div
            style={{
              backgroundColor: '#121318',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#fff' }}>
                Đồng đội cần đánh giá
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: completedReviewees.size >= teammatesToReview.length ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: completedReviewees.size >= teammatesToReview.length ? '#34d399' : '#94a3b8',
                }}
              >
                {completedReviewees.size} / {teammatesToReview.length} hoàn thành
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${teammatesToReview.length > 0 ? (completedReviewees.size / teammatesToReview.length) * 100 : 0}%`,
                  backgroundColor: '#10b981',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* List of candidates */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              {teammatesToReview.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  Không có thành viên nào khác để đánh giá.
                </div>
              ) : (
                teammatesToReview.map((m) => {
                  const isDone = completedReviewees.has(m.id);
                  const isSelected = m.id === selectedRevieweeId;

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedRevieweeId(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: isSelected ? '1px solid #6366f1' : '1px solid transparent',
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: m.color,
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(m.name)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isSelected ? '#fff' : '#e2e8f0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.name}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.role}
                        </div>
                      </div>

                      {/* Status badge */}
                      {isDone ? (
                        <span
                          title="Đã gửi đánh giá"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#34d399',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            padding: '3px 7px',
                            borderRadius: '12px',
                          }}
                        >
                          <CheckCircle size={12} /> Đã chấm
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            padding: '3px 7px',
                            borderRadius: '12px',
                          }}
                        >
                          Chưa chấm
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Note */}
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#64748b',
                lineHeight: 1.4,
              }}
            >
              🔒 <strong>Chế độ ẩn danh:</strong> Người được đánh giá sẽ không thấy điểm riêng lẻ của bạn, chỉ thấy điểm trung bình khi đợt chấm đạt đủ ≥ 3 phiếu.
            </div>
          </div>

          {/* Right Column: Active Evaluation Form */}
          <div
            style={{
              backgroundColor: '#121318',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '24px',
            }}
          >
            {selectedReviewee ? (
              <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Form Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: selectedReviewee.color,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getInitials(selectedReviewee.name)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#fff' }}>
                          Đánh giá cho: {selectedReviewee.name}
                        </h2>
                        {completedReviewees.has(selectedReviewee.id) && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#34d399',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            Đã hoàn thành phiếu
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                        {selectedReviewee.role} · {selectedReviewee.email}
                      </div>
                    </div>
                  </div>

                  {/* Realtime Form Score Average */}
                  <div
                    style={{
                      textAlign: 'right',
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, textTransform: 'uppercase' }}>
                      Điểm trung bình phiếu
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                      {currentFormAverage} <span style={{ fontSize: '13px', color: '#94a3b8' }}>/ 5.0 ★</span>
                    </div>
                  </div>
                </div>

                {/* Round Closed Warning */}
                {activeRound?.status !== 'OPEN' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#fca5a5',
                    }}
                  >
                    <ShieldAlert size={18} color="#f87171" />
                    <div>
                      Đợt chấm chéo này hiện đã <strong>kết thúc (CLOSED)</strong>. Bạn chỉ có thể xem báo cáo điểm tổng hợp ở tab Báo cáo 360°.
                    </div>
                  </div>
                )}

                {/* 3 Criteria Interactive Selectors */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {CRITERIA_DEFINITIONS.map((crit) => {
                    const currentScore =
                      crit.key === 'QUALITY'
                        ? qualityScore
                        : crit.key === 'PUNCTUALITY'
                        ? punctualityScore
                        : cooperationScore;

                    const setScore =
                      crit.key === 'QUALITY'
                        ? setQualityScore
                        : crit.key === 'PUNCTUALITY'
                        ? setPunctualityScore
                        : setCooperationScore;

                    const selectedOption = crit.options.find((o) => o.score === currentScore);

                    return (
                      <div
                        key={crit.key}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '8px',
                          padding: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                              {crit.label}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{crit.desc}</div>
                          </div>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              color: '#818cf8',
                              fontFamily: 'monospace',
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              padding: '2px 10px',
                              borderRadius: '6px',
                            }}
                          >
                            {currentScore} / 5
                          </div>
                        </div>

                        {/* 5-button score pills */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '12px' }}>
                          {crit.options.map((opt) => {
                            const isChosen = opt.score === currentScore;
                            return (
                              <button
                                type="button"
                                key={opt.score}
                                disabled={activeRound?.status !== 'OPEN'}
                                onClick={() => setScore(opt.score)}
                                style={{
                                  padding: '10px 4px',
                                  borderRadius: '6px',
                                  border: isChosen ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                                  backgroundColor: isChosen ? '#6366f1' : 'rgba(255, 255, 255, 0.04)',
                                  color: isChosen ? '#fff' : '#cbd5e1',
                                  cursor: activeRound?.status === 'OPEN' ? 'pointer' : 'not-allowed',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '2px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{ fontSize: '15px', fontWeight: 700 }}>
                                  {opt.score} ★
                                </div>
                                <div style={{ fontSize: '11px', opacity: isChosen ? 0.95 : 0.7 }}>
                                  {opt.label}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected detail description */}
                        {selectedOption && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#818cf8', fontStyle: 'italic' }}>
                            ↳ {selectedOption.detail}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Qualitative Anonymous Constructive Feedback */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                    Nhận xét đóng góp mang tính xây dựng (Ẩn danh, không bắt buộc):
                  </label>
                  <textarea
                    rows={3}
                    disabled={activeRound?.status !== 'OPEN'}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Ví dụ: Hoàn thành tốt các task sprint 2, code cẩn thận. Cần chủ động cập nhật trạng thái trên Jira/Kanban sớm hơn để nhóm nắm tiến độ..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      backgroundColor: '#0c0d12',
                      color: '#f8fafc',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    <span>Nội dung nhận xét sẽ được mã hóa và làm sạch mọi siêu dữ liệu nhận dạng cá nhân.</span>
                    <span>{feedbackText.length} / 500 ký tự</span>
                  </div>
                </div>

                {/* Submit button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={submitting || activeRound?.status !== 'OPEN'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      backgroundColor: activeRound?.status === 'OPEN' ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: activeRound?.status === 'OPEN' ? 'pointer' : 'not-allowed',
                      opacity: submitting ? 0.7 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Send size={15} />
                    {submitting ? 'Đang gửi ẩn danh...' : 'Gửi đánh giá ẩn danh (Nghị định 13)'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>Vui lòng chọn một thành viên trong danh sách bên trái để tiến hành đánh giá.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2: Báo Cáo 360° Tổng Hợp (Aggregated 360° Results) */}
      {activeTab === 'results' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '22px', alignItems: 'start' }}>
          {/* Left Column: Member Result Selector */}
          <div
            style={{
              backgroundColor: '#121318',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0', color: '#fff' }}>
              Danh sách thành viên
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {members.map((m) => {
                const res = resultsMap[m.id];
                const isSelected = m.id === selectedResultMemberId;
                const isSafe = res?.anonymousSafe ?? false;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedResultMemberId(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #6366f1' : '1px solid transparent',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        backgroundColor: m.color,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(m.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isSelected ? '#fff' : '#e2e8f0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {res ? `${res.submissionCount} phiếu` : 'Đang tải...'}
                      </div>
                    </div>

                    {isSafe ? (
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#34d399',
                          fontFamily: 'monospace',
                        }}
                      >
                        {res.averageScore.toFixed(2)} ★
                      </span>
                    ) : (
                      <span
                        title="Chưa đủ ngưỡng ẩn danh (Cần ≥ 3 phiếu)"
                        style={{
                          fontSize: '11px',
                          color: '#f59e0b',
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          padding: '2px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        <Lock size={10} style={{ display: 'inline', marginRight: 2 }} /> Ẩn danh
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed 360° Result Card for Selected Member */}
          <div
            style={{
              backgroundColor: '#121318',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '24px',
            }}
          >
            {loadingResults ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p>Đang tổng hợp dữ liệu đánh giá ẩn danh...</p>
              </div>
            ) : activeResult ? (
              <div>
                {/* Result Member Header */}
                {(() => {
                  const targetMember = members.find((m) => m.id === selectedResultMemberId);
                  return (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingBottom: '16px',
                        marginBottom: '20px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            backgroundColor: targetMember?.color || '#6366f1',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {getInitials(targetMember?.name || '')}
                        </div>
                        <div>
                          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#fff' }}>
                            {targetMember?.name}
                          </h2>
                          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                            {targetMember?.role} · Đợt chấm: {activeRound?.name}
                          </div>
                        </div>
                      </div>

                      {activeResult.anonymousSafe ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <ShieldCheck size={16} /> Đạt chuẩn ẩn danh (≥ 3 phiếu)
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Lock size={14} /> Bảo vệ danh tính (Dưới ngưỡng)
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Condition: Anonymity Threshold Met */}
                {activeResult.anonymousSafe ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* Big Score Card */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '220px 1fr',
                        gap: '20px',
                        padding: '20px',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '10px',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.08)', paddingRight: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase' }}>
                          Điểm đánh giá trung bình
                        </div>
                        <div style={{ fontSize: '42px', fontWeight: 800, color: '#fff', fontFamily: 'monospace', margin: '4px 0' }}>
                          {activeResult.averageScore.toFixed(2)}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', color: '#fbbf24' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={16}
                              fill={star <= Math.round(activeResult.averageScore) ? '#fbbf24' : 'transparent'}
                            />
                          ))}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                          Trên thang điểm 5.0 chuẩn Agile
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Award size={18} color="#818cf8" />
                          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#fff' }}>
                            Tổng hợp {activeResult.submissionCount} lượt đánh giá hợp lệ
                          </h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                          Kết quả được tổng hợp tự động từ các thành viên trong nhóm dự án theo chuẩn K-Anonymity (Nghị định 13/2023/NĐ-CP). Điểm số này được tính vào Hệ số Đóng góp Toàn diện (FairShare Comprehensive Score).
                        </p>
                      </div>
                    </div>

                    {/* Qualitative Comments Wall */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <MessageSquare size={18} color="#818cf8" />
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#fff' }}>
                          Nhận xét đóng góp định tính (Đã ẩn danh)
                        </h3>
                      </div>

                      {activeResult.feedbackComments && activeResult.feedbackComments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {activeResult.feedbackComments.map((cmt, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '14px 16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#e2e8f0',
                                lineHeight: 1.5,
                                fontStyle: 'italic',
                                position: 'relative',
                              }}
                            >
                              <span style={{ fontSize: '18px', color: '#6366f1', marginRight: '6px' }}>“</span>
                              {cmt}
                              <span style={{ fontSize: '18px', color: '#6366f1', marginLeft: '4px' }}>”</span>
                              <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', fontStyle: 'normal' }}>
                                🔒 Thành viên nhóm ẩn danh #{idx + 1} · Xác nhận tuân thủ Nghị định 13
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '24px',
                            textAlign: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '8px',
                            color: '#64748b',
                            fontSize: '13px',
                          }}
                        >
                          Không có nhận xét định tính bổ sung nào cho đợt chấm này.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Condition: Anonymity Threshold NOT Met (< 3 submissions) */
                  <div
                    style={{
                      padding: '40px 24px',
                      textAlign: 'center',
                      backgroundColor: 'rgba(245, 158, 11, 0.05)',
                      border: '1px dashed rgba(245, 158, 11, 0.3)',
                      borderRadius: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 16px',
                      }}
                    >
                      <Lock size={26} />
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc', margin: '0 0 8px 0' }}>
                      Bảo vệ danh tính cá nhân (K-Anonymity Gate)
                    </h3>

                    <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '540px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                      Hiện tại thành viên này mới nhận được <strong>{activeResult.submissionCount} / 3</strong> lượt đánh giá tối thiểu. Để đảm bảo người được đánh giá không thể suy đoán hoặc xác định danh tính đồng đội đã chấm mình, hệ thống tạm thời khóa kết quả chi tiết.
                    </p>

                    <div style={{ maxWidth: '320px', margin: '0 auto 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                        <span>Tiến độ thu thập</span>
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>{activeResult.submissionCount} / 3 phiếu</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(activeResult.submissionCount / 3) * 100}%`,
                            backgroundColor: '#f59e0b',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      📌 Kết quả sẽ tự động mở và tính vào bảng điểm khi có đủ từ 3 phiếu đánh giá hợp lệ trở lên.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p>Chọn một thành viên trong danh sách bên trái để xem kết quả đánh giá 360°.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Modal: Leader Create New Review Round */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#121318',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#818cf8" />
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#fff' }}>
                  Khởi tạo đợt chấm chéo mới
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRound} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Sprint áp dụng:
                </label>
                <select
                  value={newRoundSprintId}
                  onChange={(e) => {
                    const spId = Number(e.target.value);
                    setNewRoundSprintId(spId);
                    const sp = sprints.find((s) => s.id === spId);
                    if (sp) {
                      setNewRoundName(`Đánh giá chéo ${sp.name}`);
                    }
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#0c0d12',
                    color: '#f8fafc',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  {sprints.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Tên đợt chấm chéo:
                </label>
                <input
                  type="text"
                  required
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                  placeholder="Ví dụ: Đánh giá chéo Sprint 3 - Kiểm thử & Đóng gói"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#0c0d12',
                    color: '#f8fafc',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}
              >
                🔒 Đợt chấm mới sẽ được tạo ở trạng thái <strong>Bản nháp (DRAFT)</strong> với ngưỡng tối thiểu là 3 lượt đánh giá theo quy chuẩn Nghị định 13/2023/NĐ-CP.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={creatingRound}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={14} /> {creatingRound ? 'Đang tạo...' : 'Tạo đợt chấm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
