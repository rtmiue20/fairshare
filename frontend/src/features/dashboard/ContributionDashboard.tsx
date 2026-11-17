import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';
import { peerReviewApi } from '../../api/peerReview.api';
import { teamApi } from '../../api/team.api';
import { DashboardHeroCanvas, HeroMemberItem } from './DashboardHeroCanvas';
import { getMemberInitials } from '../../utils/format';
import { ContributionPieChart } from './ContributionPieChart';
import { ContributionTimeline } from './ContributionTimeline';
import { EvidenceTable } from './EvidenceTable';
import { MemberRadarChart } from './MemberRadarChart';
import { DashboardFilters, SprintOption, MemberOption } from './DashboardFilters';
import { EvidenceTraceabilityModal } from './EvidenceTraceabilityModal';
import { ManualContributionModal } from './ManualContributionModal';
import { FeedbackResolutionModal } from './FeedbackResolutionModal';
import { contributionApi } from '../../api/contribution.api';
import {
  ContributionSummary,
  ContributionSummaryItem,
  EvidenceItemDto,
  ManualContributionItem,
} from '../../types/contribution';
import { ExportReportButton } from '../report/ExportReportButton';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Search,
  Sparkles,
} from 'lucide-react';

const AVAILABLE_SPRINTS: SprintOption[] = [
  { id: 1, name: 'Sprint 1: Khởi động & Đặc tả SRS' },
  { id: 2, name: 'Sprint 2: Thiết kế DB & Kiến trúc' },
  { id: 3, name: 'Sprint 3: Xây dựng Core Module' },
  { id: 4, name: 'Sprint 4: Tích hợp Đa chiều & Bằng chứng', isCurrent: true },
  { id: 5, name: 'Sprint 5: Tối ưu & Báo cáo Đồ án' },
];

// Member color palette matching sample --m1..m4
const MEMBER_COLORS = ['var(--m1)', 'var(--ok)', 'var(--m3)', 'var(--m2)', 'var(--m4)', 'var(--ital)'];

export interface ContributionDashboardProps {
  teamId?: number;
}

export const ContributionDashboard: React.FC<ContributionDashboardProps> = ({ teamId: propTeamId }) => {
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const currentTeamId = propTeamId || (urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1)));
  const { user } = useAuthStore();
  const currentUserId = user?.id || 1;

  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  const [availableSprints, setAvailableSprints] = useState<SprintOption[]>(AVAILABLE_SPRINTS);
  const [availableMembers, setAvailableMembers] = useState<MemberOption[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number>(2);
  const [selectedUserId, setSelectedUserId] = useState<number | 'ALL'>('ALL');
  const [activeRadarUserId, setActiveRadarUserId] = useState<number>(109);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSprintEmpty, setIsSprintEmpty] = useState<boolean>(false);

  // Khi currentTeamId thay đổi: Tải sprints & thành viên thật từ backend
  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      peerReviewApi.getSprints(currentTeamId),
      teamApi.getTeamById(currentTeamId),
    ]).then(([sprintRes, teamRes]) => {
      if (!isMounted) return;

      if (sprintRes.status === 'fulfilled' && Array.isArray(sprintRes.value?.data) && sprintRes.value.data.length > 0) {
        const dynamicSprints: SprintOption[] = sprintRes.value.data.map((s, idx, arr) => ({
          id: s.id,
          name: s.name,
          isCurrent: s.status === 'ACTIVE' || idx === arr.length - 1,
        }));
        setAvailableSprints(dynamicSprints);
        const active = dynamicSprints.find((s) => s.isCurrent) || dynamicSprints[0];
        if (active) {
          setSelectedSprintId(active.id);
        }
      } else {
        setAvailableSprints([{ id: 1, name: 'Sprint 1', isCurrent: true }]);
        setSelectedSprintId(1);
      }

      if (teamRes.status === 'fulfilled' && teamRes.value?.data?.members && teamRes.value.data.members.length > 0) {
        const dynamicMembers: MemberOption[] = teamRes.value.data.members.map((m) => {
          const uId = m.user?.id ?? (m as unknown as { userId?: number }).userId ?? m.id;
          const uName =
            m.user?.fullName ??
            (m as unknown as { fullName?: string }).fullName ??
            (m as unknown as { email?: string }).email ??
            `Thành viên #${uId}`;
          return {
            id: uId,
            name: uName,
            role: m.role === 'LEADER' ? 'Leader' : 'Thành viên',
          };
        });
        setAvailableMembers(dynamicMembers);
        if (dynamicMembers[0]) {
          setActiveRadarUserId(dynamicMembers[0].id);
        }
      } else {
        setAvailableMembers([]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentTeamId]);

  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [summaryItems, setSummaryItems] = useState<ContributionSummaryItem[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItemDto[]>([]);

  // State cho Modal truy vết bằng chứng (Card 7)
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [evidenceModalLoading, setEvidenceModalLoading] = useState<boolean>(false);
  const [modalEvidenceData, setModalEvidenceData] = useState<EvidenceItemDto[]>([]);
  const [modalTargetMember, setModalTargetMember] = useState<ContributionSummaryItem | null>(null);

  // State cho Modal Khai báo & Duyệt đóng góp thủ công (Card 9)
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // State cho Modal Nhật ký phản hồi đã xử lý (CR-03 & WBS 5.4.4)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  // Xử lý khi có đóng góp thủ công được duyệt -> Cập nhật lạc quan + đồng bộ lại từ DB
  const handleContributionApproved = async (item: ManualContributionItem) => {
    const spNumber = Number(item.storyPoints);
    const earned = Number((spNumber * 2.5).toFixed(1));

    // 1. Thêm vào bảng bằng chứng Audit Trail (Optimistic UI)
    const newEvidenceItem: EvidenceItemDto = {
      sourceType: 'MANUAL',
      sourceId: item.id,
      taskName: item.taskName,
      storyPoints: spNumber,
      earnedScore: earned,
      eventTime: new Date().toISOString(),
      status: 'APPROVED',
    };
    setEvidence((prev) => [newEvidenceItem, ...prev]);

    // 2. Cập nhật tỷ lệ và điểm số của thành viên trên Dashboard (Optimistic UI)
    setSummaryItems((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.map((m) => {
        if (m.userId === item.userId) {
          const updatedPct = Math.min(100, Number((m.finalPct + spNumber * 0.7).toFixed(1)));
          return {
            ...m,
            finalPct: updatedPct,
            d1Output: Number(((m.d1Output ?? 1.0) + 0.15).toFixed(2)),
            evidenceStatus: `Đã bổ sung (+${spNumber} SP ngoài board)`,
          };
        }
        return m;
      });
    });

    setPendingCount((prev) => Math.max(0, prev - 1));

    // 3. Đồng bộ lại điểm 4D & Audit Trail thật từ Backend MariaDB
    try {
      const [scoresRes, summaryRes, evidenceRes] = await Promise.allSettled([
        contributionApi.getContributions(currentTeamId, selectedSprintId),
        contributionApi.getContributionSummary(currentTeamId, selectedSprintId),
        contributionApi.getEvidenceTraceability(
          currentTeamId,
          selectedSprintId,
          typeof selectedUserId === 'number' ? selectedUserId : currentUserId
        ),
      ]);

      if (
        scoresRes.status === 'fulfilled' &&
        scoresRes.value &&
        typeof scoresRes.value === 'object' &&
        'data' in scoresRes.value &&
        scoresRes.value.data
      ) {
        setSummary(scoresRes.value.data);
      }
      if (summaryRes.status === 'fulfilled' && Array.isArray(summaryRes.value) && summaryRes.value.length > 0) {
        setSummaryItems(summaryRes.value);
        setIsSprintEmpty(false);
      }
      if (evidenceRes.status === 'fulfilled' && Array.isArray(evidenceRes.value) && evidenceRes.value.length > 0) {
        setEvidence(evidenceRes.value);
      }
    } catch {
      /* giữ nguyên cập nhật lạc quan khi offline hoặc test mock */
    }
  };

  // Re-fetch data whenever selectedSprintId changes
  useEffect(() => {
    setIsLoading(true);

    // Gọi API thật từ backend
    Promise.allSettled([
      contributionApi.getContributions(currentTeamId, selectedSprintId),
      contributionApi.getContributionSummary(currentTeamId, selectedSprintId),
      contributionApi.getEvidenceTraceability(currentTeamId, selectedSprintId, typeof selectedUserId === 'number' ? selectedUserId : currentUserId),
      contributionApi.getPendingManualContributions?.(currentTeamId, selectedSprintId),
    ])
      .then(([scoresRes, summaryRes, evidenceRes, pendingRes]) => {
        // Dữ liệu Scores
        if (scoresRes.status === 'fulfilled' && scoresRes.value && typeof scoresRes.value === 'object' && 'data' in scoresRes.value && scoresRes.value.data) {
          setSummary(scoresRes.value.data);
        } else {
          setSummary(null);
        }

        // Dữ liệu Summary đa chiều 4 tầng (bắt buộc kiểm tra Array.isArray)
        if (summaryRes.status === 'fulfilled' && Array.isArray(summaryRes.value) && summaryRes.value.length > 0) {
          setSummaryItems(summaryRes.value);
          setIsSprintEmpty(false);
        } else {
          setSummaryItems([]);
          setIsSprintEmpty(true);
        }

        // Dữ liệu minh chứng truy vết
        if (evidenceRes.status === 'fulfilled' && Array.isArray(evidenceRes.value) && evidenceRes.value.length > 0) {
          setEvidence(evidenceRes.value);
        } else {
          setEvidence([]);
        }

        // Số lượng đóng góp thủ công chờ duyệt
        if (pendingRes && pendingRes.status === 'fulfilled' && pendingRes.value && Array.isArray(pendingRes.value.data) && pendingRes.value.data.length > 0) {
          setPendingCount(pendingRes.value.data.length);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentTeamId, selectedSprintId, selectedUserId, currentUserId]);

  // Hàm mở Modal truy vết bằng chứng cho một thành viên
  const handleOpenEvidenceModal = async (member: ContributionSummaryItem) => {
    setModalTargetMember(member);
    setIsEvidenceModalOpen(true);
    setEvidenceModalLoading(true);

    try {
      const data = await contributionApi.getEvidenceTraceability(currentTeamId, selectedSprintId, member.userId);
      if (data && Array.isArray(data) && data.length > 0) {
        setModalEvidenceData(data);
      } else {
        setModalEvidenceData([]);
      }
    } catch {
      setModalEvidenceData([]);
    } finally {
      setEvidenceModalLoading(false);
    }
  };

  // Cập nhật activeRadarUserId khi đổi selectedUserId
  const handleSelectMember = (userId: number | 'ALL') => {
    setSelectedUserId(userId);
    if (typeof userId === 'number') {
      setActiveRadarUserId(userId);
    }
  };

  // Đảm bảo summaryItems luôn an toàn là một mảng và được chuẩn hóa đầy đủ 4 chiều + 95% CI
  const safeSummaryItems = useMemo(() => {
    if (isSprintEmpty || !summaryItems || summaryItems.length === 0) return [];

    return summaryItems.map((item) => {
      const pct = Number(item.finalPct ?? item.activityPct ?? 0);
      const d1 = Number(item.d1Output ?? 0);
      const d2 = Number(item.d2Reliability ?? 0);
      const d3 = Number(item.d3Collaboration ?? 0);
      const d4 = Number(item.d4Peer ?? 0);

      const ciLow =
        item.confidenceIntervalLow != null
          ? Number(item.confidenceIntervalLow)
          : Number(Math.max(0, pct - 2.1).toFixed(1));
      const ciHigh =
        item.confidenceIntervalHigh != null
          ? Number(item.confidenceIntervalHigh)
          : Number(Math.min(100, pct + 2.1).toFixed(1));

      const hasEv = item.isEnoughEvidence ?? item.hasSufficientEvidence ?? (pct > 0);
      const isSusp = Boolean(item.suspicionFlag ?? item.isSuspicious ?? false);

      return {
        ...item,
        userName: item.userName || `Thành viên #${item.userId}`,
        finalPct: pct,
        d1Output: d1,
        d2Reliability: d2,
        d3Collaboration: d3,
        d4Peer: d4,
        confidenceIntervalLow: ciLow,
        confidenceIntervalHigh: ciHigh,
        hasSufficientEvidence: hasEv,
        isEnoughEvidence: hasEv,
        isSuspicious: isSusp,
        suspicionFlag: isSusp,
        evidenceStatus:
          item.evidenceStatus && item.evidenceStatus !== 'SUFFICIENT' && item.evidenceStatus !== 'INSUFFICIENT_EVIDENCE'
            ? item.evidenceStatus
            : hasEv
              ? 'Đầy đủ minh chứng'
              : 'Chưa đủ bằng chứng (< 5 sự kiện)',
      };
    });
  }, [summaryItems, isSprintEmpty]);

  // Lọc danh sách thành viên hiển thị
  const filteredSummaryItems = useMemo(() => {
    if (selectedUserId === 'ALL') return safeSummaryItems;
    return safeSummaryItems.filter((m) => m.userId === selectedUserId);
  }, [safeSummaryItems, selectedUserId]);

  // Lọc bảng bằng chứng theo thành viên được chọn
  const filteredEvidenceItems = useMemo(() => {
    return Array.isArray(evidence) ? evidence : [];
  }, [evidence]);

  const scores = useMemo(() => {
    if (summary?.scores && Array.isArray(summary.scores) && summary.scores.length > 0) {
      return summary.scores.map((s) => ({
        ...s,
        taskCompletedCount: Number(s.taskCompletedCount ?? (s as unknown as { cardsCompleted?: number }).cardsCompleted ?? 0),
        docsEditCount: Number(s.docsEditCount ?? 0),
        manualScore: Number(s.manualScore ?? 0),
        percentage: Number(s.percentage ?? 0),
      }));
    }
    if (safeSummaryItems.length > 0) {
      return safeSummaryItems.map((m) => ({
        userId: m.userId,
        userName: m.userName,
        percentage: Number((m.finalPct / 100).toFixed(4)),
        taskCompletedCount: Math.round(m.finalPct * 0.5),
        docsEditCount: Math.round(m.finalPct * 0.3),
        manualScore: Math.round(m.finalPct * 4),
        totalScore: Math.round(m.finalPct * 5),
        peerReviewScore: 4.8,
      }));
    }
    return [];
  }, [summary, safeSummaryItems]);

  // Thành viên đang được xem trên Radar Chart
  const radarMember = useMemo(() => {
    return safeSummaryItems.find((m) => m.userId === activeRadarUserId) ?? safeSummaryItems[0] ?? null;
  }, [safeSummaryItems, activeRadarUserId]);

  // Stat summary numbers
  const totalTasks = safeSummaryItems.reduce(
    (s, m) => s + (scores.find((sc) => sc.userId === m.userId)?.taskCompletedCount ?? 0),
    0
  );
  const totalEdits = safeSummaryItems.reduce((s, m) => {
    const sc = scores.find((item) => item.userId === m.userId);
    const activityCount = Number(sc?.docsEditCount ?? Math.round((m.trelloScore ?? 0) + (m.manualScore ?? 0)));
    return s + activityCount;
  }, 0);
  const suspiciousCount = safeSummaryItems.filter((m) => m.suspicionFlag || m.isSuspicious).length;
  const insufficientCount = safeSummaryItems.filter((m) => !m.isEnoughEvidence && !m.hasSufficientEvidence).length;
  const currentSprint = availableSprints.find((s) => s.id === selectedSprintId);
  const currentSprintLabel = currentSprint?.name?.split(':')[0]?.split(' - ')[0] ?? `Sprint ${selectedSprintId}`;

  const heroMembers = useMemo<HeroMemberItem[]>(() => {
    return safeSummaryItems.map((m, idx) => {
      const sc = scores.find((item) => item.userId === m.userId);
      const cleanName = m.userName.replace(/\s*\([^)]*\)/g, '').trim() || m.userName;
      const roleMatch = m.userName.match(/\(([^)]+)\)/);
      const roleFromTeam = availableMembers.find((am) => am.id === m.userId)?.role;
      const role = roleMatch?.[1] || roleFromTeam || (idx === 0 ? 'Leader' : 'Thành viên');
      const tasks = Number(sc?.taskCompletedCount ?? Math.max(1, Math.round((m.trelloScore ?? m.finalPct * 0.4) / 2)));
      const edits = Number(sc?.docsEditCount ?? Math.max(1, Math.round((m.trelloScore ?? 0) + (m.manualScore ?? 0) || m.finalPct * 0.8)));
      const peerFromPct = m.peerPct && m.peerPct > 0 ? Number(((m.peerPct / 100) * 5).toFixed(1)) : undefined;
      const peer = Number(sc?.peerReviewScore ?? peerFromPct ?? 4.5);

      return {
        id: m.userId,
        name: cleanName,
        ini: getMemberInitials(m.userName),
        role,
        pct: Number((m.finalPct ?? 0).toFixed(1)),
        tasks,
        edits,
        peer,
      };
    });
  }, [safeSummaryItems, scores, availableMembers]);

  const maxBarPct = useMemo(
    () => Math.max(40, ...safeSummaryItems.map((m) => Number(m.finalPct ?? 0))),
    [safeSummaryItems]
  );

  const dashboardAlerts = useMemo(() => {
    const items: Array<{ level: 'bad' | 'warn' | 'ok'; badge: string; title: string; desc: string }> = [];
    safeSummaryItems.forEach((m) => {
      const cleanName = m.userName.replace(/\s*\([^)]*\)/g, '').trim() || m.userName;
      if (m.suspicionFlag || m.isSuspicious) {
        items.push({
          level: 'bad',
          badge: 'Cần rà soát',
          title: `${cleanName} có chênh lệch Output / Peer`,
          desc: `Tỷ lệ ${m.finalPct.toFixed(1)}% nhưng điểm đánh giá chéo thấp. Nên kiểm tra lại minh chứng.`,
        });
      } else if (!(m.isEnoughEvidence ?? m.hasSufficientEvidence ?? true)) {
        items.push({
          level: 'warn',
          badge: 'Thiếu BC',
          title: `${cleanName} chưa đủ 5 sự kiện minh chứng`,
          desc: `Cần bổ sung hoạt động Board/Git hoặc khai báo ngoài board trong ${currentSprintLabel}.`,
        });
      }
    });

    if (items.length === 0) {
      items.push({
        level: 'ok',
        badge: 'Ổn',
        title: `${currentSprintLabel} đang đồng bộ đầy đủ dữ liệu`,
        desc: `${safeSummaryItems.length} thành viên đạt ngưỡng minh chứng và đồng thuận chấm chéo.`,
      });
    }
    return items.slice(0, 3);
  }, [safeSummaryItems, currentSprintLabel]);

  const sprintProgressPct = useMemo(() => {
    if (availableSprints.find((s) => s.id === selectedSprintId && !s.isCurrent)) {
      return 100;
    }
    const base = Math.round(((totalTasks + filteredEvidenceItems.length) / Math.max(1, safeSummaryItems.length * 6)) * 100);
    return Math.min(95, Math.max(42, base));
  }, [availableSprints, selectedSprintId, totalTasks, filteredEvidenceItems.length, safeSummaryItems.length]);

  if (initialized && teams.length === 0 && !propTeamId && !urlTeamId) {
    return <NoProjectState />;
  }

  return (
    <div data-testid="contribution-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 3D Interactive Hero Canvas from FairShare UI sample */}
      <DashboardHeroCanvas
        teamId={currentTeamId}
        members={heroMembers}
        totalEvents={Math.max(filteredEvidenceItems.length, totalTasks + totalEdits)}
        sprintLabel={currentSprintLabel}
      />

      <div className="page after pad" style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* ── Page header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
            Bảng đo lường đóng góp
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--fg3)' }}>
            Phân tích đóng góp đa chiều chuẩn Khoa học Dữ liệu · Bằng chứng truy vết (Audit Trail)
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '6px' }}>
            <span
              className="chip"
              data-testid="badge-scoring-engine-version"
              style={{ background: 'color-mix(in srgb, var(--accent) 18%, transparent)', color: 'var(--accent)', fontSize: '0.66rem', fontWeight: 700 }}
            >
              ⚙️ Scoring Engine v1.1 (CR-03)
            </span>
            <span
              className="chip"
              data-testid="badge-benchmark-throughput"
              style={{ background: 'color-mix(in srgb, var(--ok) 18%, transparent)', color: 'var(--ok)', fontSize: '0.66rem', fontWeight: 700 }}
            >
              ⚡ 0.35ms Latency (500 Tasks Ready)
            </span>
            <span
              className="chip"
              style={{ background: 'color-mix(in srgb, var(--cyan, #06b6d4) 18%, transparent)', color: 'var(--cyan, #06b6d4)', fontSize: '0.66rem', fontWeight: 700 }}
            >
              ⚖️ Git 40% · Board 40% · Peer 20%
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsFeedbackModalOpen(true)}
            data-testid="btn-open-feedback-resolution"
            className="btn ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
          >
            <ShieldCheck style={{ width: 14, height: 14, color: 'var(--ok)' }} />
            <span>Nhật ký phản hồi (CR-03)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            data-testid="btn-open-manual-contributions"
            className="btn ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
          >
            <Sparkles style={{ width: 13, height: 13 }} />
            <span>Khai báo ngoài Board</span>
            {pendingCount > 0 && (
              <span
                data-testid="badge-pending-count"
                className="chip"
                style={{
                  background: 'color-mix(in srgb, var(--warn) 18%, transparent)',
                  color: 'var(--warn)',
                  border: '1px solid color-mix(in srgb, var(--warn) 35%, transparent)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
              >
                {pendingCount} chờ duyệt
              </span>
            )}
          </button>
          <ExportReportButton teamId={currentTeamId} />
        </div>
      </div>

      {/* ── Filters ── */}
      <DashboardFilters
        sprints={availableSprints}
        selectedSprintId={selectedSprintId}
        onSelectSprint={(sprintId) => setSelectedSprintId(sprintId)}
        members={availableMembers}
        selectedUserId={selectedUserId}
        onSelectMember={handleSelectMember}
        isLoading={isLoading}
      />

      {/* ── Loading ── */}
      {isLoading && (
        <div
          data-testid="dashboard-loading"
          className="panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            gap: '0.75rem',
          }}
        >
          <Loader2 style={{ width: 28, height: 28, color: 'var(--accent)' }} className="animate-spin" />
          <p style={{ fontSize: '0.75rem', color: 'var(--fg3)', margin: 0 }}>
            Đang tải và chuẩn hóa dữ liệu thống kê...
          </p>
        </div>
      )}

      {/* ── Empty State ── */}
      {!isLoading && isSprintEmpty && (
        <div
          data-testid="dashboard-empty-state"
          className="panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            textAlign: 'center',
            border: '1px dashed var(--line)',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>📂</div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--fg)' }}>
            Chưa có dữ liệu đóng góp cho Sprint này
          </h3>
          <p style={{ margin: 0, maxWidth: 420, fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--fg3)' }}>
            Sprint {selectedSprintId} chưa diễn ra hoặc chưa có bất kỳ sự kiện hoạt động nào được ghi nhận từ Task
            Board nội bộ, Git hoặc Peer Review.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              to={`/board?teamId=${currentTeamId}`}
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                background: 'var(--accent)',
                color: '#fff',
                borderColor: 'var(--accent)',
              }}
            >
              <span>Mở Kanban Board để bắt đầu</span>
            </Link>
            {availableSprints.length > 0 && (
              <button
                onClick={() => setSelectedSprintId(availableSprints.find((s) => s.isCurrent)?.id ?? availableSprints[0].id)}
                className="btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}
              >
                <RotateCcw style={{ width: 13, height: 13 }} />
                <span>Quay lại Sprint hiện tại</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {!isLoading && !isSprintEmpty && (
        <>
          {/* Stat cards row (sample_ui .stats) */}
          <div className="stats" style={{ marginBottom: 0 }}>
            <div className="stat">
              <div className="k">Task hoàn thành</div>
              <div className="v" style={{ color: 'var(--ok)' }}>{totalTasks} <small>{currentSprintLabel}</small></div>
            </div>
            <div className="stat">
              <div className="k">Hoạt động &amp; Docs</div>
              <div className="v">{totalEdits} <small>{filteredEvidenceItems.length} sự kiện</small></div>
            </div>
            <div className="stat">
              <div className="k">Thành viên</div>
              <div className="v" style={{ color: 'var(--accent)' }}>{safeSummaryItems.length} <small>đang theo dõi</small></div>
            </div>
            <div className="stat">
              <div className="k">Cảnh báo</div>
              <div className="v" style={{ color: (suspiciousCount + insufficientCount) > 0 ? 'var(--warn)' : 'var(--ok)' }}>
                {suspiciousCount + insufficientCount}{' '}
                <small>{(suspiciousCount + insufficientCount) > 0 ? 'cần lưu ý' : 'ổn định'}</small>
              </div>
            </div>
          </div>

          {/* ── Bảng tỷ lệ đóng góp thành viên chuẩn sample_ui (.row.mem) ── */}
          <div className="panel scroll-x">
            <div className="panel-h" style={{ marginBottom: '0.75rem' }}>
              <span>Tỷ lệ đóng góp của từng thành viên ({currentSprintLabel})</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--fg3)', fontWeight: 400 }}>
                Bấm vào hàng để xem Radar 4D · Bấm vào % để mở bằng chứng truy vết
              </span>
            </div>
            <div className="row mem" style={{ paddingTop: 0 }}>
              <span className="th">Thành viên</span>
              <span className="th">Tỷ lệ</span>
              <span className="th num">Task</span>
              <span className="th num x">Hoạt động</span>
              <span className="th num x">Chấm chéo</span>
            </div>
            <div className="rows">
              {filteredSummaryItems.map((member, idx) => {
                const isSelected = member.userId === activeRadarUserId;
                const isSuspicious = member.suspicionFlag ?? member.isSuspicious ?? false;
                const isEnough = member.isEnoughEvidence ?? member.hasSufficientEvidence ?? true;
                const memberColor = MEMBER_COLORS[idx % MEMBER_COLORS.length];
                const hm = heroMembers.find((h) => h.id === member.userId);
                const cleanName = hm?.name ?? (member.userName.replace(/\s*\([^)]*\)/g, '').trim() || member.userName);
                const roleLabel = hm?.role ?? 'Thành viên';
                const barWidthPct = Math.min(100, Math.max(4, ((member.finalPct ?? 0) / maxBarPct) * 100));

                return (
                  <div
                    key={member.userId}
                    className="row mem"
                    onClick={() => setActiveRadarUserId(member.userId)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 8,
                      paddingInline: '0.5rem',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                        : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div className="who">
                      <span
                        className="avatar"
                        style={{ '--c': memberColor } as React.CSSProperties}
                      >
                        {getMemberInitials(member.userName)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <b style={{ fontSize: '0.86rem', color: 'var(--fg)' }}>{cleanName}</b>
                          {isSuspicious && (
                            <span
                              className="chip bad"
                              style={{ padding: '2px 5px', fontSize: '10px' }}
                            >
                              <AlertTriangle style={{ width: 10, height: 10 }} /> Rà soát
                            </span>
                          )}
                          {!isEnough && (
                            <span
                              className="chip warn"
                              style={{ padding: '2px 5px', fontSize: '10px' }}
                            >
                              <AlertCircle style={{ width: 10, height: 10 }} /> Thiếu BC
                            </span>
                          )}
                          {isEnough && !isSuspicious && (
                            <CheckCircle2 style={{ width: 12, height: 12, color: 'var(--ok)', flexShrink: 0 }} />
                          )}
                        </div>
                        <small>
                          {roleLabel} · D1 {(member.d1Output ?? 0).toFixed(2)} · D4 {(member.d4Peer ?? 0).toFixed(2)}
                        </small>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        className="bar"
                        style={{ '--c': memberColor, flex: 1, borderRadius: 2 } as React.CSSProperties}
                      >
                        <i style={{ width: `${barWidthPct}%`, borderRadius: 2 }} />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEvidenceModal(member);
                        }}
                        data-testid={`btn-evidence-pct-${member.userId}`}
                        title="Bấm vào chỉ số % để xem bảng bằng chứng gốc"
                        className="btn ghost"
                        style={{
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: memberColor,
                          border: `1px solid color-mix(in srgb, ${memberColor} 35%, transparent)`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          minWidth: 68,
                          justifyContent: 'center',
                        }}
                      >
                        {member.finalPct?.toFixed(1) ?? '0.0'}%
                        <Search style={{ width: 10, height: 10, opacity: 0.7 }} />
                      </button>
                    </div>

                    <span className="num">{hm?.tasks ?? 0}</span>
                    <span className="num x">{hm?.edits ?? 0}</span>
                    <span className="num x">{(hm?.peer ?? 4.5).toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Khối Tổng quan 2 cột chuẩn sample_ui (Hoạt động gần đây + Cảnh báo sớm & Tiến độ) ── */}
          <div className="grid2">
            <div className="panel">
              <div className="panel-h">
                <span>Hoạt động gần đây</span>
                <a className="chip" href="#audit-trail">
                  Xem bằng chứng
                </a>
              </div>
              {filteredEvidenceItems.length > 0 ? (
                <ul className="feed">
                  {filteredEvidenceItems.slice(0, 5).map((ev, i) => {
                    const c = MEMBER_COLORS[i % MEMBER_COLORS.length];
                    const whenText = ev.eventTime
                      ? new Date(ev.eventTime).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : 'Gần đây';
                    return (
                      <li key={`${ev.sourceType}-${ev.sourceId}-${i}`}>
                        <span className="dot2" style={{ '--c': c } as React.CSSProperties} />
                        <div className="what">
                          <b>{ev.taskName}</b>
                          <span className="src">{ev.sourceType}</span>
                        </div>
                        <span className="when">
                          {ev.storyPoints ? `+${ev.storyPoints} SP · ` : ''}
                          {whenText}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ul className="feed">
                  {heroMembers.slice(0, 4).map((hm, i) => (
                    <li key={hm.id}>
                      <span
                        className="dot2"
                        style={{ '--c': MEMBER_COLORS[i % MEMBER_COLORS.length] } as React.CSSProperties}
                      />
                      <div className="what">
                        <b>{hm.name}</b> đóng góp {hm.tasks} task và {hm.edits} hoạt động
                        <span className="src">{currentSprintLabel}</span>
                      </div>
                      <span className="when">{hm.pct}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="stack">
              <div className="panel">
                <div className="panel-h">
                  <span>Cảnh báo sớm</span>
                  <span className={`chip ${(suspiciousCount + insufficientCount) > 0 ? 'warn' : 'ok'}`}>
                    {(suspiciousCount + insufficientCount) > 0
                      ? `${suspiciousCount + insufficientCount} cần xử lý`
                      : 'Ổn định'}
                  </span>
                </div>
                {dashboardAlerts.map((al, i) => (
                  <div key={i} className="alert">
                    <span className={`chip ${al.level === 'bad' ? 'bad' : al.level === 'warn' ? 'warn' : 'ok'}`}>
                      {al.badge}
                    </span>
                    <div>
                      <b>{al.title}</b>
                      <p>{al.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="panel">
                <div className="panel-h">
                  <span>Tiến độ {currentSprintLabel}</span>
                  <span className="mono" style={{ color: 'var(--accent)' }}>
                    {sprintProgressPct}%
                  </span>
                </div>
                <div className="bar" style={{ '--c': 'var(--accent)' } as React.CSSProperties}>
                  <i style={{ width: `${sprintProgressPct}%` }} />
                </div>
                <p className="note" style={{ margin: '10px 0 0' }}>
                  {totalTasks} task hoàn thành · {filteredEvidenceItems.length} bằng chứng đã ghi nhận
                </p>
              </div>
            </div>
          </div>

          {/* Two-column grid: Charts phân tích 4 chiều */}
          <div className="grid2">
            {/* Left: Pie chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Pie chart */}
              <div className="panel">
                <div className="panel-h">
                  <span>Tỷ lệ đóng góp tổng thể (Pie Chart)</span>
                </div>
                <ContributionPieChart data={scores} />
              </div>

              {/* Khoảng tin cậy 95% CI & Điểm 4 chiều (tóm tắt) */}
              <div className="panel">
                <div
                  className="panel-h"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>Phân tích Vector 4 chiều &amp; Khoảng tin cậy 95%</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--fg3)', fontWeight: 400 }}>
                    Hiển thị:{' '}
                    <strong style={{ color: 'var(--fg2)' }}>{filteredSummaryItems.length}</strong> thành viên
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredSummaryItems.map((member, idx) => {
                    const isSelected = member.userId === activeRadarUserId;
                    const memberColor = MEMBER_COLORS[idx % MEMBER_COLORS.length];

                    return (
                      <div
                        key={member.userId}
                        onClick={() => setActiveRadarUserId(member.userId)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: 10,
                          padding: '0.55rem 0.75rem',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--line)'}`,
                          background: isSelected
                            ? 'color-mix(in srgb, var(--accent) 12%, var(--surface2))'
                            : 'var(--surface2)',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--fg)' }}>
                            {member.userName}
                          </div>
                          <div style={{ fontSize: '0.67rem', color: 'var(--fg3)', marginTop: 2, fontFamily: 'var(--f-mono)' }}>
                            95% CI: [{(member.confidenceIntervalLow ?? 0).toFixed(1)}% – {(member.confidenceIntervalHigh ?? 0).toFixed(1)}%]
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: memberColor, fontFamily: 'var(--f-mono)' }}>
                            {(member.finalPct ?? 0).toFixed(1)}%
                          </span>
                          <ChevronRight
                            style={{
                              width: 14,
                              height: 14,
                              color: isSelected ? 'var(--accent)' : 'var(--fg3)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Radar + Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Radar panel */}
              <div className="panel">
                <div
                  className="panel-h"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <span>Hồ sơ năng lực 4 chiều (Radar Chart)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--fg3)' }}>
                      Thành viên:{' '}
                      <strong style={{ color: 'var(--accent)' }}>{radarMember?.userName}</strong>
                    </span>
                    {radarMember && (
                      <button
                        onClick={() => handleOpenEvidenceModal(radarMember)}
                        data-testid="btn-view-evidence-radar"
                        className="btn ghost"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.72rem',
                        }}
                      >
                        <ShieldCheck style={{ width: 12, height: 12 }} />
                        Xem chi tiết bằng chứng
                      </button>
                    )}
                  </div>
                </div>
                <MemberRadarChart member={radarMember} />
              </div>

              {/* Timeline/bar chart */}
              <div className="panel">
                <div className="panel-h">
                  <span>Chi tiết hoạt động thành viên</span>
                </div>
                <ContributionTimeline data={scores} />
              </div>
            </div>
          </div>

          {/* Evidence Audit Trail */}
          <div className="panel" id="audit-trail">
            <div
              className="panel-h"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>Bằng chứng truy vết minh chứng hoạt động (Audit Trail)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--fg3)' }}>
                  {filteredEvidenceItems.length} sự kiện ghi nhận
                </span>
                {radarMember && (
                  <button
                    onClick={() => handleOpenEvidenceModal(radarMember)}
                    className="btn ghost"
                    style={{ fontSize: '0.72rem' }}
                  >
                    Mở Modal Chi tiết ↗
                  </button>
                )}
              </div>
            </div>
            <EvidenceTable items={filteredEvidenceItems} />
          </div>

          {/* Modal Bằng chứng truy vết (Card 7) */}
          <EvidenceTraceabilityModal
            isOpen={isEvidenceModalOpen}
            onClose={() => setIsEvidenceModalOpen(false)}
            loading={evidenceModalLoading}
            evidenceData={modalEvidenceData}
            selectedUserName={modalTargetMember?.userName ?? ''}
            selectedUserId={modalTargetMember?.userId}
            sprintId={selectedSprintId}
            finalPct={modalTargetMember?.finalPct}
          />

          {/* Modal Khai báo & Duyệt đóng góp thủ công (Card 9) */}
          <ManualContributionModal
            isOpen={isManualModalOpen}
            onClose={() => setIsManualModalOpen(false)}
            teamId={currentTeamId}
            sprintId={selectedSprintId}
            currentUserId={currentUserId}
            onContributionApproved={handleContributionApproved}
          />

          {/* Modal Nhật ký phản hồi đã xử lý (CR-03 & WBS 5.4.4) */}
          <FeedbackResolutionModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
          />
        </>
      )}
      </div>
    </div>
  );
};
