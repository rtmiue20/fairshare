import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  peerReviewApi,
  ReviewRound,
  ReviewSprint,
  PeerReviewDetail,
  DoneCard,
} from '../../api/peerReview.api';
import { teamApi } from '../../api/team.api';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';
import { showToast } from '../../components/ui/Toast';
import {
  Star,
  Users,
  ArrowLeft,
  Send,
  MessageSquare,
  Plus,
  Play,
  Square,
  RefreshCw,
  ThumbsUp,
  Share2,
  MessageCircle,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Check,
  CheckSquare,
  Sparkles,
  Award,
} from 'lucide-react';

interface TeamMemberItem {
  id: number;
  name: string;
  email: string;
  role: string;
  isLeader: boolean;
  color: string;
  avatarUrl?: string;
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

const SCORE_LABELS: Record<number, string> = {
  1: '1 ★ - Cần cải thiện nhiều',
  2: '2 ★ - Dưới mức mong đợi',
  3: '3 ★ - Đạt yêu cầu cơ bản',
  4: '4 ★ - Rất tốt, chủ động',
  5: '5 ★ - Xuất sắc vượt trội',
};

export const ReviewRoundPage: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : activeTeamId || teams[0]?.id || 1;
  const { user: currentUser } = useAuthStore();

  // Theme detector for Light / Dark Mode
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.dataset.theme === 'light';
    }
    return false;
  });

  useEffect(() => {
    const updateTheme = () => {
      setIsLight(document.documentElement.dataset.theme === 'light');
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const theme = useMemo(() => {
    return {
      isLight,
      pageColor: isLight ? '#f8fafc' : '#07090e',
      textColor: isLight ? '#0f172a' : '#f8fafc',
      headingColor: isLight ? '#0f172a' : '#ffffff',
      subTextColor: isLight ? '#64748b' : '#94a3b8',
      cardBg: isLight ? '#ffffff' : '#1f1f23',
      cardBorder: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
      cardShadow: isLight ? '0 10px 30px rgba(0, 0, 0, 0.04)' : '0 4px 16px rgba(0, 0, 0, 0.25)',
      cardRadius: '20px',
      inputBg: isLight ? '#f8fafc' : '#27272a',
      inputBorder: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)',
      inputColor: isLight ? '#0f172a' : '#f8fafc',
      pillBg: isLight ? '#f1f5f9' : '#27272a',
      pillBorder: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
      pillText: isLight ? '#334155' : '#cbd5e1',
      reviewCardBg: isLight ? '#ffffff' : '#1f1f23',
      reviewCardBorder: isLight ? '1px solid rgba(0, 0, 0, 0.07)' : '1px solid rgba(255, 255, 255, 0.08)',
      modalBg: isLight ? '#ffffff' : '#18181b',
      modalBorder: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)',
      modalShadow: isLight ? '0 25px 50px rgba(0, 0, 0, 0.15)' : '0 4px 24px rgba(0, 0, 0, 0.4)',
      filterBadgeBg: (active: boolean) =>
        active ? '#6366f1' : isLight ? '#f1f5f9' : '#27272a',
      filterBadgeColor: (active: boolean) =>
        active ? '#ffffff' : isLight ? '#475569' : '#94a3b8',
    };
  }, [isLight]);

  // Data states
  const [rounds, setRounds] = useState<ReviewRound[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<number>(0);
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [sprints, setSprints] = useState<ReviewSprint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Evaluator (current user)
  const [currentEvaluatorId] = useState<number>(currentUser?.id || 109);

  // KEY FEATURE: Nút bật/tắt "Ẩn danh" trên trang
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);

  // Filter by selected reviewee (0 = Tất cả thành viên)
  const [selectedMemberId, setSelectedMemberId] = useState<number>(0);

  // Filter by Star Rating (0 = All, 5, 4, 3, 2, 1)
  const [selectedStarFilter, setSelectedStarFilter] = useState<number>(0);

  // Detailed Reviews list (Real Data from Database)
  const [reviews, setReviews] = useState<PeerReviewDetail[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);

  // Done cards for review form modal
  const [doneCards, setDoneCards] = useState<DoneCard[]>([]);

  // Likes state map (id -> count, id -> userLiked)
  const [likesMap, setLikesMap] = useState<Record<number, number>>({});
  const [userLikedMap, setUserLikedMap] = useState<Record<number, boolean>>({});

  // ==================== MULTI-STEP REVIEW MODAL STATES ====================
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewStep, setReviewStep] = useState<number>(1); // 1: Sprint & Reviewee -> 2: Done Card -> 3: Sliders & Comment -> 4: Confirm
  const [modalSprintId, setModalSprintId] = useState<number>(0);
  const [modalRoundId, setModalRoundId] = useState<number>(0);
  const [modalRevieweeId, setModalRevieweeId] = useState<number>(0);
  const [modalCardId, setModalCardId] = useState<number>(0);
  const [modalQuality, setModalQuality] = useState<number>(5);
  const [modalPunctuality, setModalPunctuality] = useState<number>(5);
  const [modalCooperation, setModalCooperation] = useState<number>(5);
  const [modalFeedback, setModalFeedback] = useState<string>('');
  const [modalIsAnonymous, setModalIsAnonymous] = useState<boolean>(true);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // ==================== MULTI-STEP CREATE ROUND MODAL STATES ====================
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createRoundStep, setCreateRoundStep] = useState<number>(1); // 1: Sprint -> 2: Name & Time -> 3: Confirm
  const [newRoundSprintId, setNewRoundSprintId] = useState<number>(0);
  const [newRoundName, setNewRoundName] = useState<string>('');
  const [newRoundStartDate, setNewRoundStartDate] = useState<string>('');
  const [newRoundEndDate, setNewRoundEndDate] = useState<string>('');
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

      // 1. Members mapping
      let loadedMembers: TeamMemberItem[] = [];
      if (memberRes.status === 'fulfilled' && Array.isArray(memberRes.value?.data) && memberRes.value.data.length > 0) {
        loadedMembers = memberRes.value.data.map((m, idx) => ({
          id: m.userId,
          name: m.fullName || m.email,
          email: m.email,
          role: m.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên',
          isLeader: m.role === 'LEADER',
          color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
        }));
      } else {
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
                email: m.user?.email || `user${uid}@example.com`,
                role: m.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên',
                isLeader: m.role === 'LEADER',
                color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
              };
            });
          }
        } catch {
          // Keep fallback
        }
      }
      setMembers(loadedMembers);

      // 2. Sprints mapping
      let loadedSprints: ReviewSprint[] = [];
      if (sprintRes.status === 'fulfilled' && Array.isArray(sprintRes.value?.data)) {
        loadedSprints = sprintRes.value.data;
      }
      setSprints(loadedSprints);
      if (loadedSprints.length > 0) {
        setNewRoundSprintId(loadedSprints[0].id);
        setModalSprintId(loadedSprints[0].id);
      }

      // 3. Rounds mapping
      let loadedRounds: ReviewRound[] = [];
      if (roundRes.status === 'fulfilled' && Array.isArray(roundRes.value?.data) && roundRes.value.data.length > 0) {
        loadedRounds = roundRes.value.data;
      }
      setRounds(loadedRounds);
      if (loadedRounds.length > 0) {
        // Ưu tiên chọn đợt đang mở (OPEN), nếu không thì chọn đợt mới nhất
        const defaultRound = loadedRounds.find((r) => r.status === 'OPEN') || loadedRounds[loadedRounds.length - 1];
        setActiveRoundId(defaultRound.id);
        setModalRoundId(defaultRound.id);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu chấm chéo:', err);
    } finally {
      setLoading(false);
    }
  }, [currentTeamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load detailed reviews for the active round (Real Data)
  const loadReviews = useCallback(async () => {
    if (!activeRoundId) return;
    setLoadingReviews(true);
    try {
      const res = await peerReviewApi.getRoundReviews(activeRoundId, selectedMemberId > 0 ? selectedMemberId : undefined);
      if (res?.data && Array.isArray(res.data)) {
        setReviews(res.data);
      } else {
        setReviews([]);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, [activeRoundId, selectedMemberId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Load done cards when team is available
  useEffect(() => {
    if (currentTeamId) {
      peerReviewApi
        .getDoneCardsForTeam(currentTeamId)
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setDoneCards(res.data);
          }
        })
        .catch(() => setDoneCards([]));
    }
  }, [currentTeamId]);

  // Active round object
  const activeRound = useMemo(() => {
    return rounds.find((r) => r.id === activeRoundId) || rounds[0];
  }, [rounds, activeRoundId]);

  // Active team object
  const activeTeam = useMemo(() => {
    return teams.find((t) => t.id === currentTeamId) || { name: 'Dự án của bạn' };
  }, [teams, currentTeamId]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    let list = [...reviews];
    if (selectedMemberId > 0) {
      list = list.filter((r) => r.revieweeId === selectedMemberId);
    }
    if (selectedStarFilter > 0) {
      list = list.filter((r) => Math.round(r.averageScore) === selectedStarFilter);
    }
    return list;
  }, [reviews, selectedMemberId, selectedStarFilter]);

  // Stable Anonymous Alias Generator:
  // Maps reviewerId -> "Anonymous001", "Anonymous002", etc.
  const reviewerAnonymousMap = useMemo(() => {
    const map = new Map<number, string>();
    let counter = 1;
    reviews.forEach((r) => {
      if (!map.has(r.reviewerId)) {
        map.set(r.reviewerId, `Anonymous${String(counter).padStart(3, '0')}`);
        counter++;
      }
    });
    return map;
  }, [reviews]);

  // Overall Statistics calculated from real reviews
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        avgScore: 0,
        totalReviews: 0,
        starsBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        qualityAvg: 0,
        punctualityAvg: 0,
        cooperationAvg: 0,
        qualityVotes: 0,
        punctualityVotes: 0,
        cooperationVotes: 0,
      };
    }

    const sum = reviews.reduce((acc, r) => acc + (r.averageScore || 0), 0);
    const avgScore = Number((sum / total).toFixed(2));

    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.averageScore || 0)));
      breakdown[rounded] = (breakdown[rounded] || 0) + 1;
    });

    const percentages: Record<number, number> = {
      5: Math.round(((breakdown[5] || 0) / total) * 100),
      4: Math.round(((breakdown[4] || 0) / total) * 100),
      3: Math.round(((breakdown[3] || 0) / total) * 100),
      2: Math.round(((breakdown[2] || 0) / total) * 100),
      1: Math.round(((breakdown[1] || 0) / total) * 100),
    };

    const qScores = reviews
      .map((r) => r.qualityScore)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));
    const pScores = reviews
      .map((r) => r.punctualityScore)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));
    const cScores = reviews
      .map((r) => r.cooperationScore)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));

    const qualityAvg = qScores.length > 0 ? Number((qScores.reduce((a, b) => a + b, 0) / qScores.length).toFixed(1)) : 0;
    const punctualityAvg = pScores.length > 0 ? Number((pScores.reduce((a, b) => a + b, 0) / pScores.length).toFixed(1)) : 0;
    const cooperationAvg = cScores.length > 0 ? Number((cScores.reduce((a, b) => a + b, 0) / cScores.length).toFixed(1)) : 0;

    const qualityVotes = qScores.filter((s) => s >= 4).length;
    const punctualityVotes = pScores.filter((s) => s >= 4).length;
    const cooperationVotes = cScores.filter((s) => s >= 4).length;

    return {
      avgScore,
      totalReviews: total,
      starsBreakdown: breakdown,
      percentages,
      qualityAvg,
      punctualityAvg,
      cooperationAvg,
      qualityVotes,
      punctualityVotes,
      cooperationVotes,
    };
  }, [reviews]);

  // Handle Like — calls real API with optimistic local update
  const handleToggleLike = async (reviewId: number, currentLikes: number) => {
    const wasLiked = Boolean(userLikedMap[reviewId]);
    const nextLiked = !wasLiked;
    setUserLikedMap((prev) => ({ ...prev, [reviewId]: nextLiked }));
    setLikesMap((prev) => ({
      ...prev,
      [reviewId]: nextLiked
        ? (prev[reviewId] ?? currentLikes) + 1
        : Math.max(0, (prev[reviewId] ?? currentLikes) - 1),
    }));

    try {
      const res = await peerReviewApi.toggleLike(reviewId);
      if (res?.data != null) {
        setLikesMap((prev) => ({ ...prev, [reviewId]: res.data as number }));
      }
    } catch {
      setUserLikedMap((prev) => ({ ...prev, [reviewId]: wasLiked }));
      setLikesMap((prev) => ({ ...prev, [reviewId]: currentLikes }));
    }
  };

  // Open Multi-Step Review Modal
  const openReviewModal = () => {
    const eligible = members.find((m) => m.id !== currentEvaluatorId);
    if (eligible) setModalRevieweeId(eligible.id);
    if (activeRoundId) setModalRoundId(activeRoundId);
    if (activeRound?.sprintId) setModalSprintId(activeRound.sprintId);
    setReviewStep(1);
    setModalCardId(0);
    setModalQuality(5);
    setModalPunctuality(5);
    setModalCooperation(5);
    setModalFeedback('');
    setModalIsAnonymous(isAnonymous);
    setShowReviewModal(true);
  };

  // Submit Review Modal
  const handleFinalSubmitReview = async () => {
    const targetRoundId = modalRoundId || activeRoundId;
    if (!targetRoundId) {
      showToast({ message: 'Vui lòng chọn đợt chấm chéo hợp lệ', type: 'error' });
      return;
    }
    if (!modalRevieweeId || modalRevieweeId === currentEvaluatorId) {
      showToast({ message: 'Vui lòng chọn đồng đội cần đánh giá (không thể tự chấm bản thân)', type: 'error' });
      return;
    }
    if (!modalFeedback.trim()) {
      showToast({ message: 'Vui lòng điền nhận xét đóng góp cho đồng đội', type: 'error' });
      setReviewStep(3);
      return;
    }

    setSubmittingReview(true);
    try {
      await peerReviewApi.submitReview(targetRoundId, {
        reviewerId: currentEvaluatorId,
        revieweeId: modalRevieweeId,
        scores: [
          { criterion: 'QUALITY', score: modalQuality },
          { criterion: 'PUNCTUALITY', score: modalPunctuality },
          { criterion: 'COOPERATION', score: modalCooperation },
        ],
        feedback: modalFeedback.trim(),
        cardId: modalCardId > 0 ? modalCardId : undefined,
      });

      showToast({ message: 'Đã gửi phiếu chấm điểm đồng đội thành công!', type: 'success' });
      setShowReviewModal(false);
      loadReviews();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi gửi đánh giá';
      showToast({ message: msg, type: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Open Multi-Step Create Round Modal
  const openCreateModal = () => {
    setCreateRoundStep(1);
    if (sprints.length > 0) setNewRoundSprintId(sprints[0].id);
    setNewRoundName('');
    setNewRoundStartDate(new Date().toISOString().split('T')[0]);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    setNewRoundEndDate(endDate.toISOString().split('T')[0]);
    setShowCreateModal(true);
  };

  // Create Round
  const handleFinalCreateRound = async () => {
    if (!newRoundName.trim()) {
      showToast({ message: 'Vui lòng nhập tên đợt chấm chéo', type: 'error' });
      setCreateRoundStep(2);
      return;
    }
    setCreatingRound(true);
    try {
      const res = await peerReviewApi.createRound(newRoundSprintId, {
        name: newRoundName.trim(),
        startDate: newRoundStartDate ? `${newRoundStartDate}T00:00:00` : undefined,
        endDate: newRoundEndDate ? `${newRoundEndDate}T23:59:59` : undefined,
      });
      if (res?.data) {
        setRounds((prev) => [res.data, ...prev]);
        setActiveRoundId(res.data.id);
        showToast({ message: 'Tạo đợt chấm chéo mới thành công', type: 'success' });
        setShowCreateModal(false);
        setNewRoundName('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo đợt chấm';
      showToast({ message: msg, type: 'error' });
    } finally {
      setCreatingRound(false);
    }
  };

  // Open / Close Round
  const handleToggleRoundStatus = async () => {
    if (!activeRound) return;
    try {
      if (activeRound.status === 'OPEN') {
        const res = await peerReviewApi.closeRound(activeRound.id);
        if (res?.data) {
          setRounds((prev) => prev.map((r) => (r.id === activeRound.id ? res.data : r)));
          showToast({ message: 'Đã đóng đợt chấm chéo thành công', type: 'success' });
        }
      } else {
        const res = await peerReviewApi.openRound(activeRound.id);
        if (res?.data) {
          setRounds((prev) => prev.map((r) => (r.id === activeRound.id ? res.data : r)));
          showToast({ message: 'Đã mở đợt chấm chéo', type: 'success' });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái';
      showToast({ message: msg, type: 'error' });
    }
  };

  // Selected teammate object
  const selectedTeammate = useMemo(() => {
    return members.find((m) => m.id === modalRevieweeId);
  }, [members, modalRevieweeId]);

  // Selected card object
  const selectedCard = useMemo(() => {
    return doneCards.find((c) => c.id === modalCardId);
  }, [doneCards, modalCardId]);

  // Selected sprint object
  const selectedSprint = useMemo(() => {
    return sprints.find((s) => s.id === modalSprintId);
  }, [sprints, modalSprintId]);

  if (!loading && teams.length === 0) {
    return <NoProjectState />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.pageColor,
        backgroundImage: isLight
          ? 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.05), transparent 70%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(99, 102, 241, 0.04), transparent 60%)'
          : 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.08), transparent 70%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(99, 102, 241, 0.06), transparent 60%)',
        backgroundAttachment: 'fixed',
        color: theme.textColor,
        paddingTop: 'calc(var(--top, 64px) + 24px)',
        paddingBottom: '60px',
        paddingLeft: 'clamp(16px, 3vw, 32px)',
        paddingRight: 'clamp(16px, 3vw, 32px)',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      {/* 1. Header Navigation & Quick Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <Link
            to={`/teams/${currentTeamId}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '10px',
              backgroundColor: theme.cardBg,
              border: theme.cardBorder,
              color: theme.subTextColor,
              textDecoration: 'none',
              boxShadow: theme.cardShadow,
            }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase' }}>
                Đánh giá đồng đội
              </span>
              <span style={{ fontSize: '11px', color: theme.subTextColor }}>·</span>
              <span style={{ fontSize: '11px', color: theme.subTextColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                {activeTeam?.name || 'Nhóm dự án'}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(17px, 2.2vw, 22px)', fontWeight: 700, margin: '2px 0 0', color: theme.headingColor }}>
              Chấm chéo &amp; Đánh giá đồng đội (Peer Review)
            </h1>
          </div>
        </div>

        {/* Right Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {activeRound && (
            <button
              onClick={handleToggleRoundStatus}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 600,
                border: theme.cardBorder,
                backgroundColor: theme.cardBg,
                color: activeRound.status === 'OPEN' ? '#10b981' : '#f59e0b',
                cursor: 'pointer',
                boxShadow: theme.cardShadow,
              }}
            >
              {activeRound.status === 'OPEN' ? (
                <>
                  <Square size={13} fill="#10b981" /> Đang mở
                </>
              ) : (
                <>
                  <Play size={13} fill="#f59e0b" /> Đã đóng
                </>
              )}
            </button>
          )}

          {/* Button "Tạo đợt mới" with Multi-Step wizard */}
          <button
            onClick={openCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: theme.cardBg,
              color: theme.textColor,
              border: theme.cardBorder,
              cursor: 'pointer',
              boxShadow: theme.cardShadow,
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={15} /> Tạo đợt mới
          </button>

          {/* Button "Chấm điểm" with Multi-Step wizard */}
          <button
            onClick={openReviewModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              transition: 'transform 0.15s ease',
            }}
          >
            <Send size={14} /> Chấm điểm
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'clamp(280px, 28%, 340px) 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ==================== LEFT COLUMN: CUSTOMER REVIEWS ==================== */}
        <div
          style={{
            backgroundColor: theme.cardBg,
            border: theme.cardBorder,
            borderRadius: theme.cardRadius,
            boxShadow: theme.cardShadow,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Header Icon & Title */}
          <div style={{ textAlign: 'center', paddingTop: '4px' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: isLight ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.15)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <Users size={26} />
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: theme.headingColor }}>
              Customer reviews
            </h2>
            <div style={{ fontSize: '12px', color: theme.subTextColor, marginTop: '2px' }}>
              Tổng hợp đánh giá đa chiều (360°)
            </div>
          </div>

          {/* Average Score & Stars */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '44px',
                fontWeight: 800,
                color: theme.headingColor,
                lineHeight: 1.1,
                letterSpacing: '-1px',
              }}
            >
              {stats.totalReviews > 0 ? stats.avgScore.toFixed(2) : '0.00'}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '4px',
                marginTop: '6px',
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = stats.totalReviews > 0 && star <= Math.round(stats.avgScore);
                return (
                  <Star
                    key={star}
                    size={17}
                    fill={isFilled ? '#f59e0b' : 'transparent'}
                    color={isFilled ? '#f59e0b' : isLight ? '#cbd5e1' : '#475569'}
                  />
                );
              })}
            </div>
            <div style={{ fontSize: '12px', color: theme.subTextColor, marginTop: '6px' }}>
              {stats.totalReviews > 0 ? `${stats.totalReviews} Đánh giá (Reviews)` : '0 Đánh giá (Reviews)'}
            </div>
          </div>

          {/* Rating Breakdown Bars (5 to 1 Star) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const pct = stats.percentages[star as 1 | 2 | 3 | 4 | 5] || 0;
              return (
                <div
                  key={star}
                  onClick={() => setSelectedStarFilter(selectedStarFilter === star ? 0 : star)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    opacity: selectedStarFilter === 0 || selectedStarFilter === star ? 1 : 0.45,
                    transition: 'opacity 0.2s ease',
                  }}
                  title={`Lọc theo đánh giá ${star} sao`}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: isLight ? '1px solid #cbd5e1' : '1px solid #475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: theme.textColor,
                    }}
                  >
                    {star}
                  </div>
                  <Star size={13} fill="#f59e0b" color="#f59e0b" />
                  <div
                    style={{
                      flex: 1,
                      height: '8px',
                      backgroundColor: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: '#6366f1',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', color: theme.subTextColor, width: '32px', textAlign: 'right' }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* "What Customers Like" Criteria Badges */}
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: theme.headingColor,
                marginBottom: '12px',
              }}
            >
              What Customers Like
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: isLight ? '1px solid #cbd5e1' : '1px solid #475569',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.subTextColor,
                    }}
                  >
                    1
                  </span>
                  <span style={{ fontWeight: 600, color: theme.headingColor }}>Chất lượng (Quality)</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: stats.totalReviews > 0
                      ? (isLight ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.15)')
                      : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)'),
                    color: stats.totalReviews > 0 ? '#6366f1' : theme.subTextColor,
                  }}
                >
                  {stats.totalReviews > 0 ? `${stats.qualityAvg.toFixed(1)}/5 ★ (${stats.qualityVotes} votes)` : 'Chưa có vote'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: isLight ? '1px solid #cbd5e1' : '1px solid #475569',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.subTextColor,
                    }}
                  >
                    2
                  </span>
                  <span style={{ fontWeight: 600, color: theme.headingColor }}>Tiến độ (Punctuality)</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: stats.totalReviews > 0
                      ? (isLight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)')
                      : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)'),
                    color: stats.totalReviews > 0 ? '#10b981' : theme.subTextColor,
                  }}
                >
                  {stats.totalReviews > 0 ? `${stats.punctualityAvg.toFixed(1)}/5 ★ (${stats.punctualityVotes} votes)` : 'Chưa có vote'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: isLight ? '1px solid #cbd5e1' : '1px solid #475569',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.subTextColor,
                    }}
                  >
                    3
                  </span>
                  <span style={{ fontWeight: 600, color: theme.headingColor }}>Hợp tác (Cooperation)</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: stats.totalReviews > 0
                      ? (isLight ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.15)')
                      : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)'),
                    color: stats.totalReviews > 0 ? '#f59e0b' : theme.subTextColor,
                  }}
                >
                  {stats.totalReviews > 0 ? `${stats.cooperationAvg.toFixed(1)}/5 ★ (${stats.cooperationVotes} votes)` : 'Chưa có vote'}
                </span>
              </div>
            </div>
          </div>

          {/* Member Filter Section */}
          <div style={{ borderTop: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: theme.subTextColor, marginBottom: '8px' }}>
              Xem đánh giá theo thành viên:
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(Number(e.target.value))}
              style={{
                width: '100%',
                backgroundColor: theme.inputBg,
                color: theme.inputColor,
                border: theme.inputBorder,
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value={0}>Tất cả thành viên trong nhóm</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ==================== RIGHT COLUMN: HERO BANNER & REVIEWS ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Banner (Glassmorphic Subtle Indigo - Mờ ảo xám đen đồng bộ với trang Đóng góp) */}
          <div
            style={{
              position: 'relative',
              borderRadius: theme.cardRadius,
              background: isLight
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(31, 31, 35, 0.75) 0%, rgba(24, 24, 27, 0.88) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: isLight ? '#0f172a' : '#ffffff',
              padding: '24px 28px',
              overflow: 'hidden',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: isLight
                ? '0 10px 30px rgba(0, 0, 0, 0.04)'
                : '0 12px 32px rgba(0, 0, 0, 0.35), inset 0 0 60px rgba(99, 102, 241, 0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Ambient Purple/Cyan Glow Aura (Mờ ảo như trang Đóng góp) */}
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                right: '40px',
                width: '280px',
                height: '200px',
                background: isLight
                  ? 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-30px',
                left: '20px',
                width: '220px',
                height: '140px',
                background: isLight
                  ? 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            {/* Banner Left: Team Info */}
            <div style={{ zIndex: 2, maxWidth: '340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: isLight ? '#0f172a' : '#ffffff' }}>
                  {activeTeam?.name || 'KINGSHA'}
                </h3>
                <span style={{ fontSize: '14px' }}>✨</span>
              </div>
              <div style={{ fontSize: '13px', color: isLight ? '#64748b' : '#a1a1aa', marginTop: '4px' }}>
                {stats.totalReviews > 0 ? `(${stats.totalReviews}) ${stats.avgScore.toFixed(1)} Ratings` : 'Hệ thống đánh giá đồng đội'}
              </div>
              <div style={{ fontSize: '11px', color: isLight ? '#6366f1' : '#c084fc', marginTop: '6px', fontWeight: 600 }}>
                Đợt chấm: {activeRound?.name || 'Đợt hiện tại'} · K-Anonymity
              </div>
            </div>

            {/* Banner Center: Floating avatar network nodes */}
            <div
              style={{
                position: 'relative',
                width: '180px',
                height: '70px',
                zIndex: 1,
              }}
            >
              {(members.length > 0 ? members.slice(0, 4) : [
                { id: 1, name: 'Minh Trieu', color: '#3b82f6' },
                { id: 2, name: 'An Nguyen', color: '#10b981' },
                { id: 3, name: 'Gia Bao', color: '#ef4444' },
                { id: 4, name: 'Le Hoang', color: '#06b6d4' },
              ]).map((member, idx) => {
                const positions = [
                  { left: '10px', top: '18px', size: 34, bg: '#3b82f6' },
                  { left: '60px', top: '5px', size: 30, bg: '#10b981' },
                  { left: '52px', top: '32px', size: 40, bg: '#ef4444' },
                  { right: '20px', top: '18px', size: 32, bg: '#06b6d4' },
                ];
                const pos = positions[idx] || positions[0];
                const initials = (member.name || 'MB')
                  .trim()
                  .split(' ')
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(-2)
                  .join('')
                  .toUpperCase() || 'MB';
                return (
                  <div
                    key={member.id}
                    title={member.name}
                    style={{
                      position: 'absolute',
                      left: pos.left,
                      right: pos.right,
                      top: pos.top,
                      width: pos.size,
                      height: pos.size,
                      borderRadius: '50%',
                      border: idx === 2 ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.7)',
                      backgroundColor: ('color' in member && member.color) ? member.color : pos.bg,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: pos.size > 34 ? '13px' : '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    }}
                  >
                    {initials}
                  </div>
                );
              })}
            </div>

            {/* Banner Right: KEY FEATURE - TOGGLE "ẨN DANH" */}
            <div
              style={{
                zIndex: 2,
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '12px 18px',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isAnonymous ? <EyeOff size={18} color={isLight ? '#059669' : '#a7f3d0'} /> : <Eye size={18} color={isLight ? '#d97706' : '#fed7aa'} />}
                  <span style={{ fontSize: '13px', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff' }}>
                    Chế độ Ẩn danh:
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    backgroundColor: isAnonymous ? '#10b981' : (isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255, 255, 255, 0.25)'),
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    padding: '2px',
                    outline: 'none',
                  }}
                  title={isAnonymous ? 'Bật: Hiển thị Anonymous001, Anonymous002,...' : 'Tắt: Hiển thị tên thật user'}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      transform: isAnonymous ? 'translateX(22px)' : 'translateX(0)',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isAnonymous ? (isLight ? '#059669' : '#a7f3d0') : (isLight ? '#d97706' : '#fed7aa'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isAnonymous ? (
                  <>
                    <CheckCircle2 size={12} /> BẬT: Hiển thị Anonymous001, Anonymous002,...
                  </>
                ) : (
                  <>
                    <Eye size={12} /> TẮT: Hiển thị tên thật thành viên
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sub-bar: Round selector & Star filter pills */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: theme.subTextColor }}>
                Đợt chấm:
              </span>
              <select
                value={activeRoundId}
                onChange={(e) => setActiveRoundId(Number(e.target.value))}
                style={{
                  backgroundColor: theme.cardBg,
                  color: theme.headingColor,
                  border: theme.cardBorder,
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  boxShadow: theme.cardShadow,
                }}
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'})
                  </option>
                ))}
              </select>
            </div>

            {/* Star Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setSelectedStarFilter(0)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: theme.filterBadgeBg(selectedStarFilter === 0),
                  color: theme.filterBadgeColor(selectedStarFilter === 0),
                }}
              >
                Tất cả ({reviews.length})
              </button>
              {[5, 4, 3].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedStarFilter(star)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    backgroundColor: theme.filterBadgeBg(selectedStarFilter === star),
                    color: theme.filterBadgeColor(selectedStarFilter === star),
                  }}
                >
                  <span>{star}</span>
                  <Star size={11} fill={selectedStarFilter === star ? '#fff' : '#f59e0b'} />
                </button>
              ))}
            </div>
          </div>

          {/* ==================== REVIEW CARDS LIST ==================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loadingReviews ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: theme.subTextColor }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p>Đang tải danh sách đánh giá...</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div
                style={{
                  backgroundColor: theme.cardBg,
                  border: theme.cardBorder,
                  borderRadius: theme.cardRadius,
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: theme.subTextColor,
                }}
              >
                <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px', color: theme.headingColor }}>
                  Chưa có đánh giá nào phù hợp
                </h3>
                <p style={{ fontSize: '13px', margin: '0 0 16px' }}>
                  Hãy là người đầu tiên chấm điểm đồng đội cho đợt review này!
                </p>
                <button
                  onClick={openReviewModal}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '999px',
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  Bắt đầu chấm điểm ngay
                </button>
              </div>
            ) : (
              filteredReviews.map((review) => {
                const displayName = isAnonymous
                  ? reviewerAnonymousMap.get(review.reviewerId) || `Anonymous${String(review.reviewerId % 100).padStart(3, '0')}`
                  : review.reviewerName;

                const reviewerObj = members.find((m) => m.id === review.reviewerId);
                const avatarBg = isAnonymous ? '#6366f1' : reviewerObj?.color || '#3b82f6';
                const avatarText = isAnonymous ? '🕶️' : getInitials(review.reviewerName);

                const currentLikes = likesMap[review.id] ?? (review.likesCount || 0);
                const isLiked = Boolean(userLikedMap[review.id]);

                const formattedDate = review.submittedAt
                  ? new Date(review.submittedAt).toLocaleDateString('vi-VN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Gần đây';

                return (
                  <div
                    key={review.id}
                    style={{
                      backgroundColor: theme.reviewCardBg,
                      border: theme.reviewCardBorder,
                      borderRadius: '18px',
                      padding: '22px 24px',
                      boxShadow: theme.cardShadow,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    {/* Card Header: Avatar + Name + Date & Stars */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            backgroundColor: avatarBg,
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: isAnonymous ? '16px' : '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                          }}
                        >
                          {avatarText}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4
                              style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                margin: 0,
                                color: theme.headingColor,
                              }}
                            >
                              {displayName}
                            </h4>
                            {isAnonymous && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  backgroundColor: isLight ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.2)',
                                  color: '#6366f1',
                                }}
                              >
                                Ẩn danh K-Anonymity
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: theme.subTextColor, marginTop: '2px' }}>
                            {formattedDate} · Chấm cho:{' '}
                            <strong style={{ color: theme.headingColor }}>
                              {review.revieweeName || 'Thành viên'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Top Right Stars */}
                      <div style={{ display: 'flex', gap: '3px', color: '#f59e0b' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={16}
                            fill={s <= Math.round(review.averageScore) ? '#f59e0b' : 'transparent'}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Criteria score tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          backgroundColor: theme.pillBg,
                          border: theme.pillBorder,
                          color: theme.pillText,
                        }}
                      >
                        Chất lượng: {review.qualityScore ?? 5}/5 ★
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          backgroundColor: theme.pillBg,
                          border: theme.pillBorder,
                          color: theme.pillText,
                        }}
                      >
                        Tiến độ: {review.punctualityScore ?? 5}/5 ★
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          backgroundColor: theme.pillBg,
                          border: theme.pillBorder,
                          color: theme.pillText,
                        }}
                      >
                        Hợp tác: {review.cooperationScore ?? 5}/5 ★
                      </span>
                    </div>

                    {/* Linked Done Card Badge */}
                    {review.cardTitle && (
                      <div style={{ marginBottom: '-4px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            backgroundColor: isLight ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.15)',
                            border: '1px solid rgba(16,185,129,0.25)',
                            color: '#10b981',
                          }}
                        >
                          ✅ Thẻ hoàn thành: {review.cardTitle}
                        </span>
                      </div>
                    )}

                    {/* Feedback Content Text */}
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        lineHeight: 1.6,
                        color: theme.textColor,
                      }}
                    >
                      {review.feedback ||
                        'Thành viên hoàn thành tốt công việc được phân công, phối hợp ăn ý với nhóm và duy trì tiến độ sprint ổn định.'}
                    </p>

                    {/* Footer Actions: Reply, Share, Likes */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '4px',
                        paddingTop: '10px',
                        borderTop: isLight ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                          type="button"
                          onClick={() => showToast({ message: 'Tính năng phản hồi đang được phát triển', type: 'info' })}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontSize: '12px',
                            fontWeight: 600,
                            color: theme.subTextColor,
                            cursor: 'pointer',
                          }}
                        >
                          <MessageCircle size={14} /> Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(review.feedback);
                              showToast({ message: 'Đã sao chép nhận xét!', type: 'success' });
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontSize: '12px',
                            fontWeight: 600,
                            color: theme.subTextColor,
                            cursor: 'pointer',
                          }}
                        >
                          <Share2 size={14} /> Share
                        </button>
                      </div>

                      {/* Likes Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleLike(review.id, review.likesCount || 0)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'none',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isLiked ? '#6366f1' : theme.subTextColor,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          backgroundColor: isLiked
                            ? isLight
                              ? 'rgba(99, 102, 241, 0.1)'
                              : 'rgba(99, 102, 241, 0.15)'
                            : 'transparent',
                        }}
                      >
                        <span>{currentLikes}</span>
                        <ThumbsUp size={15} fill={isLiked ? '#6366f1' : 'transparent'} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ==================== MULTI-STEP MODAL: CHẤM ĐIỂM (4 BƯỚC) ==================== */}
      {/* ========================================================================= */}
      {showReviewModal && (
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
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingReview) setShowReviewModal(false);
          }}
        >
          <div
            className="mini-window"
            style={{
              width: '100%',
              maxWidth: '620px',
              borderRadius: '26px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px var(--glass-line)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.25s ease',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.5rem 1.75rem 0.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div style={{ flex: 1, paddingRight: '1.5rem' }}>
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
                  {reviewStep === 1 && 'Chọn Sprint & Đồng đội đánh giá'}
                  {reviewStep === 2 && 'Chọn thẻ công việc đã hoàn thành (Done)'}
                  {reviewStep === 3 && 'Chấm điểm thanh trượt & Nhận xét'}
                  {reviewStep === 4 && 'Kiểm tra & Xác nhận gửi phiếu chấm'}
                </h2>
                <p
                  style={{
                    margin: '0.4rem 0 0',
                    fontSize: '0.85rem',
                    color: 'var(--fg3)',
                    lineHeight: 1.45,
                  }}
                >
                  {reviewStep === 1 && 'Chọn sprint diễn ra và đồng đội bạn muốn đánh giá chéo trong nhóm.'}
                  {reviewStep === 2 && 'Chọn thẻ nhiệm vụ thuộc cột Done mà đồng đội đã hoàn thành để chấm.'}
                  {reviewStep === 3 && 'Kéo thanh trượt từ 1-5 sao theo từng tiêu chí và để lại nhận xét chân thành.'}
                  {reviewStep === 4 && 'Xem lại tổng thể kết quả trước khi hệ thống lưu đánh giá vào cơ sở dữ liệu.'}
                </p>
              </div>

              {/* Circular Close Button */}
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                disabled={submittingReview}
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
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: '1.25rem 1.75rem 1.25rem', maxHeight: '68vh', overflowY: 'auto' }}>
              {/* ==================== BƯỚC 1: SPRINT & REVIEWEE ==================== */}
              {reviewStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Select Sprint */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginBottom: '8px' }}>
                      1. Chọn Sprint / Tuần làm việc:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: sprints.length > 1 ? '1fr 1fr' : '1fr', gap: '10px' }}>
                      {sprints.map((sp) => {
                        const isSelected = modalSprintId === sp.id;
                        return (
                          <div
                            key={sp.id}
                            onClick={() => setModalSprintId(sp.id)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '16px',
                              background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface2)',
                              border: isSelected ? '2px solid #6366f1' : '1px solid var(--line)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#6366f1' : 'var(--fg)' }}>
                                {sp.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>
                                Trạng thái: {sp.status === 'ACTIVE' ? 'Đang chạy' : 'Đã kết thúc'}
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 size={18} color="#6366f1" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Select Round if multiple exist */}
                  {rounds.length > 1 && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginBottom: '6px' }}>
                        Đợt chấm chéo tương ứng:
                      </label>
                      <select
                        value={modalRoundId}
                        onChange={(e) => setModalRoundId(Number(e.target.value))}
                        style={{
                          width: '100%',
                          backgroundColor: 'var(--surface2)',
                          color: 'var(--fg)',
                          border: '1px solid var(--line)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      >
                        {rounds.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Select Teammate (Anti-Self-Review) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginBottom: '8px' }}>
                      2. Chọn đồng đội cần chấm điểm:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                      {members
                        .filter((m) => m.id !== currentEvaluatorId)
                        .map((m) => {
                          const isSelected = modalRevieweeId === m.id;
                          return (
                            <div
                              key={m.id}
                              onClick={() => setModalRevieweeId(m.id)}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '16px',
                                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface2)',
                                border: isSelected ? '2px solid #6366f1' : '1px solid var(--line)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                transition: 'all 0.15s ease',
                              }}
                            >
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
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#6366f1' : 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>
                                  {m.role}
                                </div>
                              </div>
                              {isSelected && <CheckCircle2 size={18} color="#6366f1" />}
                            </div>
                          );
                        })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '8px' }}>
                      ⚠️ Cơ chế Anti-Self-Review: Hệ thống tự động loại trừ chính bạn khỏi danh sách đánh giá.
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== BƯỚC 2: CHỌN THẺ ĐÃ DONE ==================== */}
              {reviewStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--fg3)' }}>
                    Chọn thẻ công việc hoàn thành của <strong>{selectedTeammate?.name}</strong> trong sprint:
                  </div>

                  {/* Option: No specific card */}
                  <div
                    onClick={() => setModalCardId(0)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: modalCardId === 0 ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface2)',
                      border: modalCardId === 0 ? '2px solid #6366f1' : '1px solid var(--line)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Award size={18} color={modalCardId === 0 ? '#6366f1' : 'var(--fg3)'} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: modalCardId === 0 ? '#6366f1' : 'var(--fg)' }}>
                          Đánh giá chung toàn sprint
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>
                          Không gắn vào một thẻ cụ thể, đánh giá tổng thể đóng góp của thành viên
                        </div>
                      </div>
                    </div>
                    {modalCardId === 0 && <CheckCircle2 size={18} color="#6366f1" />}
                  </div>

                  {/* Done Cards List */}
                  {doneCards.length === 0 ? (
                    <div
                      style={{
                        padding: '30px 20px',
                        textAlign: 'center',
                        borderRadius: '16px',
                        border: '1px dashed var(--line)',
                        color: 'var(--fg3)',
                        fontSize: '13px',
                      }}
                    >
                      Hiện chưa có thẻ nào ở cột "Done" trong sprint này. Bạn có thể chọn "Đánh giá chung toàn sprint".
                    </div>
                  ) : (
                    doneCards.map((card) => {
                      const isSelected = modalCardId === card.id;
                      return (
                        <div
                          key={card.id}
                          onClick={() => setModalCardId(card.id)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '16px',
                            background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface2)',
                            border: isSelected ? '2px solid #6366f1' : '1px solid var(--line)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <CheckSquare size={18} color={isSelected ? '#10b981' : '#10b981'} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#6366f1' : 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {card.title}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#10b981', fontWeight: 600 }}>● Đã hoàn thành (Done)</span>
                                {card.storyPoints != null && <span>· {card.storyPoints} SP</span>}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={18} color="#6366f1" className="shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ==================== BƯỚC 3: RANGE SLIDERS & COMMENT & ANONYMOUS ==================== */}
              {reviewStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Slider 1: Quality */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)' }}>
                          1. Chất lượng công việc (Quality)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--fg3)' }}>
                          Code sạch, ít bug, kiến trúc chặt chẽ, hoàn thiện đúng yêu cầu
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#6366f1' }}>
                        {modalQuality} / 5 ★
                      </span>
                    </div>

                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={modalQuality}
                      onChange={(e) => setModalQuality(Number(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: '#6366f1',
                        cursor: 'pointer',
                        margin: '8px 0',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--fg3)', fontWeight: 600 }}>
                      <span>1★ Kém</span>
                      <span>2★ Trung bình</span>
                      <span>3★ Đạt yêu cầu</span>
                      <span>4★ Tốt</span>
                      <span style={{ color: '#6366f1' }}>5★ Xuất sắc</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, marginTop: '4px', textAlign: 'right' }}>
                      {SCORE_LABELS[modalQuality]}
                    </div>
                  </div>

                  {/* Slider 2: Punctuality */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)' }}>
                          2. Tiến độ &amp; Đúng hạn (Punctuality)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--fg3)' }}>
                          Bàn giao task đúng hạn deadline cam kết, không làm nghẽn tiến độ sprint
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#10b981' }}>
                        {modalPunctuality} / 5 ★
                      </span>
                    </div>

                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={modalPunctuality}
                      onChange={(e) => setModalPunctuality(Number(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: '#10b981',
                        cursor: 'pointer',
                        margin: '8px 0',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--fg3)', fontWeight: 600 }}>
                      <span>1★ Rất trễ</span>
                      <span>2★ Chậm trễ</span>
                      <span>3★ Đúng hẹn</span>
                      <span>4★ Sớm hạn</span>
                      <span style={{ color: '#10b981' }}>5★ Xuất sắc</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, marginTop: '4px', textAlign: 'right' }}>
                      {SCORE_LABELS[modalPunctuality]}
                    </div>
                  </div>

                  {/* Slider 3: Cooperation */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)' }}>
                          3. Tinh thần hợp tác &amp; Giao tiếp (Cooperation)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--fg3)' }}>
                          Hỗ trợ đồng đội gỡ blocker, tham gia trao đổi tích cực trong daily meeting
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#f59e0b' }}>
                        {modalCooperation} / 5 ★
                      </span>
                    </div>

                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={modalCooperation}
                      onChange={(e) => setModalCooperation(Number(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: '#f59e0b',
                        cursor: 'pointer',
                        margin: '8px 0',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--fg3)', fontWeight: 600 }}>
                      <span>1★ Thụ động</span>
                      <span>2★ Ít giao tiếp</span>
                      <span>3★ Hợp tác tốt</span>
                      <span>4★ Tích cực</span>
                      <span style={{ color: '#f59e0b' }}>5★ Cống hiến cao</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginTop: '4px', textAlign: 'right' }}>
                      {SCORE_LABELS[modalCooperation]}
                    </div>
                  </div>

                  {/* Comment / Qualitative Feedback */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginBottom: '6px' }}>
                      Nhận xét định tính (Comment):
                    </label>
                    <textarea
                      value={modalFeedback}
                      onChange={(e) => setModalFeedback(e.target.value)}
                      placeholder="Ghi nhận điểm mạnh nổi bật và góp ý cải thiện cụ thể cho đồng đội..."
                      rows={3}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--surface2)',
                        color: 'var(--fg)',
                        border: '1px solid var(--line)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        fontSize: '13px',
                        outline: 'none',
                        lineHeight: 1.5,
                      }}
                      required
                    />
                  </div>

                  {/* In-form Anonymous Toggle Switch */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '14px',
                      background: modalIsAnonymous ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface2)',
                      border: modalIsAnonymous ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {modalIsAnonymous ? <EyeOff size={18} color="#6366f1" /> : <Eye size={18} color="var(--fg2)" />}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)' }}>
                          Bật chế độ Ẩn danh (Anonymous)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>
                          {modalIsAnonymous
                            ? 'Phiếu chấm sẽ hiển thị dưới danh xưng Anonymous (K-Anonymity)'
                            : 'Phiếu chấm sẽ hiển thị tên thật của bạn'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalIsAnonymous(!modalIsAnonymous)}
                      style={{
                        position: 'relative',
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        backgroundColor: modalIsAnonymous ? '#10b981' : 'var(--line)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        padding: '2px',
                        outline: 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          transform: modalIsAnonymous ? 'translateX(20px)' : 'translateX(0)',
                          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* ==================== BƯỚC 4: XÁC NHẬN & GỬI (CONFIRM) ==================== */}
              {reviewStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {/* Teammate info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          backgroundColor: selectedTeammate?.color || '#6366f1',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getInitials(selectedTeammate?.name || 'TV')}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg)' }}>
                          {selectedTeammate?.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--fg3)', marginTop: '2px' }}>
                          {selectedTeammate?.role} · {selectedSprint?.name || 'Sprint hiện tại'}
                        </div>
                      </div>
                    </div>

                    {/* Linked Done Card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--fg3)', minWidth: '90px' }}>Thẻ nhiệm vụ:</span>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>
                        {selectedCard ? `✅ ${selectedCard.title}` : 'Đánh giá chung toàn sprint'}
                      </span>
                    </div>

                    {/* Scores preview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--fg3)', minWidth: '90px' }}>Điểm bình quân:</span>
                      <span style={{ fontWeight: 800, fontSize: '15px', color: '#6366f1' }}>
                        {((modalQuality + modalPunctuality + modalCooperation) / 3).toFixed(2)} / 5.0 ★
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', marginTop: '4px' }}>
                      <div style={{ padding: '6px 8px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--line)', textAlign: 'center' }}>
                        Chất lượng: <strong>{modalQuality}★</strong>
                      </div>
                      <div style={{ padding: '6px 8px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--line)', textAlign: 'center' }}>
                        Tiến độ: <strong>{modalPunctuality}★</strong>
                      </div>
                      <div style={{ padding: '6px 8px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--line)', textAlign: 'center' }}>
                        Hợp tác: <strong>{modalCooperation}★</strong>
                      </div>
                    </div>

                    {/* Feedback preview */}
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--fg3)', marginBottom: '4px' }}>Nhận xét gửi đi:</div>
                      <div style={{ fontSize: '13px', fontStyle: 'italic', background: 'var(--surface)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--line)' }}>
                        "{modalFeedback || '(Chưa nhập nhận xét)'}"
                      </div>
                    </div>

                    {/* Identity Mode */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                      <span style={{ color: 'var(--fg3)' }}>Chế độ hiển thị:</span>
                      <span style={{ fontWeight: 600, color: modalIsAnonymous ? '#10b981' : '#6366f1' }}>
                        {modalIsAnonymous ? '🕶️ Ẩn danh (Anonymous K-Anonymity)' : '👤 Công khai tên thật'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Step Footer with Progress Bar */}
            <div
              style={{
                padding: '0.9rem 1.75rem 1.25rem',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--surface)',
              }}
            >
              {/* Progress indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    height: '6px',
                    width: '64px',
                    borderRadius: '999px',
                    background: 'var(--surface2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(reviewStep / 4) * 100}%`,
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                      transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg3)' }}>
                  Bước {reviewStep}/4
                </span>
              </div>

              {/* Navigation Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {reviewStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setReviewStep(reviewStep - 1)}
                    disabled={submittingReview}
                    style={{
                      padding: '0.55rem 1.15rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--fg)',
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <ChevronLeft size={15} /> Quay lại
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    disabled={submittingReview}
                    style={{
                      padding: '0.55rem 1.15rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--fg3)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                )}

                {reviewStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (reviewStep === 1 && (!modalRevieweeId || modalRevieweeId === currentEvaluatorId)) {
                        showToast({ message: 'Vui lòng chọn đồng đội cần đánh giá', type: 'error' });
                        return;
                      }
                      if (reviewStep === 3 && !modalFeedback.trim()) {
                        showToast({ message: 'Vui lòng điền nhận xét định tính cho đồng đội', type: 'error' });
                        return;
                      }
                      setReviewStep(reviewStep + 1);
                    }}
                    style={{
                      padding: '0.55rem 1.4rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#6366f1',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    }}
                  >
                    Tiếp tục <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalSubmitReview}
                    disabled={submittingReview}
                    style={{
                      padding: '0.55rem 1.45rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#6366f1',
                      border: 'none',
                      cursor: submittingReview ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    }}
                  >
                    {submittingReview ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                    Xác nhận gửi đánh giá
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ==================== MULTI-STEP MODAL: TẠO ĐỢT MỚI (3 BƯỚC) ==================== */}
      {/* ========================================================================= */}
      {showCreateModal && (
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
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !creatingRound) setShowCreateModal(false);
          }}
        >
          <div
            className="mini-window"
            style={{
              width: '100%',
              maxWidth: '540px',
              borderRadius: '26px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px var(--glass-line)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.25s ease',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.5rem 1.75rem 0.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div style={{ flex: 1, paddingRight: '1.5rem' }}>
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
                  {createRoundStep === 1 && 'Chọn Sprint áp dụng'}
                  {createRoundStep === 2 && 'Thiết lập đợt chấm chéo'}
                  {createRoundStep === 3 && 'Xác nhận khởi tạo đợt chấm'}
                </h2>
                <p
                  style={{
                    margin: '0.4rem 0 0',
                    fontSize: '0.85rem',
                    color: 'var(--fg3)',
                    lineHeight: 1.45,
                  }}
                >
                  {createRoundStep === 1 && 'Chọn sprint nhiệm vụ mà đợt chấm chéo này sẽ đánh giá kết quả.'}
                  {createRoundStep === 2 && 'Đặt tên đợt chấm và khoảng thời gian mở cổng nhận đánh giá.'}
                  {createRoundStep === 3 && 'Kiểm tra thông tin đợt chấm trước khi phát hành cho cả nhóm.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingRound}
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
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: '1.25rem 1.75rem 1.25rem' }}>
              {createRoundStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                    Chọn Sprint mục tiêu:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sprints.map((s) => {
                      const isSelected = newRoundSprintId === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => setNewRoundSprintId(s.id)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '16px',
                            background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface2)',
                            border: isSelected ? '2px solid #6366f1' : '1px solid var(--line)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Calendar size={18} color={isSelected ? '#6366f1' : 'var(--fg3)'} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#6366f1' : 'var(--fg)' }}>
                                {s.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>
                                Trạng thái: {s.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã kết thúc'}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 size={18} color="#6366f1" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {createRoundStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginBottom: '6px' }}>
                      Tên đợt chấm chéo:
                    </label>
                    <input
                      type="text"
                      value={newRoundName}
                      onChange={(e) => setNewRoundName(e.target.value)}
                      placeholder="Ví dụ: Đợt chấm chéo Sprint 3 (Giữa kỳ)"
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--surface2)',
                        color: 'var(--fg)',
                        border: '1px solid var(--line)',
                        borderRadius: '12px',
                        padding: '11px 14px',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--fg3)', marginBottom: '6px' }}>
                        Ngày bắt đầu mở cổng:
                      </label>
                      <input
                        type="date"
                        value={newRoundStartDate}
                        onChange={(e) => setNewRoundStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: 'var(--surface2)',
                          color: 'var(--fg)',
                          border: '1px solid var(--line)',
                          borderRadius: '12px',
                          padding: '9px 12px',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--fg3)', marginBottom: '6px' }}>
                        Ngày kết thúc đóng cổng:
                      </label>
                      <input
                        type="date"
                        value={newRoundEndDate}
                        onChange={(e) => setNewRoundEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: 'var(--surface2)',
                          color: 'var(--fg)',
                          border: '1px solid var(--line)',
                          borderRadius: '12px',
                          padding: '9px 12px',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {createRoundStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--fg3)', minWidth: '90px' }}>Tên đợt:</span>
                      <strong style={{ color: 'var(--fg)' }}>{newRoundName}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--fg3)', minWidth: '90px' }}>Sprint:</span>
                      <span>{sprints.find((s) => s.id === newRoundSprintId)?.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--fg3)', minWidth: '90px' }}>Thời hạn:</span>
                      <span>
                        {newRoundStartDate ? new Date(newRoundStartDate).toLocaleDateString('vi-VN') : 'Ngay sau khi tạo'} → {newRoundEndDate ? new Date(newRoundEndDate).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                      <Check size={14} /> Trạng thái ban đầu: Bản nháp (DRAFT) - Có thể mở nhận đánh giá ngay
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Step Footer with Progress Bar */}
            <div
              style={{
                padding: '0.9rem 1.75rem 1.25rem',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    height: '6px',
                    width: '60px',
                    borderRadius: '999px',
                    background: 'var(--surface2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(createRoundStep / 3) * 100}%`,
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                      transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg3)' }}>
                  Bước {createRoundStep}/3
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {createRoundStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCreateRoundStep(createRoundStep - 1)}
                    disabled={creatingRound}
                    style={{
                      padding: '0.55rem 1.15rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--fg)',
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <ChevronLeft size={15} /> Quay lại
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={creatingRound}
                    style={{
                      padding: '0.55rem 1.15rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--fg3)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                )}

                {createRoundStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (createRoundStep === 2 && !newRoundName.trim()) {
                        showToast({ message: 'Vui lòng nhập tên đợt chấm chéo', type: 'error' });
                        return;
                      }
                      setCreateRoundStep(createRoundStep + 1);
                    }}
                    style={{
                      padding: '0.55rem 1.4rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#6366f1',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    }}
                  >
                    Tiếp tục <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalCreateRound}
                    disabled={creatingRound}
                    style={{
                      padding: '0.55rem 1.45rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#6366f1',
                      border: 'none',
                      cursor: creatingRound ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    }}
                  >
                    {creatingRound ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    Tạo đợt chấm
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewRoundPage;
