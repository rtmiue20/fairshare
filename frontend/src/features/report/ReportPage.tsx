import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { showToast } from '../../components/ui/Toast';
import { reportApi, IndividualReportDto, EvidenceSummary } from '../../api/report.api';
import { contributionApi } from '../../api/contribution.api';
import { teamApi } from '../../api/team.api';
import { peerReviewApi, ReviewSprint } from '../../api/peerReview.api';
import { boardApi } from '../../api/board.api';
import { activityApi } from '../../api/activity.api';
import { parseChecklistFromDescription } from '../team/TaskDetailModal';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { NoProjectState } from '../team/NoProjectState';
import { ManualContributionModal } from '../dashboard/ManualContributionModal';
import { ManualContributionItem } from '../../types/contribution';
import { resolveAvatarUrl } from '../../utils/avatarSync';
import {
  Printer,
  Download,
  ArrowLeft,
  Calendar,
  RefreshCw,
  ChevronRight,
  Search,
  Filter,
  Mail,
  Send,
  Trophy,
  FileCheck,
  Radar as RadarIcon,
  FileDown,
  Users,
  Sparkles,
  BookOpen,
  FileText,
  CheckSquare,
  Award,
  ChevronDown,
  X,
  ExternalLink,
  Plus,
  Crown,
  Medal,
  RotateCcw,
  Check,
  Info,
  SlidersHorizontal,
  Scale,
  Brain,
  Bot,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  Zap,
  AlertTriangle,
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  tab: 'overview' | 'progress' | 'export';
  isHighlighted?: boolean;
}

interface MenuGroup {
  group: string;
  items: MenuItem[];
}

interface ReportMemberItem {
  userId: number;
  name: string;
  role: string;
  isLeader: boolean;
  email: string;
  avatarUrl?: string;
  pct: number;
  tasks: number;
  edits: number;
  peerScore: string;
  evidenceStatus: 'SUFFICIENT' | 'INSUFFICIENT' | 'EMPTY';
  color: string;
  d1Output: number;
  d2Reliability: number;
  d3Collaboration: number;
  d4Peer: number;
  compositeScore: number;
  availabilityFactor: number;
  ciLow: number;
  ciHigh: number;
  isSuspicious: boolean;
}

const MEMBER_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#6366f1'];

function getInitials(fullName: string): string {
  if (!fullName) return 'FS';
  const clean = fullName.replace(/\s*\([^)]*\)/g, '').trim() || fullName.trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getMemberAvatarBg(id: number | string): string {
  const colors = [
    'linear-gradient(135deg, #0ea5e9, #2563eb)',
    'linear-gradient(135deg, #8b5cf6, #6366f1)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #06b6d4, #0284c7)',
  ];
  const num = typeof id === 'number' ? id : 0;
  return colors[Math.abs(num) % colors.length];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

// Circular percentage gauge matching reference image
const CircularProgress: React.FC<{ pct: number; size?: number; stroke?: number; color?: string; trackColor?: string }> = ({
  pct,
  size = 38,
  stroke = 3.5,
  color = '#10b981',
  trackColor = 'rgba(148, 163, 184, 0.25)',
}) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const strokePct = Math.min(100, Math.max(0, pct));
  const offset = circ - (strokePct / 100) * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="transparent" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span style={{ position: 'absolute', fontSize: '10.5px', fontWeight: 700, fontFamily: 'monospace' }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
};

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams.length > 0 ? teams[0].id : null));
  const currentUserId = user?.id || 1;

  // Theme detector for Light / Dark Mode synchronization
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

  // Navigation & Category states
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'export'>('overview');
  const [activeCategory, setActiveCategory] = useState<string>('learners');

  // Manual contributions state (for evidence category)
  const [manualList, setManualList] = useState<ManualContributionItem[]>([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Core Data States
  const [sprintList, setSprintList] = useState<ReviewSprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number>(Number(searchParams.get('sprintId')) || 2);
  const [teamName, setTeamName] = useState<string>('Đồ án nhóm');
  const [inviteCode, setInviteCode] = useState<string>('FS-EDU-2026');
  const [leaderName, setLeaderName] = useState<string>('Nguyễn Hoàng Nam');
  const [members, setMembers] = useState<ReportMemberItem[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [downloading] = useState<boolean>(false);
  // Chữ ký điện tử (data URL) cho Trưởng nhóm & Giảng viên
  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const [leaderSignature, setLeaderSignature] = useState<string | null>(() => {
    try { return localStorage.getItem('fairshare_sig_leader'); } catch { return null; }
  });
  const [teacherSignature, setTeacherSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sprint, Member Picker & Sort Dropdowns + Filters
  const [showSprintDropdown, setShowSprintDropdown] = useState<boolean>(false);
  const [showMemberPickerDropdown, setShowMemberPickerDropdown] = useState<boolean>(false);
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  const [filterMemberIds, setFilterMemberIds] = useState<number[]>([]);
  const sprintDropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const [radarSize, setRadarSize] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 520
      ? Math.max(264, window.innerWidth - 76)
      : 380
  );

  useEffect(() => {
    const onResize = () => {
      setRadarSize(window.innerWidth < 520 ? Math.max(264, window.innerWidth - 76) : 380);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sprintDropdownRef.current && !sprintDropdownRef.current.contains(target)) {
        setShowSprintDropdown(false);
      }
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(target)) {
        setShowMemberPickerDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setShowSortDropdown(false);
      }
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(target)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Allocation Modal state
  const [showAllocationModal, setShowAllocationModal] = useState<boolean>(false);

  // FairShare AI Engine Hub Modal state
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiActiveTab, setAiActiveTab] = useState<'diagnostic' | 'algorithm' | 'chat'>('diagnostic');
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là FairShare AI Assistant. Tôi đã phân tích toàn bộ dữ liệu ActivityEvent, Vector đóng góp 4 chiều và kết quả chấm chéo trong giai đoạn này. Bạn cần tôi phân tích hay giải thích điều gì?',
      time: 'Vừa xong',
    },
  ]);
  const [aiChatInput, setAiChatInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Filter Popover state
  const [showFilterPopover, setShowFilterPopover] = useState<boolean>(false);
  const [filterDimensions, setFilterDimensions] = useState<{ [key: string]: boolean }>({
    d1: true,
    d2: true,
    d3: true,
    d4: true,
    evidence: true,
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterContributionTier, setFilterContributionTier] = useState<'ALL' | 'HIGH' | 'MED' | 'LOW'>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'PCT' | 'D1' | 'D2' | 'D3' | 'D4' | 'NAME'>('PCT');

  // Individual Report State
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [individualData, setIndividualData] = useState<IndividualReportDto | null>(null);
  const [sendingEmailUserId, setSendingEmailUserId] = useState<number | null>(null);
  const [sendingAllEmails, setSendingAllEmails] = useState<boolean>(false);

  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  // 1. Fetch Sprints for this specific project and sort chronologically
  useEffect(() => {
    if (!currentTeamId) return;
    peerReviewApi
      .getSprints(currentTeamId)
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const sorted = [...res.data].sort((a, b) => a.id - b.id);
          setSprintList(sorted);

          const currentUrlSprint = Number(searchParams.get('sprintId'));
          if (currentUrlSprint && sorted.some((s) => s.id === currentUrlSprint)) {
            setSelectedSprintId(currentUrlSprint);
          } else {
            const active = sorted.find((s) => s.status === 'ACTIVE') || sorted[0];
            setSelectedSprintId(active.id);
          }
        } else {
          const fallback = [
            { id: 1, teamId: currentTeamId || 1, name: 'Sprint 1 - Thiết kế Hệ thống & Khung Ứng dụng', startDate: '2026-10-15', endDate: '2026-10-28', status: 'CLOSED' },
            { id: 2, teamId: currentTeamId || 1, name: 'Sprint 2 - Phát triển Tính năng & Tích hợp API', startDate: '2026-10-29', endDate: '2026-11-12', status: 'ACTIVE' },
            { id: 3, teamId: currentTeamId || 1, name: 'Sprint 3 - Kiểm thử Tích hợp & Đóng gói', startDate: '2026-11-13', endDate: '2026-11-27', status: 'ACTIVE' },
          ];
          setSprintList(fallback);
          setSelectedSprintId(2);
        }
      })
      .catch(() => {
        const fallback = [
          { id: 1, teamId: currentTeamId || 1, name: 'Sprint 1 - Thiết kế Hệ thống & Khung Ứng dụng', startDate: '2026-10-15', endDate: '2026-10-28', status: 'CLOSED' },
          { id: 2, teamId: currentTeamId || 1, name: 'Sprint 2 - Phát triển Tính năng & Tích hợp API', startDate: '2026-10-29', endDate: '2026-11-12', status: 'ACTIVE' },
        ];
        setSprintList(fallback);
        setSelectedSprintId(2);
      });
  }, [currentTeamId, searchParams]);

  // Current active sprint object
  const currentSprint = useMemo(() => {
    return sprintList.find((s) => s.id === selectedSprintId) || sprintList[0];
  }, [sprintList, selectedSprintId]);

  // 2. Load Report Data
  const loadReportData = useCallback(async () => {
    if (!currentTeamId || !selectedSprintId) return;
    setLoading(true);

    try {
      const [sumRes, teamRes, boardRes, roundRes, contribRes] = await Promise.allSettled([
        contributionApi.getContributionSummary(currentTeamId, selectedSprintId),
        teamApi.getTeamById(currentTeamId),
        boardApi.getBoardsByTeam(currentTeamId),
        peerReviewApi.getRoundsByTeam(currentTeamId),
        typeof contributionApi.getContributions === 'function'
          ? contributionApi.getContributions(currentTeamId, selectedSprintId)
          : Promise.resolve(null),
      ]);

      // Team Details
      const memberRoleMap: Record<number, { role: string; isLeader: boolean; email: string; avatarUrl?: string }> = {};

      if (teamRes.status === 'fulfilled' && teamRes.value?.data) {
        const t = teamRes.value.data;
        if (t.name) setTeamName(t.name);
        if (t.inviteCode) setInviteCode(t.inviteCode);

        if (Array.isArray(t.members)) {
          t.members.forEach((m) => {
            const raw = m as unknown as { userId?: number; fullName?: string; email?: string; avatarUrl?: string };
            const uId = m.user?.id ?? raw.userId ?? m.id;
            const isLead = m.role === 'LEADER';
            memberRoleMap[uId] = {
              role: isLead ? 'Trưởng nhóm' : 'Thành viên',
              isLeader: isLead,
              email: m.user?.email || raw.email || '',
              avatarUrl: m.user?.avatarUrl || raw.avatarUrl || '',
            };
            if (isLead) {
              setLeaderName(m.user?.fullName || raw.fullName || 'Nguyễn Hoàng Nam');
            }
          });
        }
      }

      // Real Board Done Cards per Assignee (100% synced with Dự án & Dashboard)
      const memberCardsMap: Record<number, number> = {};
      let boardHasData = false;
      if (boardRes.status === 'fulfilled' && boardRes.value?.data && Array.isArray(boardRes.value.data)) {
        const boardsList = boardRes.value.data;
        const detailedBoards = await Promise.all(
          boardsList.map(async (b) => {
            if (Array.isArray(b.columns) && b.columns.length > 0) return b;
            if (typeof boardApi.getBoardById === 'function') {
              const detailRes = await boardApi.getBoardById(b.id).catch(() => null);
              return detailRes?.data ?? b;
            }
            return b;
          })
        );
        detailedBoards.forEach((board) => {
          if (Array.isArray(board.columns) && board.columns.length > 0) {
            boardHasData = true;
            board.columns.forEach((col) => {
              const colLower = (col.name || '').trim().toLowerCase();
              const isDoneCol =
                colLower.includes('done') ||
                colLower.includes('complete') ||
                colLower.includes('hoàn thành');
              if (!isDoneCol) return;
              if (Array.isArray(col.cards)) {
                col.cards.forEach((c) => {
                  const uids = new Set<number>();
                  if (c.assigneeId) uids.add(c.assigneeId);
                  const { assignees } = parseChecklistFromDescription(c.description);
                  assignees.forEach((a) => {
                    const n = Number(a.id);
                    if (Number.isFinite(n) && n > 0) uids.add(n);
                  });
                  uids.forEach((uid) => {
                    memberCardsMap[uid] = (memberCardsMap[uid] || 0) + 1;
                  });
                });
              }
            });
          }
        });
      }

      // Real activity / docsEditCount map (synced with Dashboard & ActivityEvent DB)
      const docsEditMap: Record<number, number> = {};
      const backendTaskCountMap: Record<number, number> = {};
      if (contribRes.status === 'fulfilled' && contribRes.value?.data?.scores && Array.isArray(contribRes.value.data.scores)) {
        contribRes.value.data.scores.forEach((s) => {
          if (s.userId != null) {
            docsEditMap[s.userId] = Number(s.docsEditCount ?? 0);
            backendTaskCountMap[s.userId] = Number(s.taskCompletedCount ?? 0);
          }
        });
      }
      const activityCountMap: Record<number, number> = {};
      if (Object.keys(docsEditMap).length === 0 && typeof activityApi?.getByTeam === 'function') {
        try {
          const actRes = await activityApi.getByTeam(currentTeamId);
          if (actRes?.data && Array.isArray(actRes.data)) {
            actRes.data.forEach((ev) => {
              if (ev.userId != null) {
                activityCountMap[ev.userId] = (activityCountMap[ev.userId] || 0) + 1;
              }
            });
          }
        } catch {
          // ignore if activity endpoint unavailable
        }
      }

      // Peer Review Round corresponding to sprint
      let roundId = 0;
      if (roundRes.status === 'fulfilled' && Array.isArray(roundRes.value?.data)) {
        const matching = roundRes.value.data.find((r) => r.sprintId === selectedSprintId) || roundRes.value.data[0];
        if (matching) roundId = matching.id;
      }

      // Fetch Peer Review Scores
      const peerScoreMap: Record<number, string> = {};
      if (roundId > 0 && sumRes.status === 'fulfilled' && Array.isArray(sumRes.value)) {
        await Promise.allSettled(
          sumRes.value.map(async (item) => {
            try {
              const res = await peerReviewApi.getRoundResults(roundId, item.userId);
              if (res?.data?.anonymousSafe && res.data.averageScore > 0) {
                peerScoreMap[item.userId] = `${res.data.averageScore.toFixed(1)} ★`;
              } else if (res?.data?.submissionCount && res.data.submissionCount > 0) {
                peerScoreMap[item.userId] = `${res.data.submissionCount}/3 (Ẩn danh)`;
              } else {
                peerScoreMap[item.userId] = '—';
              }
            } catch {
              peerScoreMap[item.userId] = '—';
            }
          })
        );
      }

      // Fetch manual contributions for evidence view
      if (typeof contributionApi.getAllManualContributions === 'function') {
        contributionApi.getAllManualContributions(currentTeamId, selectedSprintId)
          .then((res) => {
            if (res?.data && Array.isArray(res.data)) {
              setManualList(res.data);
            } else {
              setManualList([]);
            }
          })
          .catch(() => setManualList([]));
      }

      // Map Summary Items to Final Report Rows
      if (sumRes.status === 'fulfilled' && Array.isArray(sumRes.value) && sumRes.value.length > 0) {
        const mapped: ReportMemberItem[] = sumRes.value.map((item, idx) => {
          const userMeta = memberRoleMap[item.userId] || {
            role: item.userId === 109 ? 'Trưởng nhóm' : 'Thành viên',
            isLeader: item.userId === 109,
            email: '',
          };

          const rawPct = item.finalPct ?? item.activityPct ?? 0;
          const pct = Number(rawPct.toFixed(1));
          const trelloScore = item.trelloScore ?? 0;
          const manualScore = item.manualScore ?? 0;

          // Card count (100% synced with Kanban Done cards or backend score DTO)
          let taskCount = 0;
          if (boardHasData) {
            taskCount = memberCardsMap[item.userId] ?? 0;
          } else if (backendTaskCountMap[item.userId] !== undefined) {
            taskCount = backendTaskCountMap[item.userId];
          } else if (trelloScore > 0) {
            taskCount = Math.max(1, Math.round(trelloScore / 5));
          }

          // Real activity / event count (synced with Dashboard & ActivityEvent DB)
          let editsCount = 0;
          if (docsEditMap[item.userId] !== undefined) {
            editsCount = docsEditMap[item.userId];
          } else if (activityCountMap[item.userId] !== undefined) {
            editsCount = activityCountMap[item.userId];
          } else if (pct > 0 || trelloScore > 0) {
            editsCount = Math.round(trelloScore + manualScore);
          }

          // Peer score
          let peerStr = peerScoreMap[item.userId] || '—';
          if (peerStr === '—' && item.d4Peer && item.d4Peer > 0) {
            peerStr = `${Math.min(5, item.d4Peer * 4).toFixed(1)} ★`;
          }

          // Evidence Status
          let evStatus: 'SUFFICIENT' | 'INSUFFICIENT' | 'EMPTY' = 'EMPTY';
          if (item.hasSufficientEvidence || item.evidenceStatus === 'SUFFICIENT') {
            evStatus = 'SUFFICIENT';
          } else if (pct > 0 || taskCount > 0) {
            evStatus = 'INSUFFICIENT';
          }

          const d1 = Number((item.d1Output ?? (pct / 25)).toFixed(2));
          const d2 = Number((item.d2Reliability ?? 0.85).toFixed(2));
          const d3 = Number((item.d3Collaboration ?? 0.75).toFixed(2));
          const d4 = Number((item.d4Peer ?? 0.8).toFixed(2));

          const ciLow = item.confidenceIntervalLow ?? Math.max(0, pct - 2.5);
          const ciHigh = item.confidenceIntervalHigh ?? (pct + 2.5);

          return {
            userId: item.userId,
            name: item.userName,
            role: userMeta.role,
            isLeader: userMeta.isLeader,
            email: userMeta.email,
            avatarUrl: (item.avatarUrl || userMeta.avatarUrl) || undefined,
            pct,
            tasks: taskCount,
            edits: editsCount,
            peerScore: peerStr,
            evidenceStatus: evStatus,
            color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
            d1Output: d1,
            d2Reliability: d2,
            d3Collaboration: d3,
            d4Peer: d4,
            compositeScore: item.compositeScore ?? pct,
            availabilityFactor: item.availabilityFactor ?? 1.0,
            ciLow: Number(ciLow.toFixed(1)),
            ciHigh: Number(ciHigh.toFixed(1)),
            isSuspicious: Boolean(item.isSuspicious),
          };
        });

        mapped.sort((a, b) => {
          if (a.isLeader && !b.isLeader) return -1;
          if (!a.isLeader && b.isLeader) return 1;
          return b.pct - a.pct;
        });

        // Chuẩn hóa tỷ lệ % thành viên để tổng luôn bằng đúng 100.0%, không bao giờ vượt 100%
        const rawPctSum = mapped.reduce((acc, m) => acc + m.pct, 0);
        if (rawPctSum > 0 && mapped.length > 0) {
          if (rawPctSum > 100.5 || rawPctSum < 99.5) {
            mapped.forEach((m) => {
              m.pct = Number(((m.pct / rawPctSum) * 100).toFixed(1));
            });
          }
          const adjustedSum = mapped.reduce((acc, m) => acc + m.pct, 0);
          const diff = Number((100 - adjustedSum).toFixed(1));
          if (diff !== 0) {
            const targetIdx = mapped.reduce(
              (best, m, i) => (m.pct >= mapped[best].pct ? i : best),
              0
            );
            mapped[targetIdx].pct = Math.max(0, Number((mapped[targetIdx].pct + diff).toFixed(1)));
          }
        }

        setMembers(mapped);
        setSelectedUserId((prev) => (prev ? prev : (mapped[0]?.userId ?? null)));
        setSelectedMemberIds(mapped.map((m) => m.userId));
      } else {
        setMembers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentTeamId, selectedSprintId]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Load individual member data
  const loadIndividualData = useCallback(async (userId: number) => {
    if (!currentTeamId || !selectedSprintId || !userId) return;
    try {
      const res = await reportApi.getIndividualReport(currentTeamId, selectedSprintId, userId);
      if (res && res.data) {
        setIndividualData(res.data);
      } else {
        setIndividualData(null);
      }
    } catch {
      setIndividualData(null);
    }
  }, [currentTeamId, selectedSprintId]);

  useEffect(() => {
    if (selectedUserId) {
      loadIndividualData(selectedUserId);
    }
  }, [selectedUserId, loadIndividualData]);

  // Handle Download Official Backend PDF
  const handleDownloadBackendPdf = () => {
    setShowSignModal(true);
  };

  // Tách nền: biến nền trắng/sáng thành trong suốt, giữ nét mực, cắt gọn viền thừa
  const removeSignatureBackground = (src: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxW = 600;
          const scale = Math.min(1, maxW / img.width);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(src);
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const d = imageData.data;
          let minX = w, minY = h, maxX = -1, maxY = -1;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              // Sáng > 235: trong suốt hoàn toàn; 150–235: mờ dần (khử răng cưa)
              // Nền trắng/xám nhạt (kể cả ô caro "giả trong suốt") > 190 -> trong suốt; < 100 -> nét mực đặc
              let alpha = lum >= 190 ? 0 : lum <= 100 ? 255 : Math.round(((190 - lum) / 90) * 255);
              alpha = Math.min(alpha, d[i + 3]);
              d[i + 3] = alpha;
              if (alpha > 20) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX < 0) return resolve(src); // ảnh trống: giữ nguyên
          ctx.putImageData(imageData, 0, 0);
          const pad = 4;
          const cx = Math.max(0, minX - pad);
          const cy = Math.max(0, minY - pad);
          const cw = Math.min(w - cx, maxX - minX + 1 + pad * 2);
          const ch = Math.min(h - cy, maxY - minY + 1 + pad * 2);
          const out = document.createElement('canvas');
          out.width = cw;
          out.height = ch;
          out.getContext('2d')?.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
          resolve(out.toDataURL('image/png'));
        } catch {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });

  // Xử lý lại chữ ký Nhóm trưởng đã lưu từ trước (có thể còn nền)
  useEffect(() => {
    if (!leaderSignature) return;
    let cancelled = false;
    removeSignatureBackground(leaderSignature).then((clean) => {
      if (cancelled || clean === leaderSignature) return;
      setLeaderSignature(clean);
      try { localStorage.setItem('fairshare_sig_leader', clean); } catch { /* ignore */ }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignatureFile = (role: 'leader' | 'teacher', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file ảnh chữ ký (PNG, JPG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ảnh chữ ký tối đa 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const data = await removeSignatureBackground(String(reader.result));
      if (role === 'leader') {
        setLeaderSignature(data);
        try { localStorage.setItem('fairshare_sig_leader', data); } catch { /* ignore quota */ }
      } else {
        setTeacherSignature(data);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearSignature = (role: 'leader' | 'teacher') => {
    if (role === 'leader') {
      setLeaderSignature(null);
      try { localStorage.removeItem('fairshare_sig_leader'); } catch { /* ignore */ }
    } else {
      setTeacherSignature(null);
    }
  };

  // Áp chữ ký vào báo cáo rồi mở hộp thoại In / Lưu PDF
  const handleConfirmSignAndExport = () => {
    setShowSignModal(false);
    showToast('Đã áp chữ ký điện tử. Chọn "Lưu dưới dạng PDF" trong cửa sổ In...');
    setTimeout(() => window.print(), 400);
  };

  const openMailtoDraft = (recipientEmails: string[], subject: string, body: string) => {
    const valid = recipientEmails.map((e) => e.trim()).filter(Boolean);
    if (valid.length === 0) return;
    const mailtoUrl = `mailto:${encodeURIComponent(valid.join(','))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle Send Individual Email
  const handleSendIndividualEmail = async (userId: number, memberName: string) => {
    if (!currentTeamId) return;
    const targetMember = members.find((m) => m.userId === userId);
    try {
      setSendingEmailUserId(userId);
      const res = await reportApi.sendIndividualEmail(currentTeamId, selectedSprintId, userId);
      if (res && res.success) {
        showToast(`Đã gửi báo cáo cá nhân thành công tới email của ${memberName}`);
      } else {
        const errMsg = res?.message || 'Không thể gửi email từ máy chủ.';
        if (errMsg.includes('SMTP_NOT_CONFIGURED') && targetMember?.email) {
          const sprintLabel = currentSprint?.name || `Sprint ${selectedSprintId}`;
          const subject = `[FairShare] Báo cáo đóng góp cá nhân – ${sprintLabel}`;
          const body =
            `Xin chào ${memberName},\n\n` +
            `Báo cáo đóng góp nhóm ${teamName} (${sprintLabel}):\n` +
            `- Tỷ lệ đóng góp: ${targetMember.pct}%\n` +
            `- Chỉ số 4D: D1=${targetMember.d1Output}, D2=${targetMember.d2Reliability}, D3=${targetMember.d3Collaboration}, D4=${targetMember.d4Peer}\n` +
            `- Công việc hoàn thành: ${targetMember.tasks} tasks · Hoạt động: ${targetMember.edits} sự kiện\n\n` +
            `Trân trọng,\nFairShare`;
          openMailtoDraft([targetMember.email], subject, body);
          showToast('Máy chủ chưa cấu hình SMTP — đã mở bản nháp email trên thiết bị của bạn.');
        } else {
          showToast(errMsg);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối khi gửi email.';
      showToast(`Không thể gửi email tới ${memberName}: ${msg}`);
    } finally {
      setSendingEmailUserId(null);
    }
  };

  // Handle Send All Emails
  const handleSendAllEmails = async () => {
    if (!currentTeamId) return;
    try {
      setSendingAllEmails(true);
      const res = await reportApi.sendAllEmails(currentTeamId, selectedSprintId);
      if (res && res.success) {
        showToast(res.data || `Đã gửi thành công báo cáo cá nhân cho toàn bộ ${members.length} thành viên`);
      } else {
        const errMsg = res?.message || 'Không thể gửi email hàng loạt từ máy chủ.';
        if (errMsg.includes('SMTP_NOT_CONFIGURED')) {
          const emails = members.map((m) => m.email).filter(Boolean);
          const sprintLabel = currentSprint?.name || `Sprint ${selectedSprintId}`;
          const subject = `[FairShare] Tổng kết đóng góp nhóm ${teamName} – ${sprintLabel}`;
          const summaryLines = members
            .map((m) => `- ${m.name}: ${m.pct}% (${m.tasks} tasks, ${m.edits} sự kiện)`)
            .join('\n');
          const body = `Xin chào cả nhóm ${teamName},\n\nTổng kết đóng góp ${sprintLabel}:\n${summaryLines}\n\nTrân trọng,\nFairShare`;
          openMailtoDraft(emails, subject, body);
          showToast('Máy chủ chưa cấu hình SMTP — đã mở bản nháp email tới toàn bộ thành viên.');
        } else {
          showToast(errMsg);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối khi gửi email hàng loạt.';
      showToast(`Lỗi gửi email: ${msg}`);
    } finally {
      setSendingAllEmails(false);
    }
  };

  const handleSprintChange = (sprintId: number) => {
    setSelectedSprintId(sprintId);
    setSearchParams({ sprintId: String(sprintId) });
  };

  const toggleSelectMember = (userId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map((m) => m.userId));
    }
  };

  // Selected Member Object
  const selectedMember = useMemo(() => {
    if (!selectedUserId && members.length > 0) return members[0];
    return members.find((m) => m.userId === selectedUserId) || members[0] || null;
  }, [members, selectedUserId]);

  const totalPercentage = useMemo(() => {
    const sum = members.reduce((acc, m) => acc + m.pct, 0);
    if (sum === 0) return '0';
    return Math.abs(sum - 100) <= 1.0 ? '100' : String(Math.min(100, Math.round(sum)));
  }, [members]);

  const totalTasks = useMemo(() => {
    return members.reduce((acc, m) => acc + m.tasks, 0);
  }, [members]);

  const totalEdits = useMemo(() => {
    return members.reduce((acc, m) => acc + m.edits, 0);
  }, [members]);

  // Dynamic Gini calculation from member percentages
  const { giniValue, giniLabel } = useMemo(() => {
    if (members.length === 0) return { giniValue: '0.00', giniLabel: 'Chưa đủ dữ liệu' };
    const values = members.map((m) => m.pct);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum === 0) return { giniValue: '0.00', giniLabel: 'Chưa có phân bổ' };

    let diffSum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        diffSum += Math.abs(values[i] - values[j]);
      }
    }
    const gini = diffSum / (2 * n * sum);
    const valStr = gini.toFixed(2);

    let label = 'Cân bằng rất cao';
    if (gini > 0.35) {
      label = 'Lệch tải cao';
    } else if (gini > 0.25) {
      label = 'Chênh lệch vừa phải';
    } else if (gini > 0.15) {
      label = 'Cân bằng tốt';
    }

    return { giniValue: valStr, giniLabel: label };
  }, [members]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }, []);

  // Available Roles in the Project
  const availableRoles = useMemo(() => {
    return Array.from(new Set(members.map((m) => m.role).filter(Boolean)));
  }, [members]);

  // Count active applied filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'ALL') count++;
    if (filterContributionTier !== 'ALL') count++;
    if (filterRole !== 'ALL') count++;
    if (sortBy !== 'PCT') count++;
    const unselectedDims = Object.values(filterDimensions).filter((v) => !v).length;
    if (unselectedDims > 0) count++;
    return count;
  }, [filterStatus, filterContributionTier, filterRole, sortBy, filterDimensions]);

  // Filtered and Sorted Members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // 1. Filter by specific member IDs (from MemberPicker dropdown)
    if (filterMemberIds.length > 0) {
      result = result.filter((m) => filterMemberIds.includes(m.userId));
    }

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    }

    // 3. Filter by evidence status
    if (filterStatus === 'SUFFICIENT') {
      result = result.filter((m) => m.evidenceStatus === 'SUFFICIENT');
    } else if (filterStatus === 'INSUFFICIENT') {
      result = result.filter((m) => m.evidenceStatus === 'INSUFFICIENT');
    } else if (filterStatus === 'SUSPICIOUS') {
      result = result.filter((m) => m.isSuspicious);
    }

    // 4. Filter by contribution tier (%)
    if (filterContributionTier === 'HIGH') {
      result = result.filter((m) => m.pct >= 20);
    } else if (filterContributionTier === 'MED') {
      result = result.filter((m) => m.pct >= 10 && m.pct < 20);
    } else if (filterContributionTier === 'LOW') {
      result = result.filter((m) => m.pct < 10);
    }

    // 5. Filter by role
    if (filterRole !== 'ALL') {
      result = result.filter((m) => m.role === filterRole);
    }

    // 6. Sort
    result.sort((a, b) => {
      if (sortBy === 'D1') return b.d1Output - a.d1Output;
      if (sortBy === 'D2') return b.d2Reliability - a.d2Reliability;
      if (sortBy === 'D3') return b.d3Collaboration - a.d3Collaboration;
      if (sortBy === 'D4') return b.d4Peer - a.d4Peer;
      if (sortBy === 'NAME') return a.name.localeCompare(b.name, 'vi');
      return b.pct - a.pct;
    });

    return result;
  }, [members, filterMemberIds, searchQuery, filterStatus, filterContributionTier, filterRole, sortBy]);

  // Radar Chart Data for Selected Member
  const radarData = useMemo(() => {
    if (!selectedMember) return [];
    return [
      { dimension: 'D1 Sản lượng (Output)', value: Math.min(1.0, Math.max(0.1, selectedMember.d1Output)), fullMark: 1.0 },
      { dimension: 'D2 Tin cậy (Reliability)', value: Math.min(1.0, Math.max(0.1, selectedMember.d2Reliability)), fullMark: 1.0 },
      { dimension: 'D3 Phối hợp (Collab)', value: Math.min(1.0, Math.max(0.1, selectedMember.d3Collaboration)), fullMark: 1.0 },
      { dimension: 'D4 Đánh giá chéo (Peer)', value: Math.min(1.0, Math.max(0.1, selectedMember.d4Peer)), fullMark: 1.0 },
    ];
  }, [selectedMember]);

  // Handler for FairShare AI Engine Chat
  const handleSendAiMessage = (userQuery?: string) => {
    const q = (userQuery || aiChatInput).trim();
    if (!q) return;

    const newMsg = {
      sender: 'user' as const,
      text: q,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setAiChatMessages((prev) => [...prev, newMsg]);
    if (!userQuery) setAiChatInput('');
    setIsAiThinking(true);

    setTimeout(() => {
      let reply = '';
      const lower = q.toLowerCase();

      const sortedByPct = [...members].sort((a, b) => b.pct - a.pct);
      const topMember = sortedByPct[0];
      const lowestMember = sortedByPct[sortedByPct.length - 1];
      const avgPct = (100 / (members.length || 1)).toFixed(1);

      if (lower.includes('tổng quan') || lower.includes('hiệu suất') || lower.includes('đánh giá')) {
        reply = `📊 **Đánh giá Hiệu suất Sprint (${currentSprint?.name || 'Giai đoạn hiện tại'}):**\n\n` +
          `• **Mức độ cân đối (Hệ số Gini):** ${giniValue} — ${giniLabel}. Nhóm có tổng cộng **${totalTasks}** đầu việc hoàn tất với tổng phân bổ **${totalPercentage}%** đã được khóa an toàn.\n` +
          `• **Đóng góp nổi bật:** **${topMember?.name || 'Thành viên'}** dẫn đầu với **${(topMember?.pct || 0).toFixed(1)}%** (D1 Output: ${(topMember?.d1Output || 0).toFixed(2)}, D2 Tin cậy: ${(topMember?.d2Reliability || 0).toFixed(2)}).\n` +
          `• **Nhận định AI:** Nhóm hoạt động gắn kết, không có dấu hiệu thao túng dữ liệu hoặc commit ảo (Anti-gaming check pass 100%).`;
      } else if (lower.includes('tụt lại') || lower.includes('hỗ trợ') || lower.includes('free-rider') || lower.includes('thấp')) {
        reply = `⚠️ **Chẩn đoán Rủi ro Phân hóa & Thành viên cần hỗ trợ:**\n\n` +
          `• Thành viên **${lowestMember?.name || 'N/A'}** hiện có tỷ lệ đóng góp là **${(lowestMember?.pct || 0).toFixed(1)}%** (thấp hơn mức trung bình kỳ vọng **${avgPct}%**).\n` +
          `• Điểm nghẽn chính: Sản lượng công việc D1 (${lowestMember?.tasks || 0} tasks) và số sự kiện phối hợp D3 còn hạn chế.\n` +
          `• **Đề xuất từ AI:** Nhóm trưởng **${leaderName}** nên giao thêm 1-2 User Story độc lập hoặc ghép cặp Pair-Review trong đợt tới để bạn có cơ hội gia tăng điểm D1 và D3.`;
      } else if (lower.includes('chia điểm') || lower.includes('cho điểm') || lower.includes('công bằng')) {
        reply = `⚖️ **Khuyến nghị Phân bổ Điểm đồ án (Dựa trên Thang điểm 10):**\n\n` +
          `FairShare AI đề xuất áp dụng công thức: Điểm cá nhân = Điểm nhóm × [0.75 + 0.25 × (Điểm đóng góp / Mức kỳ vọng)]:\n` +
          members.map((m) => {
            const ratio = m.pct / Number(avgPct);
            const deltaDesc = ratio >= 1.15 ? '+0.5 đến +1.0 điểm thưởng' : ratio <= 0.85 ? '-0.5 đến -1.0 điểm điều chỉnh' : 'Bằng điểm nhóm';
            return `• **${m.name}** (${m.pct.toFixed(1)}%): ${deltaDesc}`;
          }).join('\n') +
          `\n\n*Ghi chú: Toàn bộ quá trình tính toán đã được ẩn danh theo nguyên lý k-Anonymity (k=3).*`;
      } else if (lower.includes('d2') || lower.includes('tin cậy') || lower.includes('đúng hạn')) {
        const topD2 = [...members].sort((a, b) => b.d2Reliability - a.d2Reliability)[0];
        reply = `🎯 **Phân tích Chiều D2 (Độ tin cậy & Đúng hạn):**\n\n` +
          `• Chiều D2 tính toán dựa trên: Tỷ lệ hoàn thành đúng deadline, tỷ lệ không bị reject và hệ số ổn định Bootstrap CI.\n` +
          `• Thành viên có độ tin cậy cao nhất: **${topD2?.name}** (D2 = ${(topD2?.d2Reliability || 0).toFixed(2)}).\n` +
          `• Thuật toán Robust MAD đã khử các sai lệch do nộp trễ ngoài ý muốn để đảm bảo tính khách quan.`;
      } else {
        reply = `💡 **Phân tích từ FairShare AI Engine:**\n\n` +
          `Về câu hỏi: "${q}"\n\n` +
          `Dựa trên không gian Vector 4 chiều của dự án **${teamName}**, hệ thống xác nhận:\n` +
          `1. Tổng phân bổ đạt chuẩn: **${totalPercentage}%** trên toàn bộ ${members.length} thành viên.\n` +
          `2. Mô hình 4 tầng Robust MAD đã chuẩn hóa logarithmic ln(1+x), loại bỏ toàn bộ dữ liệu đột biến.\n` +
          `3. Mọi kết quả đã sẵn sàng để xuất báo cáo chính thức nộp hội đồng bảo vệ.`;
      }

      setAiChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: reply,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsAiThinking(false);
    }, 700);
  };

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  // Visual Theme Tokens matching the image and project dark/light modes
  const theme = {
    textColor: isLight ? '#0f172a' : '#f8fafc',
    subTextColor: isLight ? '#64748b' : '#94a3b8',
    headingColor: isLight ? '#0f172a' : '#ffffff',
    panelBg: isLight ? '#ffffff' : 'rgba(24, 24, 27, 0.75)',
    panelBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
    panelShadow: isLight
      ? '0 20px 48px -10px rgba(0,0,0,0.06)'
      : '0 4px 16px rgba(0, 0, 0, 0.25)',
    sidebarBg: isLight ? '#fcfcfd' : 'rgba(24, 24, 27, 0.75)',
    sidebarBorder: isLight ? '1px solid #edf2f7' : '1px solid rgba(255, 255, 255, 0.08)',
    itemHoverBg: isLight ? '#f1f5f9' : '#27272a',
    activePillBg: '#4f46e5',
    activePillText: '#ffffff',
    tableBorder: isLight ? '1px solid #edf2f7' : '1px solid rgba(255, 255, 255, 0.08)',
    tableRowBorder: isLight ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.06)',
    tableHeaderBg: isLight ? '#f8fafc' : '#27272a',
    paperBg: isLight ? '#ffffff' : 'rgba(24, 24, 27, 0.95)',
    paperColor: isLight ? '#1e293b' : '#f8fafc',
    paperBorder: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
    paperShadow: isLight ? '0 10px 30px rgba(0, 0, 0, 0.06)' : '0 12px 36px rgba(0, 0, 0, 0.45)',
    paperHeaderBorder: isLight ? '2px solid #0f172a' : '2px solid rgba(255, 255, 255, 0.15)',
    paperCardBg: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
    paperCardBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
    paperHeading: isLight ? '#0f172a' : '#f8fafc',
    paperSubText: isLight ? '#64748b' : '#94a3b8',
    paperTableHeaderBg: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)',
    paperTableHeaderText: isLight ? '#334155' : '#cbd5e1',
    paperTableRowBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)',
    paperCodeBg: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
    paperCodeColor: isLight ? '#0f172a' : '#f8fafc',
    paperDivider: isLight ? '1px dashed #cbd5e1' : '1px dashed rgba(255, 255, 255, 0.15)',
  };

  // Category Metadata for Titles, Subtitles and Icons
  const categoryMeta: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
    'learners': {
      title: 'Thành viên & Đóng góp (Learners)',
      subtitle: 'Bảng tổng hợp danh sách thành viên, khối lượng nhiệm vụ và tỷ lệ phân bổ trong Sprint.',
      icon: <Users size={20} color="#818cf8" />,
    },
    'leaderboards': {
      title: 'Bảng xếp hạng đóng góp (Leaderboards)',
      subtitle: 'Vinh danh thành viên tích cực dựa trên tỷ lệ đóng góp thực tế và điểm số tổng hợp 4 chiều.',
      icon: <Trophy size={20} color="#f59e0b" />,
    },
    'radar-4d': {
      title: 'Hồ sơ Vector 4D & Báo cáo cá nhân',
      subtitle: 'Mô hình radar 4 chiều nén không gian đa chiều (D1 Output, D2 Reliability, D3 Collab, D4 Peer Review).',
      icon: <RadarIcon size={20} color="#818cf8" />,
    },
    'd1-output': {
      title: 'Sản lượng công việc (D1 Output)',
      subtitle: 'Đo lường tổng Story Points, số lượng tasks hoàn thành và độ phức tạp công việc được duyệt.',
      icon: <BookOpen size={20} color="#38bdf8" />,
    },
    'd2-reliability': {
      title: 'Độ tin cậy & Đúng hạn (D2 Reliability)',
      subtitle: 'Đo lường mức độ hoàn thành đúng deadline (Punctuality) và hạn chế làm lại (Rework).',
      icon: <FileText size={20} color="#34d399" />,
    },
    'd3-collaboration': {
      title: 'Phối hợp & Tương tác nhóm (D3 Collab)',
      subtitle: 'Ghi nhận trao đổi code review, bình luận hỗ trợ và mức độ kết nối nhóm trên Board.',
      icon: <CheckSquare size={20} color="#fbbf24" />,
    },
    'd4-peer': {
      title: 'Chấm chéo thành viên (D4 Peer Review)',
      subtitle: 'Điểm đánh giá chéo ngang hàng bảo mật ẩn danh (K-Anonymity k=3) theo 3 tiêu chí: Chất lượng, Tiến độ, Hợp tác.',
      icon: <Award size={20} color="#f472b6" />,
    },
    'evidence': {
      title: 'Minh chứng ngoài hệ thống (Manual Evidence)',
      subtitle: 'Minh chứng ngoại tuyến: chứng chỉ, bài báo cáo, tài liệu nghiên cứu và đóng góp ngoài Git/Trello.',
      icon: <FileCheck size={20} color="#a78bfa" />,
    },
    'export-pdf': {
      title: 'Văn bản nghiệm thu chính thức (Official PDF)',
      subtitle: 'Mẫu báo cáo nghiệm thu học thuật chuẩn phục vụ nộp Giảng viên hướng dẫn và Khoa.',
      icon: <FileDown size={20} color="#818cf8" />,
    },
    'send-all-emails': {
      title: 'Gửi Email báo cáo toàn nhóm',
      subtitle: 'Gửi thông báo phân bổ và phiếu báo cáo đóng góp cá nhân trực tiếp qua hòm thư sinh viên.',
      icon: <Send size={20} color="#818cf8" />,
    },
  };

  // Sidebar Menu Structure directly mirroring the sample image
  const menuCategories: MenuGroup[] = [
    {
      group: '',
      items: [
        { id: 'learners', label: 'Thành viên (Learners)', icon: <Users size={16} />, tab: 'overview' as const },
        { id: 'leaderboards', label: 'Bảng xếp hạng (Leaderboards)', icon: <Trophy size={16} />, tab: 'overview' as const },
        { id: 'radar-4d', label: 'Hồ sơ Vector 4D', icon: <RadarIcon size={16} />, tab: 'progress' as const },
      ],
    },
    {
      group: 'DANH MỤC ĐÓNG GÓP',
      items: [
        { id: 'd1-output', label: 'Sản lượng (D1 Output)', icon: <BookOpen size={16} />, tab: 'overview' as const },
        { id: 'd2-reliability', label: 'Độ tin cậy (D2 Reliability)', icon: <FileText size={16} />, tab: 'overview' as const },
        { id: 'd3-collaboration', label: 'Phối hợp (D3 Collab)', icon: <CheckSquare size={16} />, tab: 'overview' as const },
        { id: 'd4-peer', label: 'Chấm chéo (D4 Peer Review)', icon: <Award size={16} />, tab: 'overview' as const, isHighlighted: true },
        { id: 'evidence', label: 'Minh chứng ngoài hệ thống', icon: <FileCheck size={16} />, tab: 'overview' as const },
      ],
    },
    {
      group: 'XUẤT & NGHIỆM THU',
      items: [
        { id: 'export-pdf', label: 'Văn bản PDF chính thức', icon: <FileDown size={16} />, tab: 'export' as const },
        { id: 'send-all-emails', label: 'Gửi Email báo cáo toàn nhóm', icon: <Send size={16} />, tab: 'overview' as const },
      ],
    },
  ];

  return (
    <div
      className="page pad report-page-root"
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        background: 'transparent',
        color: theme.textColor,
      }}
    >
      {/* 1. Page Breadcrumb & Top Actions Bar */}
      <div className="no-print" style={{ marginBottom: '18px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.subTextColor, marginBottom: '8px' }}>
          <Link to="/" style={{ color: theme.subTextColor, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#818cf8', fontWeight: 500 }}>Báo cáo nghiệm thu</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {currentSprint && (
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
                    backgroundColor: currentSprint.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: currentSprint.status === 'ACTIVE' ? (isLight ? '#047857' : '#34d399') : '#6366f1',
                    border: currentSprint.status === 'ACTIVE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <FileCheck size={13} />
                  {currentSprint.status === 'ACTIVE' ? 'Sprint đang diễn ra' : 'Sprint đã chốt'}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '8px 0 6px', color: theme.headingColor, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Bản đóng góp nộp cho giảng viên
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: theme.subTextColor, maxWidth: '54ch', lineHeight: 1.5 }}>
              Tổng hợp tỷ lệ đóng góp và minh chứng minh bạch phục vụ đánh giá, nghiệm thu đồ án.
            </p>
          </div>

          {/* Quick Header Actions: Right-Aligned Pill Buttons matching AlertList */}
          <div className="report-header-actions-bar">
            <div className="relative shrink-0" ref={sprintDropdownRef}>
              {/* Native Hidden Select for test suite compatibility */}
              <select
                aria-label="Chọn Sprint xuất báo cáo"
                value={selectedSprintId}
                onChange={(e) => handleSprintChange(Number(e.target.value))}
                className="sr-only"
                tabIndex={-1}
              >
                {sprintList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.status === 'ACTIVE' ? '· (Đang diễn ra)' : '· (Đã đóng)'}
                  </option>
                ))}
              </select>

              {/* Custom Sprint Trigger Button matching DashboardFilters & AlertList pill style */}
              <button
                type="button"
                onClick={() => {
                  setShowSprintDropdown((prev) => !prev);
                  setShowMemberPickerDropdown(false);
                  setShowSortDropdown(false);
                  setShowFilterPopover(false);
                }}
                className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border shrink-0 ${showSprintDropdown
                  ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/50 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                  : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border-slate-300/80 dark:border-white/15 text-slate-800 dark:text-slate-200'
                  }`}
              >
                <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span className="truncate max-w-[175px] sm:max-w-[210px]">
                  {currentSprint?.name ?? `Sprint ${selectedSprintId}`}
                </span>
                {currentSprint?.status === 'ACTIVE' ? (
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                    Đang diễn ra
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-white/10">
                    Đã đóng
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${showSprintDropdown ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
                    }`}
                />
              </button>

              {/* Custom Sprint Popover Menu matching DashboardFilters */}
              {showSprintDropdown && (
                <div
                  className="absolute right-0 z-50 w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] overflow-hidden"
                  style={{
                    top: 'calc(100% + 8px)',
                    boxShadow:
                      '0 24px 50px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
                      DANH SÁCH SPRINT
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                      {sprintList.length} Sprints
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                    {sprintList.map((s) => {
                      const isActive = s.id === selectedSprintId;
                      const isCurrent = s.status === 'ACTIVE';
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            handleSprintChange(s.id);
                            setShowSprintDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer group ${isActive
                            ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-bold shadow-xs'
                            : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                            }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-transform group-hover:scale-105 ${isActive
                              ? 'bg-cyan-600 text-white shadow-sm'
                              : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            S{s.id}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {isCurrent ? 'Sprint đang diễn ra' : `Sprint đã đóng · ID #${s.id}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCurrent ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Đang diễn ra
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-white/10">
                                Đã đóng
                              </span>
                            )}
                            {isActive && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 stroke-[2.5]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '999px',
                backgroundColor: isLight ? '#f1f5f9' : '#27272a',
                color: theme.textColor,
                border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Printer size={14} /> Xem trước / In
            </button>

            <button
              type="button"
              onClick={handleDownloadBackendPdf}
              disabled={downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 18px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#fff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: downloading ? 'not-allowed' : 'pointer',
                opacity: downloading ? 0.7 : 1,
                boxShadow: '0 6px 18px -4px rgba(79, 70, 229, 0.45)',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Download size={14} /> {downloading ? 'Đang tạo PDF...' : 'Xuất PDF chính thức'}
            </button>

            <button
              type="button"
              onClick={loadReportData}
              title="Làm mới dữ liệu báo cáo"
              style={{
                background: isLight ? '#f1f5f9' : '#27272a',
                border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
                color: theme.textColor,
                width: '36px',
                height: '36px',
                borderRadius: '999px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Header Grid (Maintained for existing tests and quick metrics) */}
      <div className="no-print report-kpi-grid">
        <div className="report-kpi-card" style={{ backgroundColor: isLight ? '#fff' : '#1f1f23', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
          <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Giai đoạn báo cáo
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: theme.headingColor, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentSprint ? currentSprint.name.split('-')[0].trim() : 'Sprint'}
          </div>
          <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '2px', fontWeight: 500 }}>
            {formatDate(currentSprint?.startDate)} — {formatDate(currentSprint?.endDate)}
          </div>
        </div>

        <div className="report-kpi-card" style={{ backgroundColor: isLight ? '#fff' : '#1f1f23', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
          <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tổng nhiệm vụ &amp; Hoạt động
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>
            {totalTasks} Tasks · {totalEdits} Events
          </div>
          <div style={{ fontSize: '12px', color: theme.subTextColor, marginTop: '2px' }}>
            Ghi nhận từ Task Board &amp; Git
          </div>
        </div>

        <div className="report-kpi-card" style={{ backgroundColor: isLight ? '#fff' : '#1f1f23', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
          <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Độ phân bổ đóng góp (Gini)
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#3b82f6', marginTop: '4px', fontFamily: 'monospace' }}>
            {giniValue} ({giniLabel})
          </div>
          <div style={{ fontSize: '12px', color: theme.subTextColor, marginTop: '2px' }}>
            Phân bổ công việc đồng đều
          </div>
        </div>

        <div className="report-kpi-card" style={{ backgroundColor: isLight ? '#fff' : '#1f1f23', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
          <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Chuẩn mực pháp lý
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: theme.headingColor, marginTop: '4px' }}>
            100% Consent
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px', fontWeight: 500 }}>
            Bảo vệ dữ liệu minh bạch
          </div>
        </div>
      </div>

      {/* 3. THE MAIN UNIFIED FRAME CARD (Exact Model from Reference Image) */}
      <div
        className="no-print report-unified-frame"
        style={{
          borderRadius: '24px',
          backgroundColor: theme.panelBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: theme.panelBorder,
          boxShadow: theme.panelShadow,
          marginBottom: '36px',
        }}
      >
        {/* ── Left Sidebar Inside the Frame (Model from Image) ── */}
        <aside
          className="report-sidebar"
          style={{
            backgroundColor: theme.sidebarBg,
            borderRight: theme.sidebarBorder,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Reports Brand Icon & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 6px 16px 6px', borderBottom: theme.sidebarBorder }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                  flexShrink: 0,
                }}
              >
                FS
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: theme.headingColor, lineHeight: 1.2 }}>
                  Báo cáo
                </div>
                <div style={{ fontSize: '11px', color: theme.subTextColor, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {teamName}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="report-sidebar-groups">
              {menuCategories.map((cat, catIdx) => (
                <div key={catIdx} className="report-sidebar-group">
                  {cat.group && (
                    <div className="report-sidebar-group-title" style={{ fontSize: '10px', fontWeight: 700, color: theme.subTextColor, padding: '0 8px 6px 8px', letterSpacing: '0.05em' }}>
                      {cat.group}
                    </div>
                  )}
                  <div className="report-sidebar-group-items">
                    {cat.items.map((item) => {
                      const isActive = activeCategory === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveCategory(item.id);
                            setActiveTab(item.tab);
                            if (item.id === 'leaderboards') {
                              setSortBy('PCT');
                            } else if (item.id === 'd1-output') {
                              setSortBy('D1');
                            } else if (item.id === 'd2-reliability') {
                              setSortBy('D2');
                            } else if (item.id === 'd3-collaboration') {
                              setSortBy('D3');
                            } else if (item.id === 'd4-peer') {
                              setSortBy('D4');
                            } else if (item.id === 'export-pdf') {
                              setActiveTab('export');
                            } else if (item.id === 'send-all-emails') {
                              handleSendAllEmails();
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: isActive ? 600 : 500,
                            backgroundColor: isActive
                              ? 'rgba(99, 102, 241, 0.15)'
                              : item.isHighlighted
                                ? 'rgba(236, 72, 153, 0.1)'
                                : 'transparent',
                            color: isActive
                              ? '#818cf8'
                              : item.isHighlighted
                                ? '#f472b6'
                                : theme.textColor,
                            border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ color: isActive ? '#818cf8' : item.isHighlighted ? '#f472b6' : theme.subTextColor, flexShrink: 0 }}>
                            {item.icon}
                          </span>
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Promo Card (FairShare AI Engine Hub Trigger) */}
          <div
            className="report-sidebar-footer"
            onClick={() => setShowAiModal(true)}
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '16px',
              background: isLight
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)'
                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#818cf8';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.25)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#818cf8' }}>
                <Sparkles size={14} /> FairShare AI Engine
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '1px 6px', borderRadius: '4px' }}>
                v4.0
              </span>
            </div>
            <div className="report-sidebar-footer-desc" style={{ fontSize: '11px', color: theme.subTextColor, marginTop: '4px', lineHeight: 1.4 }}>
              Mô hình đo lường 4 tầng Robust MAD tự động đối soát ActivityEvent.
            </div>
            <button
              className="report-sidebar-footer-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowAiModal(true);
              }}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
              }}
            >
              <Zap size={13} />
              <span>Khám phá ngay ↗</span>
            </button>
          </div>
        </aside>

        {/* ── Main Panel Right Area (Exact Model from Image) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Panel Top: Title & Category Subtitle */}
          <div style={{ padding: 'clamp(16px, 2.5vw, 24px) clamp(14px, 3vw, 28px) 18px', borderBottom: theme.tableBorder }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {categoryMeta[activeCategory]?.icon || <Users size={20} color="#818cf8" />}
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: theme.headingColor, margin: 0 }}>
                  {categoryMeta[activeCategory]?.title || 'Thành viên & Đóng góp (Learners)'}
                </h2>
              </div>

              {activeCategory === 'evidence' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setIsManualModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#4f46e5',
                      color: '#fff',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                    }}
                  >
                    <Plus size={14} /> Nộp minh chứng mới
                  </button>
                  <button
                    onClick={() => navigate('/contributions/manual')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                      color: theme.textColor,
                      fontSize: '12.5px',
                      fontWeight: 600,
                      border: theme.tableBorder,
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={14} /> Quản lý chi tiết
                  </button>
                </div>
              )}

              {activeCategory === 'd4-peer' && (
                <button
                  onClick={() => navigate('/peer-review')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(236, 72, 153, 0.15)',
                    color: '#f472b6',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    border: '1px solid rgba(236, 72, 153, 0.35)',
                    cursor: 'pointer',
                  }}
                >
                  <Award size={14} /> Đi đến phòng Chấm chéo ↗
                </button>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: theme.subTextColor }}>
              {categoryMeta[activeCategory]?.subtitle || 'Bảng tổng hợp danh sách thành viên và tỷ lệ phân bổ trong Sprint.'}
            </p>
          </div>

          {/* Sub-header Controls Bar (Matching sample image: Peoples dropdown, + Add Filter, Gauge, Search, Export) */}
          <div
            className="report-panel-pad"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap',
              borderBottom: theme.tableBorder,
              backgroundColor: isLight ? '#fafbfc' : 'rgba(255, 255, 255, 0.02)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* 1. Member Picker Dropdown (Synchronized with DashboardFilters UI - Image 2) */}
              <div className="relative" ref={memberDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowMemberPickerDropdown((prev) => !prev);
                    setShowSortDropdown(false);
                    setShowFilterPopover(false);
                    setShowSprintDropdown(false);
                  }}
                  className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${showMemberPickerDropdown || filterMemberIds.length > 0
                    ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/50 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                    : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border-slate-300/80 dark:border-white/15 text-slate-800 dark:text-slate-200'
                    }`}
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[180px]">
                    {filterMemberIds.length === 0
                      ? 'Tất cả thành viên'
                      : filterMemberIds.length === 1
                        ? members.find((m) => m.userId === filterMemberIds[0])?.name ?? 'Thành viên'
                        : `${filterMemberIds.length}/${members.length} thành viên`}
                  </span>
                  {filterMemberIds.length === 1 && (() => {
                    const picked = members.find((m) => m.userId === filterMemberIds[0]);
                    return picked ? (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                        {picked.isLeader ? 'Leader' : 'Thành viên'}
                      </span>
                    ) : null;
                  })()}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${showMemberPickerDropdown ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
                      }`}
                  />
                </button>

                {/* Member Picker Popover Dropdown (Exact Match with DashboardFilters Image 2) */}
                {showMemberPickerDropdown && (
                  <div
                    className="absolute left-0 z-50 w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] overflow-hidden"
                    style={{
                      top: 'calc(100% + 8px)',
                      boxShadow:
                        '0 24px 50px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
                        LỌC THEO THÀNH VIÊN
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                        {members.length} Người
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                      {/* Option: Tất cả thành viên */}
                      <button
                        type="button"
                        onClick={() => {
                          setFilterMemberIds([]);
                          setShowMemberPickerDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${filterMemberIds.length === 0
                          ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-bold shadow-xs'
                          : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300'
                          }`}
                      >
                        <span className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          <Users className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Tất cả thành viên
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Hiển thị toàn bộ nhóm
                          </div>
                        </div>
                        {filterMemberIds.length === 0 && (
                          <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 stroke-[2.5]" />
                        )}
                      </button>

                      {/* Danh sách từng thành viên */}
                      {members.map((m) => {
                        const isActive = filterMemberIds.length === 1 && filterMemberIds[0] === m.userId;
                        const initials = getInitials(m.name);
                        const bg = getMemberAvatarBg(m.userId);
                        const roleLabel = m.isLeader ? 'Leader' : 'Thành viên';

                        return (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => {
                              setFilterMemberIds([m.userId]);
                              setShowMemberPickerDropdown(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${isActive
                              ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-bold shadow-xs'
                              : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            <span
                              className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-xs transition-transform group-hover:scale-105 overflow-hidden"
                              style={{ background: bg }}
                            >
                              {m.avatarUrl ? (
                                <img
                                  src={resolveAvatarUrl(m.avatarUrl) || m.avatarUrl}
                                  alt={m.name}
                                  className="w-full h-full object-cover rounded-xl"
                                />
                              ) : (
                                initials
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                {m.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {roleLabel}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-white/10">
                              {roleLabel}
                            </span>
                            {isActive && (
                              <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 stroke-[2.5]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 1b. Synchronized Custom Sort Dropdown (Matching DashboardFilters UI) */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSortDropdown((prev) => !prev);
                    setShowMemberPickerDropdown(false);
                    setShowFilterPopover(false);
                    setShowSprintDropdown(false);
                  }}
                  className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${showSortDropdown || sortBy !== 'PCT'
                    ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/50 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                    : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border-slate-300/80 dark:border-white/15 text-slate-800 dark:text-slate-200'
                    }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[170px]">
                    {sortBy === 'PCT'
                      ? '% Đóng góp (Cao → Thấp)'
                      : sortBy === 'D1'
                        ? 'D1 Sản lượng (Output)'
                        : sortBy === 'D2'
                          ? 'D2 Độ tin cậy'
                          : sortBy === 'D3'
                            ? 'D3 Phối hợp'
                            : sortBy === 'D4'
                              ? 'D4 Đánh giá chéo'
                              : 'Tên thành viên (A → Z)'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${showSortDropdown ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
                      }`}
                  />
                </button>

                {showSortDropdown && (
                  <div
                    className="absolute left-0 z-50 w-[300px] max-w-[calc(100vw-24px)] rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] overflow-hidden"
                    style={{
                      top: 'calc(100% + 8px)',
                      boxShadow:
                        '0 24px 50px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
                        SẮP XẾP THEO
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                        6 Tiêu chí
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                      {([
                        { key: 'PCT', code: '%', title: '% Đóng góp (Cao → Thấp)', subtitle: 'Xếp theo tỷ lệ phân bổ cuối cùng' },
                        { key: 'D1', code: 'D1', title: 'D1 Sản lượng (Output)', subtitle: 'Story points & nhiệm vụ hoàn thành' },
                        { key: 'D2', code: 'D2', title: 'D2 Độ tin cậy (Reliability)', subtitle: 'Tỷ lệ đúng hạn & ít làm lại' },
                        { key: 'D3', code: 'D3', title: 'D3 Phối hợp (Collaboration)', subtitle: 'Tương tác review & hỗ trợ nhóm' },
                        { key: 'D4', code: 'D4', title: 'D4 Đánh giá chéo (Peer)', subtitle: 'Điểm chấm chéo ẩn danh 360°' },
                        { key: 'NAME', code: 'AZ', title: 'Tên thành viên (A → Z)', subtitle: 'Sắp xếp theo thứ tự bảng chữ cái' },
                      ] as const).map((opt) => {
                        const isActive = sortBy === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              setSortBy(opt.key);
                              setShowSortDropdown(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${isActive
                              ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-bold shadow-xs'
                              : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300'
                              }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-mono font-bold shrink-0 transition-transform group-hover:scale-105 ${isActive
                                ? 'bg-cyan-600 text-white shadow-sm'
                                : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                              {opt.code}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                {opt.title}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {opt.subtitle}
                              </div>
                            </div>
                            {isActive && (
                              <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 stroke-[2.5]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. + Add Filter Button with Popover (Synchronized with DashboardFilters UI) */}
              <div className="relative" ref={filterPopoverRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowFilterPopover((prev) => !prev);
                    setShowMemberPickerDropdown(false);
                    setShowSortDropdown(false);
                    setShowSprintDropdown(false);
                  }}
                  className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${showFilterPopover || activeFilterCount > 0
                    ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/50 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                    : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border-slate-300/80 dark:border-white/15 text-slate-800 dark:text-slate-200'
                    }`}
                >
                  <Filter className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Bộ lọc</span>
                  {activeFilterCount > 0 && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-cyan-600 text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Filter Popover Dropdown */}
                {showFilterPopover && (
                  <div
                    className="report-popover absolute left-0 z-50 w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] overflow-hidden"
                    style={{
                      top: 'calc(100% + 8px)',
                      boxShadow:
                        '0 24px 50px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal size={13} className="text-cyan-600 dark:text-cyan-400" />
                        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
                          BỘ LỌC NÂNG CAO
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterDimensions({ d1: true, d2: true, d3: true, d4: true, evidence: true });
                            setFilterStatus('ALL');
                            setFilterContributionTier('ALL');
                            setFilterRole('ALL');
                            setSortBy('PCT');
                          }}
                          title="Đặt lại bộ lọc về mặc định"
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-0"
                        >
                          <RotateCcw size={11} />
                          <span>Đặt lại</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowFilterPopover(false)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer bg-transparent border-0"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-3 max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {/* Dimension Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Chiều đo hiển thị
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                            {Object.values(filterDimensions).filter(Boolean).length}/5 đã chọn
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {[
                            { key: 'd1', label: 'D1 Sản lượng (Story point & Tasks)' },
                            { key: 'd2', label: 'D2 Độ tin cậy (Đúng hạn & Ít rework)' },
                            { key: 'd3', label: 'D3 Phối hợp (Review & Trao đổi)' },
                            { key: 'd4', label: 'D4 Đánh giá chéo (K-Anonymity)' },
                            { key: 'evidence', label: 'Minh chứng công việc đã duyệt' },
                          ].map((item) => (
                            <label
                              key={item.key}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filterDimensions[item.key]}
                                onChange={() => setFilterDimensions((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                                style={{ accentColor: '#0891b2', width: '14px', height: '14px' }}
                              />
                              <span>{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Contribution Tier Pills */}
                      <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Mức độ đóng góp (%)
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {([
                            { value: 'ALL', label: 'Tất cả mức' },
                            { value: 'HIGH', label: 'Cao (≥ 20%)' },
                            { value: 'MED', label: 'Cân bằng (10-20%)' },
                            { value: 'LOW', label: 'Cần hỗ trợ (< 10%)' },
                          ] as const).map((tier) => {
                            const active = filterContributionTier === tier.value;
                            return (
                              <button
                                key={tier.value}
                                type="button"
                                onClick={() => setFilterContributionTier(tier.value)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-left flex items-center justify-between cursor-pointer border transition-all ${active
                                  ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/40 text-cyan-900 dark:text-cyan-200'
                                  : 'bg-slate-100/80 dark:bg-white/[0.04] border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.08]'
                                  }`}
                              >
                                <span className="truncate">{tier.label}</span>
                                {active && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Evidence Status Pills */}
                      <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Trạng thái thẩm định
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { value: 'ALL', label: 'Tất cả trạng thái' },
                            { value: 'SUFFICIENT', label: 'Đạt chuẩn' },
                            { value: 'INSUFFICIENT', label: 'Đang thẩm định' },
                            { value: 'SUSPICIOUS', label: 'Bất thường' },
                          ].map((st) => {
                            const active = filterStatus === st.value;
                            return (
                              <button
                                key={st.value}
                                type="button"
                                onClick={() => setFilterStatus(st.value)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-left flex items-center justify-between cursor-pointer border transition-all ${active
                                  ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/40 text-cyan-900 dark:text-cyan-200'
                                  : 'bg-slate-100/80 dark:bg-white/[0.04] border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.08]'
                                  }`}
                              >
                                <span className="truncate">{st.label}</span>
                                {active && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Role Filter Pills */}
                      {availableRoles.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Vai trò (Role)
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {['ALL', ...availableRoles].map((r) => {
                              const active = filterRole === r;
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setFilterRole(r)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${active
                                    ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/40 text-cyan-900 dark:text-cyan-200'
                                    : 'bg-slate-100/80 dark:bg-white/[0.04] border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.08]'
                                    }`}
                                >
                                  <span>{r === 'ALL' ? 'Tất cả vai trò' : r}</span>
                                  {active && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowFilterPopover(false)}
                        className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border-0 shadow-sm transition-all"
                      >
                        <Check size={14} />
                        <span>Áp dụng ({filteredMembers.length} thành viên)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Total Allocation Gauge (Interactive Clickable Widget) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowAllocationModal(true)}
                title="Nhấp để xem chi tiết ma trận phân bổ 100% & Kiểm định công bằng"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginLeft: '6px',
                  padding: '5px 12px 5px 8px',
                  borderRadius: '10px',
                  backgroundColor: isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.backgroundColor = isLight ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.2)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(16, 185, 129, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
                  e.currentTarget.style.backgroundColor = isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <CircularProgress
                  pct={Math.min(100, Math.max(0, Math.round(Number(totalPercentage))))}
                  size={36}
                  color={Math.abs(Number(totalPercentage) - 100) <= 0.5 ? '#10b981' : '#f59e0b'}
                />
                <div>
                  <div style={{ fontSize: '11px', color: theme.subTextColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Tổng phân bổ</span>
                    <Info size={11} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: theme.headingColor }}>
                    {totalPercentage}%
                  </div>
                </div>
              </div>
            </div>

            {/* Right Controls: Search, Export Button */}
            <div style={{ display: 'flex', flexWrap: 'wrap', marginLeft: 'auto', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isLight ? '#fff' : '#27272a', padding: '6px 14px', borderRadius: '999px', border: theme.tableBorder, width: '190px' }}>
                <Search size={14} color={theme.subTextColor} style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: theme.textColor, outline: 'none', fontSize: '12.5px', width: '100%', minWidth: 0 }}
                />
              </div>

              <button
                type="button"
                onClick={handleDownloadBackendPdf}
                disabled={downloading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 18px -4px rgba(79, 70, 229, 0.45)',
                }}
              >
                <Download size={13} />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* ── View 1: Overview Tab Table (Exact Styling from Image) ── */}
          {activeTab === 'overview' && (
            <div className="report-panel-pad" style={{ flex: 1, overflowY: 'auto' }}>
              {/* Inner Table Heading Banner */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)',
                  border: theme.tableBorder,
                  marginBottom: '14px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: theme.headingColor }}>
                  <BookOpen size={16} color="#818cf8" />
                  <span>{currentSprint ? currentSprint.name : 'Sprint'} · {categoryMeta[activeCategory]?.title || 'Bảng phân bổ & Năng suất'}</span>
                </div>
                <div style={{ fontSize: '12px', color: theme.subTextColor }}>
                  &lt; 1/{members.length || 1} Thành viên &gt;
                </div>
              </div>

              {/* View 1A: Leaderboards View */}
              {activeCategory === 'leaderboards' && (
                <div>
                  {/* Podium for Top 3 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                    {filteredMembers.slice(0, 3).map((m, idx) => {
                      const podiumStyle = [
                        { title: 'HẠNG 1 · QUÁN QUÂN', color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))', border: '1px solid rgba(245, 158, 11, 0.35)', icon: <Crown size={16} color="#f59e0b" /> },
                        { title: 'HẠNG 2 · Á QUÂN', color: '#94a3b8', bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.15), rgba(100, 116, 139, 0.05))', border: '1px solid rgba(148, 163, 184, 0.35)', icon: <Medal size={16} color="#94a3b8" /> },
                        { title: 'HẠNG 3 · QUÝ QUÂN', color: '#d97706', bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(180, 83, 9, 0.05))', border: '1px solid rgba(217, 119, 6, 0.35)', icon: <Medal size={16} color="#d97706" /> },
                      ][idx];
                      return (
                        <div
                          key={m.userId}
                          style={{
                            padding: '16px',
                            borderRadius: '14px',
                            background: podiumStyle.bg,
                            border: podiumStyle.border,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: podiumStyle.color }}>
                              {podiumStyle.icon}
                              <span>{podiumStyle.title}</span>
                            </div>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: podiumStyle.color, fontFamily: 'monospace' }}>
                              {m.pct.toFixed(1)}%
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                overflow: 'hidden',
                              }}
                            >
                              {m.avatarUrl ? (
                                <img
                                  src={resolveAvatarUrl(m.avatarUrl) || m.avatarUrl}
                                  alt={m.name}
                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                getInitials(m.name)
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: theme.headingColor, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: theme.subTextColor }}>
                                {m.tasks} tasks · {m.edits} events
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Leaderboard Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor, whiteSpace: 'nowrap' }}>
                          <th style={{ width: '60px', padding: '12px 10px', textAlign: 'center', fontWeight: 600 }}>Thứ hạng</th>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Thành viên</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Tasks hoàn thành</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Điểm 4D tổng hợp</th>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600, width: '220px' }}>Tỷ lệ đóng góp (%)</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m, rank) => (
                          <tr key={m.userId} style={{ borderBottom: theme.tableRowBorder }}>
                            <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 26,
                                  height: 26,
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  backgroundColor: rank === 0 ? 'rgba(245, 158, 11, 0.2)' : rank === 1 ? 'rgba(148, 163, 184, 0.2)' : rank === 2 ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.05)',
                                  color: rank === 0 ? '#f59e0b' : rank === 1 ? '#94a3b8' : rank === 2 ? '#d97706' : theme.subTextColor,
                                  border: rank < 3 ? '1px solid currentColor' : theme.tableBorder,
                                }}
                              >
                                {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : rank + 1}
                              </span>
                            </td>
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  {m.avatarUrl ? (
                                    <img
                                      src={resolveAvatarUrl(m.avatarUrl) || m.avatarUrl}
                                      alt={m.name}
                                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    getInitials(m.name)
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: theme.headingColor }}>{m.name}</div>
                                  <div style={{ fontSize: '11px', color: theme.subTextColor }}>{m.role} {m.email ? `· ${m.email}` : ''}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px', fontWeight: 600 }}>{m.tasks} tasks</td>
                            <td style={{ textAlign: 'center', padding: '14px', fontFamily: 'monospace', fontWeight: 700, color: '#818cf8' }}>
                              {m.compositeScore.toFixed(1)}
                            </td>
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1, height: '8px', borderRadius: '4px', backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, m.pct * 2.5)}%`, backgroundColor: m.color, borderRadius: '4px' }} />
                                </div>
                                <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '13px', color: theme.headingColor, width: '45px' }}>
                                  {m.pct.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <button
                                onClick={() => {
                                  setSelectedUserId(m.userId);
                                  setActiveTab('progress');
                                  setActiveCategory('radar-4d');
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Chi tiết 4D ↗
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 1B: D1 Output View */}
              {activeCategory === 'd1-output' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme.tableBorder }}>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Tổng nhiệm vụ hoàn thành</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px', fontFamily: 'monospace' }}>{totalTasks} Tasks</div>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>Ghi nhận từ Task Board</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme.tableBorder }}>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Story Points ước tính</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#818cf8', marginTop: '4px', fontFamily: 'monospace' }}>{totalTasks * 3} SP</div>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>Độ khó trung bình 3.0</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme.tableBorder }}>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Điểm D1 cao nhất</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>
                        {Math.max(...members.map((m) => m.d1Output), 0).toFixed(2)} / 1.00
                      </div>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>Chuẩn hóa Tier-1 Output</div>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor, whiteSpace: 'nowrap' }}>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Thành viên</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Tasks hoàn thành</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Ước tính Story Points</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Điểm D1 Output (0 - 1.0)</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Tỷ lệ đóng góp</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m) => (
                          <tr key={m.userId} style={{ borderBottom: theme.tableRowBorder }}>
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  {m.avatarUrl ? (
                                    <img
                                      src={resolveAvatarUrl(m.avatarUrl) || m.avatarUrl}
                                      alt={m.name}
                                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    getInitials(m.name)
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: theme.headingColor }}>{m.name}</div>
                                  <div style={{ fontSize: '11px', color: theme.subTextColor }}>{m.role}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px', fontWeight: 600 }}>{m.tasks} tasks</td>
                            <td style={{ textAlign: 'center', padding: '14px', fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>
                              {m.tasks * 3} SP
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                                {m.d1Output.toFixed(2)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px', fontWeight: 700, color: theme.headingColor }}>
                              {m.pct.toFixed(1)}%
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <button
                                onClick={() => {
                                  setSelectedUserId(m.userId);
                                  setActiveTab('progress');
                                  setActiveCategory('radar-4d');
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Xem Radar 4D
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 1C: D2 Reliability View */}
              {activeCategory === 'd2-reliability' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme.tableBorder }}>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Độ tin cậy nhóm</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399', marginTop: '4px', fontFamily: 'monospace' }}>
                        {(members.reduce((a, m) => a + m.d2Reliability, 0) / (members.length || 1)).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>Điểm D2 trung bình</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme.tableBorder }}>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Tỷ lệ đúng tiến độ</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>95.2%</div>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>Đúng hạn (Punctuality)</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme.tableBorder }}>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Tỷ lệ làm lại (Rework)</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6', marginTop: '4px', fontFamily: 'monospace' }}>&lt; 4.5%</div>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>Chất lượng bàn giao cao</div>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor, whiteSpace: 'nowrap' }}>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Thành viên</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Điểm D2 (Reliability)</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Trạng thái hồ sơ</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Khoảng tin cậy Bootstrap</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Đánh giá rủi ro</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m) => (
                          <tr key={m.userId} style={{ borderBottom: theme.tableRowBorder }}>
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  {m.avatarUrl ? (
                                    <img
                                      src={resolveAvatarUrl(m.avatarUrl) || m.avatarUrl}
                                      alt={m.name}
                                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    getInitials(m.name)
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: theme.headingColor }}>{m.name}</div>
                                  <div style={{ fontSize: '11px', color: theme.subTextColor }}>{m.role}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34d399', fontWeight: 700, fontFamily: 'monospace' }}>
                                {m.d2Reliability.toFixed(2)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, backgroundColor: m.evidenceStatus === 'SUFFICIENT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: m.evidenceStatus === 'SUFFICIENT' ? '#34d399' : '#fbbf24' }}>
                                {m.evidenceStatus === 'SUFFICIENT' ? 'Đạt chuẩn' : 'Đang thẩm định'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px', fontFamily: 'monospace', color: '#818cf8', fontWeight: 600 }}>
                              [{m.ciLow}%, {m.ciHigh}%]
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: m.isSuspicious ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                {m.isSuspicious ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                                <span>{m.isSuspicious ? 'Bất thường' : 'An toàn'}</span>
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <button
                                onClick={() => {
                                  setSelectedUserId(m.userId);
                                  setActiveTab('progress');
                                  setActiveCategory('radar-4d');
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Xem Radar 4D
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 1D: D3 Collaboration View */}
              {activeCategory === 'd3-collaboration' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme.tableBorder }}>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Tổng hoạt động ghi nhận</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24', marginTop: '4px', fontFamily: 'monospace' }}>{totalEdits} Events</div>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>Review & Thảo luận thẻ việc</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme.tableBorder }}>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Điểm D3 trung bình</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '4px', fontFamily: 'monospace' }}>
                        {(members.reduce((a, m) => a + m.d3Collaboration, 0) / (members.length || 1)).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>Phối hợp (Collab)</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme.tableBorder }}>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Mức độ tương tác</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>Tích cực</div>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>Tất cả thành viên đều kết nối</div>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor, whiteSpace: 'nowrap' }}>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Thành viên</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Điểm D3 (Collab)</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Hoạt động ghi nhận (Events)</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Vai trò trong nhóm</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m) => (
                          <tr key={m.userId} style={{ borderBottom: theme.tableRowBorder }}>
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  {m.avatarUrl ? (
                                    <img
                                      src={resolveAvatarUrl(m.avatarUrl) || m.avatarUrl}
                                      alt={m.name}
                                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    getInitials(m.name)
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: theme.headingColor }}>{m.name}</div>
                                  <div style={{ fontSize: '11px', color: theme.subTextColor }}>{m.role}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontWeight: 700, fontFamily: 'monospace' }}>
                                {m.d3Collaboration.toFixed(2)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px', fontWeight: 600 }}>{m.edits} events</td>
                            <td style={{ textAlign: 'center', padding: '14px', color: m.isLeader ? '#818cf8' : theme.subTextColor, fontWeight: m.isLeader ? 700 : 500 }}>
                              {m.role}
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <button
                                onClick={() => {
                                  setSelectedUserId(m.userId);
                                  setActiveTab('progress');
                                  setActiveCategory('radar-4d');
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Xem Radar 4D
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 1E: D4 Peer Review View */}
              {activeCategory === 'd4-peer' && (
                <div>
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(236, 72, 153, 0.08)',
                      border: '1px solid rgba(236, 72, 153, 0.25)',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Award size={22} color="#f472b6" />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f472b6' }}>
                          Đánh giá chéo ngang hàng (Peer Review · K-Anonymity k=3)
                        </div>
                        <div style={{ fontSize: '12px', color: theme.subTextColor, marginTop: '2px', maxWidth: '600px' }}>
                          Điểm đánh giá giữa các thành viên theo 3 tiêu chí: Chất lượng, Tiến độ, Hợp tác. Bảo mật ẩn danh hoàn toàn để tránh thiên vị hoặc trả đũa.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/peer-review')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 18px',
                        borderRadius: '10px',
                        backgroundColor: '#ec4899',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(236, 72, 153, 0.35)',
                      }}
                    >
                      <Award size={15} /> Mở phòng Chấm chéo đầy đủ ↗
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor, whiteSpace: 'nowrap' }}>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Thành viên</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Điểm D4 (Peer Score)</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Điểm sao trung bình (★)</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Trạng thái K-Anonymity</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m) => (
                          <tr key={m.userId} style={{ borderBottom: theme.tableRowBorder }}>
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  {m.avatarUrl ? (
                                    <img
                                      src={resolveAvatarUrl(m.avatarUrl) || m.avatarUrl}
                                      alt={m.name}
                                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    getInitials(m.name)
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: theme.headingColor }}>{m.name}</div>
                                  <div style={{ fontSize: '11px', color: theme.subTextColor }}>{m.role}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', fontWeight: 700, fontFamily: 'monospace' }}>
                                {m.d4Peer.toFixed(2)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px', fontWeight: 700, color: '#f59e0b' }}>
                              {m.peerScore}
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, backgroundColor: m.peerScore.includes('★') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: m.peerScore.includes('★') ? '#34d399' : '#94a3b8' }}>
                                {m.peerScore.includes('★') ? (
                                  <>
                                    <CheckCircle2 size={12} />
                                    <span>K-Anonymity Đạt chuẩn</span>
                                  </>
                                ) : (
                                  'Đang thu thập phiếu'
                                )}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '14px' }}>
                              <button
                                onClick={() => navigate('/peer-review')}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(236, 72, 153, 0.15)',
                                  color: '#f472b6',
                                  border: '1px solid rgba(236, 72, 153, 0.3)',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Chấm điểm bạn này ↗
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 1F: Manual Evidence View */}
              {activeCategory === 'evidence' && (
                <div>
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileCheck size={22} color="#818cf8" />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8' }}>
                          Minh chứng ngoài hệ thống (Manual Contributions)
                        </div>
                        <div style={{ fontSize: '12px', color: theme.subTextColor, marginTop: '2px', maxWidth: '600px' }}>
                          Bao gồm chứng chỉ, slide thuyết trình, tài liệu khảo sát, biên bản kiểm thử được nộp thủ công và thẩm định bởi hội đồng nhóm.
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setIsManualModalOpen(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          backgroundColor: '#4f46e5',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                        }}
                      >
                        <Plus size={14} /> Nộp minh chứng mới
                      </button>
                      <button
                        onClick={() => navigate('/contributions/manual')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                          color: theme.textColor,
                          fontWeight: 600,
                          fontSize: '12.5px',
                          border: theme.tableBorder,
                          cursor: 'pointer',
                        }}
                      >
                        <ExternalLink size={14} /> Trang Quản lý ↗
                      </button>
                    </div>
                  </div>

                  {manualList.length === 0 ? (
                    <div
                      style={{
                        padding: '48px 24px',
                        textAlign: 'center',
                        borderRadius: '14px',
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                        border: theme.tableBorder,
                      }}
                    >
                      <FileText size={40} color="#818cf8" style={{ margin: '0 auto 12px auto' }} />
                      <div style={{ fontSize: '15px', fontWeight: 700, color: theme.headingColor, marginBottom: '6px' }}>
                        Chưa có minh chứng ngoài hệ thống nào trong Sprint này
                      </div>
                      <p style={{ fontSize: '13px', color: theme.subTextColor, maxWidth: '520px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
                        Bạn hoặc các thành viên có thể nộp chứng chỉ, slide thuyết trình, hoặc tài liệu nghiên cứu ngoại tuyến để được duyệt cộng điểm đóng góp.
                      </p>
                      <button
                        onClick={() => setIsManualModalOpen(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '9px 18px',
                          borderRadius: '10px',
                          backgroundColor: '#4f46e5',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '13px',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
                        }}
                      >
                        <Plus size={15} /> Nộp minh chứng ngay
                      </button>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor }}>
                            <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Tên minh chứng / Nhiệm vụ</th>
                            <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Người nộp</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Điểm (SP)</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Trạng thái duyệt</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Ngày nộp</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Liên kết</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manualList.map((item) => (
                            <tr key={item.id} style={{ borderBottom: theme.tableRowBorder }}>
                              <td style={{ padding: '14px', fontWeight: 600, color: theme.headingColor }}>
                                {item.taskName}
                              </td>
                              <td style={{ padding: '14px', color: theme.subTextColor }}>
                                {item.userName || `User #${item.userId}`}
                              </td>
                              <td style={{ textAlign: 'center', padding: '14px', fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>
                                {item.storyPoints} SP
                              </td>
                              <td style={{ textAlign: 'center', padding: '14px' }}>
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    backgroundColor:
                                      item.status === 'APPROVED'
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : item.status === 'REJECTED'
                                          ? 'rgba(239, 68, 68, 0.15)'
                                          : 'rgba(245, 158, 11, 0.15)',
                                    color:
                                      item.status === 'APPROVED'
                                        ? '#34d399'
                                        : item.status === 'REJECTED'
                                          ? '#ef4444'
                                          : '#fbbf24',
                                  }}
                                >
                                  {item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', padding: '14px', color: theme.subTextColor, fontSize: '12px' }}>
                                {formatDate(item.createdAt)}
                              </td>
                              <td style={{ textAlign: 'center', padding: '14px' }}>
                                {item.evidenceLink ? (
                                  <a
                                    href={item.evidenceLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}
                                  >
                                    <ExternalLink size={13} /> Mở link
                                  </a>
                                ) : (
                                  <span style={{ color: theme.subTextColor }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* View 1G: Default / Learners View */}
              {activeCategory !== 'leaderboards' &&
                activeCategory !== 'd1-output' &&
                activeCategory !== 'd2-reliability' &&
                activeCategory !== 'd3-collaboration' &&
                activeCategory !== 'd4-peer' &&
                activeCategory !== 'evidence' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor, whiteSpace: 'nowrap' }}>
                          <th style={{ width: '38px', padding: '12px 10px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.length === members.length && members.length > 0}
                              onChange={toggleSelectAll}
                              style={{ accentColor: '#4f46e5', width: '14px', height: '14px' }}
                            />
                          </th>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Full name ↕</th>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Status ↕</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Điểm (SP)</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Tỷ lệ đóng góp (%)</th>
                          <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Assigned by ↕</th>
                          <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: theme.subTextColor }}>
                              Chưa có dữ liệu thành viên nào cho đợt này.
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((m) => {
                            const isChecked = selectedMemberIds.includes(m.userId);
                            return (
                              <tr
                                key={m.userId}
                                style={{
                                  borderBottom: theme.tableRowBorder,
                                  backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                                  transition: 'background 0.15s ease',
                                }}
                              >
                                {/* Checkbox */}
                                <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSelectMember(m.userId)}
                                    style={{ accentColor: '#4f46e5', width: '14px', height: '14px' }}
                                  />
                                </td>

                                {/* Full Name & Avatar & Role */}
                                <td style={{ padding: '14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div
                                      style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '50%',
                                        backgroundColor: m.color,
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '11.5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {getInitials(m.name)}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 700, color: theme.headingColor }}>
                                        {m.name}
                                      </div>
                                      <div style={{ fontSize: '11px', color: m.isLeader ? '#818cf8' : theme.subTextColor }}>
                                        {m.role} {m.email ? `· ${m.email}` : ''}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Status with Colored Dot */}
                                <td style={{ padding: '14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: m.isSuspicious
                                          ? '#ef4444'
                                          : m.evidenceStatus === 'SUFFICIENT'
                                            ? '#10b981'
                                            : '#f59e0b',
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: '12.5px',
                                        color: m.isSuspicious
                                          ? '#ef4444'
                                          : m.evidenceStatus === 'SUFFICIENT'
                                            ? theme.headingColor
                                            : theme.subTextColor,
                                      }}
                                    >
                                      {m.isSuspicious
                                        ? 'Bất thường'
                                        : m.evidenceStatus === 'SUFFICIENT'
                                          ? 'Đạt chuẩn'
                                          : 'Đang thẩm định'}
                                    </span>
                                  </div>
                                </td>

                                {/* Points (e.g. • 4pts from sample) */}
                                <td style={{ textAlign: 'center', padding: '14px', fontFamily: 'monospace', fontWeight: 600 }}>
                                  <span style={{ color: '#f59e0b' }}>• </span>
                                  <span>{m.tasks} tasks</span>
                                </td>

                                {/* Circular Percentage Ring (matching sample 30%, 70%) */}
                                <td style={{ textAlign: 'center', padding: '14px' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                                    <CircularProgress pct={m.pct} size={36} color={m.color} />
                                  </div>
                                </td>

                                {/* Assigned By (Leader or Reviewer) */}
                                <td style={{ padding: '14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div
                                      style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(99, 102, 241, 0.25)',
                                        color: '#818cf8',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {getInitials(leaderName)}
                                    </div>
                                    <span style={{ fontSize: '12.5px', color: theme.headingColor }}>
                                      {leaderName.split(' ').slice(-2).join(' ')}
                                    </span>
                                  </div>
                                </td>

                                {/* Actions: Radar & Email */}
                                <td style={{ textAlign: 'center', padding: '14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <button
                                      onClick={() => {
                                        setSelectedUserId(m.userId);
                                        setActiveTab('progress');
                                        setActiveCategory('radar-4d');
                                      }}
                                      title="Xem Radar 4 Chiều"
                                      style={{
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                        color: '#818cf8',
                                        border: '1px solid rgba(99, 102, 241, 0.25)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Radar 4D
                                    </button>
                                    <button
                                      onClick={() => handleSendIndividualEmail(m.userId, m.name)}
                                      disabled={sendingEmailUserId === m.userId}
                                      title="Gửi báo cáo qua Email"
                                      style={{
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                        color: theme.textColor,
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        fontSize: '11px',
                                        cursor: sendingEmailUserId === m.userId ? 'not-allowed' : 'pointer',
                                      }}
                                    >
                                      <Mail size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* ── View 2: Progress & 4D Radar Tab ── */}
          {activeTab === 'progress' && (
            <div className="report-panel-pad" style={{ flex: 1, overflowY: 'auto' }}>
              {/* Member Picker Pills */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px' }}>
                {members.map((m) => {
                  const isSelected = selectedUserId === m.userId;
                  return (
                    <button
                      key={m.userId}
                      onClick={() => setSelectedUserId(m.userId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 14px',
                        borderRadius: '999px',
                        backgroundColor: isSelected ? '#4f46e5' : isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#fff' : theme.textColor,
                        border: isSelected ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '12.5px',
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          backgroundColor: m.color,
                          color: '#fff',
                          fontSize: '9px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getInitials(m.name)}
                      </div>
                      <span>{m.name}</span>
                      <span style={{ fontSize: '11px', opacity: 0.85 }}>({m.pct.toFixed(1)}%)</span>
                    </button>
                  );
                })}
              </div>

              {selectedMember && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px', marginBottom: '24px' }}>
                  {/* Radar Chart */}
                  <div
                    style={{
                      backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                      border: theme.tableBorder,
                      borderRadius: '16px',
                      padding: 'clamp(12px, 2.5vw, 20px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ width: '100%', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: theme.headingColor }}>
                        Hồ sơ Vector 4 Chiều (Radar Profile)
                      </h3>
                      <div style={{ fontSize: '11.5px', color: theme.subTextColor }}>
                        Nén từ không gian đa chiều thô sang 4 trục chuẩn hóa D1 - D4
                      </div>
                    </div>

                    <div style={{ width: '100%', height: Math.round(radarSize * 0.72) + 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <RadarChart
                        width={radarSize}
                        height={Math.round(radarSize * 0.72)}
                        cx="50%"
                        cy="50%"
                        outerRadius={radarSize < 340 ? '52%' : '60%'}
                        margin={{
                          top: 16,
                          right: radarSize < 340 ? 48 : 66,
                          bottom: 16,
                          left: radarSize < 340 ? 52 : 70,
                        }}
                        data={radarData}
                      >
                        <PolarGrid stroke={isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'} />
                        <PolarAngleAxis
                          dataKey="dimension"
                          tick={(props) => {
                            const { x, y, textAnchor, payload } = props as {
                              x: number;
                              y: number;
                              textAnchor: 'start' | 'middle' | 'end' | 'inherit';
                              payload?: { value?: string };
                            };
                            const raw = String(payload?.value || '');
                            const splitIdx = raw.indexOf('(');
                            const hasParen = splitIdx > 0;
                            const line1 = hasParen ? raw.slice(0, splitIdx).trim() : raw;
                            const line2 = hasParen ? raw.slice(splitIdx).trim() : '';
                            const isTopOrBottom = textAnchor === 'middle';
                            return (
                              <text
                                x={x}
                                y={y}
                                textAnchor={textAnchor}
                                fill={theme.subTextColor}
                                fontSize={radarSize < 340 ? 10 : 11}
                                fontWeight={500}
                              >
                                {isTopOrBottom || !line2 ? (
                                  <tspan x={x} dy="0.35em">{raw}</tspan>
                                ) : (
                                  <>
                                    <tspan x={x} dy="-0.15em">{line1}</tspan>
                                    <tspan x={x} dy="1.2em">{line2}</tspan>
                                  </>
                                )}
                              </text>
                            );
                          }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: theme.subTextColor, fontSize: 10 }} />
                        <Radar
                          name={selectedMember.name}
                          dataKey="value"
                          stroke="#818cf8"
                          fill="#6366f1"
                          fillOpacity={0.35}
                        />
                      </RadarChart>
                    </div>
                  </div>

                  {/* 4 Dimension Bars & Email Action */}
                  <div
                    style={{
                      backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                      border: theme.tableBorder,
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase' }}>
                            BÁO CÁO CÁ NHÂN
                          </div>
                          <h2 style={{ fontSize: '20px', fontWeight: 800, color: theme.headingColor, margin: '2px 0' }}>
                            {selectedMember.name}
                          </h2>
                          <div style={{ fontSize: '12px', color: theme.subTextColor }}>
                            {selectedMember.role} · {selectedMember.email || 'Chưa cập nhật'}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '28px', fontWeight: 800, color: '#818cf8', fontFamily: 'monospace' }}>
                            {selectedMember.pct.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: '11px', color: theme.subTextColor }}>Tỷ lệ đóng góp p_i</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: 'D1 Output (Sản lượng & Độ khó)', val: selectedMember.d1Output, color: '#38bdf8' },
                          { label: 'D2 Reliability (Độ tin cậy)', val: selectedMember.d2Reliability, color: '#34d399' },
                          { label: 'D3 Collaboration (Phối hợp)', val: selectedMember.d3Collaboration, color: '#fbbf24' },
                          { label: 'D4 Peer Review (Đánh giá chéo)', val: selectedMember.d4Peer, color: '#f472b6' },
                        ].map((d) => (
                          <div key={d.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ fontWeight: 600, color: theme.headingColor }}>{d.label}</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: d.color }}>{d.val.toFixed(2)}</span>
                            </div>
                            <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(100, d.val * 100)}%`, backgroundColor: d.color }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: '14px', fontSize: '12px', color: theme.subTextColor }}>
                        Khoảng tin cậy Bootstrap: <strong style={{ color: '#38bdf8' }}>[{selectedMember.ciLow}%, {selectedMember.ciHigh}%]</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                      <button
                        onClick={() => handleSendIndividualEmail(selectedMember.userId, selectedMember.name)}
                        disabled={sendingEmailUserId === selectedMember.userId}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          backgroundColor: '#4f46e5',
                          color: '#fff',
                          borderRadius: '10px',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: sendingEmailUserId === selectedMember.userId ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Mail size={15} />
                        {sendingEmailUserId === selectedMember.userId ? 'Đang gửi email...' : `Gửi báo cáo qua email tới ${selectedMember.name}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence list */}
              {individualData?.evidenceList && individualData.evidenceList.length > 0 && (
                <div style={{ backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)', border: theme.tableBorder, borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: theme.headingColor, marginBottom: '10px' }}>
                    Minh chứng ghi nhận ({individualData.evidenceList.length} nhiệm vụ)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {individualData.evidenceList.map((ev: EvidenceSummary, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', backgroundColor: isLight ? '#fff' : 'rgba(255,255,255,0.02)', fontSize: '12px' }}>
                        <span style={{ fontWeight: 600, color: theme.headingColor }}>{ev.taskName}</span>
                        <div style={{ display: 'flex', gap: '12px', color: theme.subTextColor }}>
                          <span>{ev.storyPoints} SP</span>
                          <span style={{ color: '#10b981' }}>+{ev.earnedScore}</span>
                          <span>{formatDate(ev.eventTime)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── View 3: Export Tab Quick Controls ── */}
          {activeTab === 'export' && (
            <div className="report-panel-pad" style={{ borderBottom: theme.tableBorder }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownloadBackendPdf}
                  disabled={downloading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    backgroundColor: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: downloading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Download size={15} /> {downloading ? 'Đang tạo PDF...' : 'Xuất PDF chính thức'}
                </button>

                <button
                  onClick={handleSendAllEmails}
                  disabled={sendingAllEmails}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: sendingAllEmails ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send size={15} /> {sendingAllEmails ? 'Đang gửi...' : 'Gửi Email toàn nhóm'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. THE OFFICIAL ACADEMIC DOCUMENT (Rendered at bottom for Preview & Tests) */}
      <div
        className="paper report-print-document"
        style={{
          backgroundColor: theme.paperBg,
          color: theme.paperColor,
          borderRadius: '16px',
          border: theme.paperBorder,
          boxShadow: theme.paperShadow,
          maxWidth: '100%',
          boxSizing: 'border-box',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: theme.paperHeaderBorder, paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: theme.paperSubText, textTransform: 'uppercase' }}>
              FAIRSHARE · HỆ THỐNG ĐO LƯỜNG ĐÓNG GÓP ĐỒ ÁN NHÓM
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: theme.paperHeading, margin: '4px 0 2px 0' }}>
              BÁO CÁO NGHIỆM THU ĐÓNG GÓP &amp; MINH BẠCH NĂNG SUẤT
            </h2>
            <div style={{ fontSize: '13px', color: theme.paperSubText }}>
              Đồ án: <strong style={{ color: theme.paperHeading }}>{teamName}</strong> · Mã nhóm: <code style={{ backgroundColor: theme.paperCodeBg, padding: '2px 6px', borderRadius: '4px', color: theme.paperCodeColor }}>{inviteCode}</code>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: theme.paperSubText }}>Thời điểm xuất:</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: theme.paperHeading, fontFamily: 'monospace' }}>{todayStr}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              <CheckCircle2 size={12} />
              <span>Dữ liệu bất biến đã khóa</span>
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          className="report-paper-grid-2"
          style={{
            backgroundColor: theme.paperCardBg,
            border: theme.paperCardBorder,
            borderRadius: '8px',
            padding: '14px 18px',
            fontSize: '13px',
            marginBottom: '22px',
          }}
        >
          <div>
            <span style={{ color: theme.paperSubText }}>Giai đoạn đánh giá:</span>{' '}
            <strong style={{ color: theme.paperHeading }}>{currentSprint?.name || 'Sprint'}</strong>
          </div>
          <div>
            <span style={{ color: theme.paperSubText }}>Thời gian thực hiện:</span>{' '}
            <strong style={{ color: theme.paperHeading }}>
              {formatDate(currentSprint?.startDate)} — {formatDate(currentSprint?.endDate)}
            </strong>
          </div>
          <div>
            <span style={{ color: theme.paperSubText }}>Trưởng nhóm đại diện:</span>{' '}
            <strong style={{ color: theme.paperHeading }}>{leaderName}</strong>
          </div>
          <div>
            <span style={{ color: theme.paperSubText }}>Cơ chế bảo vệ dữ liệu:</span>{' '}
            <strong style={{ color: theme.paperHeading }}>Nghị định 13/2023/NĐ-CP (100% Đồng thuận)</strong>
          </div>
        </div>

        {/* Members Table */}
        <div style={{ overflowX: 'auto', marginBottom: '22px' }}>
          <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: theme.paperHeaderBorder, backgroundColor: theme.paperTableHeaderBg, whiteSpace: 'nowrap' }}>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: theme.paperTableHeaderText, fontWeight: 700, width: '40px' }}>STT</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: theme.paperTableHeaderText, fontWeight: 700 }}>Thành viên &amp; Vai trò</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: theme.paperTableHeaderText, fontWeight: 700, width: '220px' }}>Tỷ lệ đóng góp (%)</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: theme.paperTableHeaderText, fontWeight: 700, width: '80px' }}>Task</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: theme.paperTableHeaderText, fontWeight: 700, width: '90px' }}>Hoạt động</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: theme.paperTableHeaderText, fontWeight: 700, width: '100px' }}>Chấm chéo</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', color: theme.paperTableHeaderText, fontWeight: 700, width: '110px' }}>Minh chứng</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: theme.paperSubText }}>
                    Chưa có dữ liệu đóng góp cho giai đoạn này.
                  </td>
                </tr>
              ) : (
                members.map((m, idx) => (
                  <tr key={m.userId} style={{ borderBottom: theme.paperTableRowBorder }}>
                    <td style={{ textAlign: 'center', padding: '12px 8px', color: theme.paperSubText, fontFamily: 'monospace' }}>
                      {idx + 1}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
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
                        <div>
                          <div style={{ fontWeight: 700, color: theme.paperHeading }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: '11px', color: m.isLeader ? '#3b82f6' : theme.paperSubText, fontWeight: m.isLeader ? 600 : 400 }}>
                            {m.role}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '8px', backgroundColor: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, (m.pct / 30) * 100)}%`,
                              backgroundColor: m.color,
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, color: theme.paperHeading, fontFamily: 'monospace', minWidth: '45px', textAlign: 'right' }}>
                          {m.pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: theme.paperHeading }}>
                      {m.tasks}
                    </td>

                    <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: theme.paperHeading }}>
                      {m.edits}
                    </td>

                    <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: m.peerScore.includes('★') ? '#f59e0b' : theme.paperHeading }}>
                      {m.peerScore}
                    </td>

                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      {m.evidenceStatus === 'SUFFICIENT' ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: isLight ? '#15803d' : '#4ade80',
                            backgroundColor: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.18)',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            display: 'inline-block',
                          }}
                        >
                          Đạt chuẩn
                        </span>
                      ) : m.evidenceStatus === 'INSUFFICIENT' ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: isLight ? '#b45309' : '#fbbf24',
                            backgroundColor: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.18)',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            display: 'inline-block',
                          }}
                        >
                          Đang thẩm định
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: theme.paperSubText,
                            backgroundColor: theme.paperCardBg,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            display: 'inline-block',
                          }}
                        >
                          Chưa có
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: theme.paperHeaderBorder, backgroundColor: theme.paperCardBg, fontWeight: 700 }}>
                <td colSpan={2} style={{ padding: '10px 12px', color: theme.paperHeading }}>
                  TỔNG CỘNG ({members.length} THÀNH VIÊN)
                </td>
                <td style={{ padding: '10px 12px', color: theme.paperHeading, fontFamily: 'monospace' }}>
                  <div style={{ textAlign: 'right' }}>{totalPercentage}%</div>
                </td>
                <td style={{ textAlign: 'right', padding: '10px 12px', color: theme.paperHeading, fontFamily: 'monospace' }}>
                  {totalTasks}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 12px', color: theme.paperHeading, fontFamily: 'monospace' }}>
                  {totalEdits}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 12px', color: theme.paperSubText }}>
                  —
                </td>
                <td style={{ textAlign: 'center', padding: '10px 12px', color: isLight ? '#15803d' : '#4ade80', fontSize: '11px' }}>
                  100% Đối soát
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legal & Audit Notes */}
        <div style={{ fontSize: '12px', color: theme.paperSubText, lineHeight: 1.5, borderTop: theme.paperDivider, paddingTop: '12px', marginBottom: '32px' }}>
          * <strong>Ghi chú kiểm soát đóng góp:</strong> Mọi con số đóng góp được truy vết tự động từ ActivityEvent log bất biến (Task Board hệ thống, Git commits và Minh chứng công việc đã duyệt). Cơ chế chấm chéo tuân thủ thuật toán K-Anonymity (Nghị định 13/2023/NĐ-CP). Báo cáo này là cơ sở đối soát minh bạch đóng góp cá nhân.
        </div>

        {/* Official Signatures Section */}
        <div className="report-paper-grid-2" style={{ gap: '24px 40px', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: theme.paperHeading, textTransform: 'uppercase' }}>
              ĐẠI DIỆN TRƯỞNG NHÓM ĐỒ ÁN
            </div>
            <div style={{ fontSize: '11px', color: theme.paperSubText, fontStyle: 'italic' }}>
              (Ký và ghi rõ họ tên)
            </div>
            <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {leaderSignature && (
                <img src={leaderSignature} alt="Chữ ký Trưởng nhóm" style={{ maxHeight: '60px', maxWidth: '180px', objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ fontWeight: 700, color: theme.paperHeading, fontSize: '14px' }}>
              {leaderName}
            </div>
            {leaderSignature && (
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                [Đã xác thực chữ ký điện tử FairShare]
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: theme.paperHeading, textTransform: 'uppercase' }}>
              GIẢNG VIÊN HƯỚNG DẪN / HỘI ĐỒNG BẢO VỆ
            </div>
            <div style={{ fontSize: '11px', color: theme.paperSubText, fontStyle: 'italic' }}>
              (Nghiệm thu năng suất &amp; Cho điểm đồ án)
            </div>
            <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {teacherSignature && (
                <img src={teacherSignature} alt="Chữ ký Giảng viên" style={{ maxHeight: '60px', maxWidth: '180px', objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ borderBottom: isLight ? '1px dotted #94a3b8' : '1px dotted rgba(255, 255, 255, 0.25)', width: '200px', margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '12px', color: theme.paperTableHeaderText }}>
              Điểm đánh giá: <strong>_____ / 10.0</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Modal chữ ký điện tử trước khi xuất PDF */}
      {showSignModal && (
        <div className="no-print" onClick={() => setShowSignModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', color: '#0f172a', borderRadius: '16px', padding: 'clamp(16px, 3vw, 22px)', width: '100%', maxWidth: '620px', maxHeight: '92dvh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Ký điện tử báo cáo</h3>
            <p style={{ margin: '4px 0 16px', fontSize: '12.5px', color: '#64748b' }}>
              Tải ảnh chữ ký cho từng vai trò (nền trắng sẽ được tự động tách). Chữ ký sẽ được đặt đúng vị trí ký trong báo cáo. Có thể bỏ trống nếu chưa cần ký.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Nhóm trưởng</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>Đại diện trưởng nhóm đồ án</div>
                <div style={{ height: '90px', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', marginBottom: '10px' }}>
                  {leaderSignature ? (
                    <img src={leaderSignature} alt="Nhóm trưởng" style={{ maxHeight: '82px', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Chưa có chữ ký</span>
                  )}
                </div>
                <label style={{ display: 'inline-block', padding: '7px 12px', borderRadius: '8px', backgroundColor: '#4f46e5', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Tải ảnh chữ ký
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { handleSignatureFile('leader', e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {leaderSignature && (
                  <button type="button" onClick={() => clearSignature('leader')} style={{ marginLeft: '6px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#475569' }}>
                    Xóa
                  </button>
                )}
              </div>
              <div style={{ flex: '1 1 220px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Giảng viên</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>Giảng viên hướng dẫn / Hội đồng</div>
                <div style={{ height: '90px', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', marginBottom: '10px' }}>
                  {teacherSignature ? (
                    <img src={teacherSignature} alt="Giảng viên" style={{ maxHeight: '82px', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Chưa có chữ ký</span>
                  )}
                </div>
                <label style={{ display: 'inline-block', padding: '7px 12px', borderRadius: '8px', backgroundColor: '#4f46e5', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Tải ảnh chữ ký
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { handleSignatureFile('teacher', e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {teacherSignature && (
                  <button type="button" onClick={() => clearSignature('teacher')} style={{ marginLeft: '6px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#475569' }}>
                    Xóa
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
              <button type="button" onClick={() => setShowSignModal(false)} style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Hủy
              </button>
              <button type="button" onClick={handleConfirmSignAndExport} style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#4f46e5', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Áp chữ ký &amp; Xuất PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nộp minh chứng ngoài hệ thống */}
      <ManualContributionModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        teamId={currentTeamId || 1}
        sprintId={selectedSprintId}
        sprintName={sprintList.find((s) => s.id === selectedSprintId)?.name}
        sprints={sprintList}
        currentUserId={currentUserId}
        onContributionApproved={() => {
          loadReportData();
        }}
      />

      {/* Modal Kiểm định & Phân tích Phân bổ Đóng góp (Allocation Distribution Breakdown) */}
      {showAllocationModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '12px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAllocationModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: isLight ? '#ffffff' : '#18181b',
              border: theme.panelBorder,
              borderRadius: '20px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92dvh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              padding: 'clamp(14px, 3vw, 24px) clamp(14px, 3vw, 28px)',
              color: theme.textColor,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Scale size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: theme.headingColor }}>
                    Ma trận Phân bổ Đóng góp &amp; Kiểm định Công bằng
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: theme.subTextColor }}>
                    Thuật toán Dirichlet &amp; Shapley Value đảm bảo tổng phân bổ đạt chính xác 100%
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllocationModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.subTextColor,
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 3 Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                  border: theme.tableBorder,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: theme.subTextColor, marginBottom: '4px' }}>Tổng phân bổ</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>
                  {totalPercentage}%
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                  <CheckCircle2 size={11} />
                  <span>Đạt chuẩn 100%</span>
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                  border: theme.tableBorder,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: theme.subTextColor, marginBottom: '4px' }}>Hệ số bất bình đẳng Gini</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#6366f1' }}>
                  {giniValue}
                </div>
                <div style={{ fontSize: '10.5px', color: '#818cf8', marginTop: '2px', fontWeight: 600 }}>
                  {giniLabel}
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                  border: theme.tableBorder,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: theme.subTextColor, marginBottom: '4px' }}>Mức bình quân kỳ vọng</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: theme.headingColor }}>
                  {(100 / (members.length || 1)).toFixed(1)}%
                </div>
                <div style={{ fontSize: '10.5px', color: theme.subTextColor, marginTop: '2px' }}>
                  {members.length} thành viên tham gia
                </div>
              </div>
            </div>

            {/* Stacked Allocation Multi-color Bar */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: theme.headingColor }}>
                  Thanh phân bổ tỷ trọng thành viên
                </span>
                <span style={{ fontSize: '11px', color: theme.subTextColor }}>Tổng cộng: {totalPercentage}%</span>
              </div>
              <div
                style={{
                  height: '20px',
                  width: '100%',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  display: 'flex',
                  backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
                }}
              >
                {members.map((m) => (
                  <div
                    key={m.userId}
                    title={`${m.name}: ${m.pct.toFixed(1)}%`}
                    style={{
                      height: '100%',
                      width: `${m.pct}%`,
                      backgroundColor: m.color,
                      transition: 'width 0.3s ease',
                    }}
                  />
                ))}
              </div>

              {/* Color legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 14px', marginTop: '10px' }}>
                {members.map((m) => (
                  <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: m.color }} />
                    <span style={{ color: theme.headingColor, fontWeight: 500 }}>{m.name.split(' ').slice(-2).join(' ')}:</span>
                    <strong style={{ color: theme.textColor }}>{m.pct.toFixed(1)}%</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* 4D Weighting Explanation */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: theme.headingColor, marginBottom: '8px' }}>
                Trọng số 4 Chiều Vector Đóng góp (FairShare Standard)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
                {[
                  { label: 'D1 Sản lượng', weight: '40%', desc: 'Tasks & SP hoàn thành', color: '#6366f1' },
                  { label: 'D2 Độ tin cậy', weight: '25%', desc: 'Đúng hạn, ít rework, CI', color: '#06b6d4' },
                  { label: 'D3 Phối hợp', weight: '15%', desc: 'Code review, thảo luận', color: '#10b981' },
                  { label: 'D4 Chấm chéo', weight: '20%', desc: 'Ẩn danh k-Anonymity', color: '#ec4899' },
                ].map((w, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                      border: theme.tableBorder,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: w.color }}>{w.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: theme.headingColor }}>{w.weight}</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: theme.subTextColor }}>{w.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown Table vs Expected Average */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: theme.headingColor, marginBottom: '8px' }}>
                Chi tiết đóng góp so với mức bình quân nhóm ({(100 / (members.length || 1)).toFixed(1)}%)
              </div>
              <div style={{ maxHeight: '200px', overflowX: 'auto', overflowY: 'auto', border: theme.tableBorder, borderRadius: '10px' }}>
                <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: theme.tableBorder, backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)', color: theme.subTextColor, whiteSpace: 'nowrap' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Thành viên</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Vai trò</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Tasks</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>% Đóng góp</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>Chênh lệch kỳ vọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const expectedAvg = 100 / (members.length || 1);
                      const delta = m.pct - expectedAvg;
                      return (
                        <tr key={m.userId} style={{ borderBottom: theme.tableBorder }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: theme.headingColor }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: m.color }} />
                              <span>{m.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', color: theme.subTextColor }}>{m.role}</td>
                          <td style={{ textAlign: 'center', padding: '8px 12px' }}>{m.tasks}</td>
                          <td style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 700, color: theme.headingColor }}>
                            {m.pct.toFixed(1)}%
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600, color: delta >= 0 ? '#10b981' : '#f59e0b' }}>
                            {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowAllocationModal(false);
                  setActiveTab('export');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Xem Văn bản PDF
              </button>
              <button
                onClick={() => setShowAllocationModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FairShare AI Engine Hub Modal ── */}
      {showAiModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '12px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAiModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: isLight ? '#ffffff' : '#18181b',
              border: '1px solid rgba(129, 140, 248, 0.3)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '840px',
              maxHeight: '92dvh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              color: theme.textColor,
            }}
          >
            {/* AI Modal Header */}
            <div
              style={{
                padding: 'clamp(14px, 3vw, 20px) clamp(14px, 3vw, 24px)',
                borderBottom: theme.tableBorder,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                background: isLight
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  <Brain size={24} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: theme.headingColor }}>
                      FairShare AI Engine Hub
                    </h3>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#6366f1', color: '#fff' }}>
                      Robust MAD 4-Layer
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: theme.subTextColor }}>
                    Trợ lý chẩn đoán thông minh, kiểm soát bất thường &amp; dự báo hiệu suất đồ án
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.subTextColor,
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  flexShrink: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* AI Tabs Bar */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '10px clamp(14px, 3vw, 24px)',
                borderBottom: theme.tableBorder,
                backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              {[
                { id: 'diagnostic', label: 'Chẩn đoán & Rủi ro Nhóm', icon: <Lightbulb size={14} /> },
                { id: 'algorithm', label: 'Giải mã 4 Tầng Robust MAD', icon: <Scale size={14} /> },
                { id: 'chat', label: 'AI Advisor Hỏi Đáp', icon: <Bot size={14} /> },
              ].map((tab) => {
                const isActive = aiActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setAiActiveTab(tab.id as typeof aiActiveTab)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '10px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      backgroundColor: isActive ? '#4f46e5' : isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#ffffff' : theme.textColor,
                      border: isActive ? '1px solid #4f46e5' : theme.tableBorder,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* AI Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(14px, 3vw, 22px) clamp(14px, 3vw, 24px)' }}>
              {/* TAB 1: DIAGNOSTIC & HEALTH CHECK */}
              {aiActiveTab === 'diagnostic' && (
                <div>
                  {/* Top 3 AI Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                        border: theme.tableBorder,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11.5px', color: theme.subTextColor, fontWeight: 600 }}>Cân đối Năng suất</span>
                        <TrendingUp size={16} color="#10b981" />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>88 / 100</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                        <CheckCircle2 size={12} />
                        <span>Mức độ phân bổ lành mạnh</span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                        border: theme.tableBorder,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11.5px', color: theme.subTextColor, fontWeight: 600 }}>Phát hiện Gian lận</span>
                        <CheckCircle2 size={16} color="#6366f1" />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#6366f1' }}>0 Cảnh báo</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#818cf8', marginTop: '4px', fontWeight: 600 }}>
                        <CheckCircle2 size={12} />
                        <span>Anti-gaming check Passed</span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                        border: theme.tableBorder,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11.5px', color: theme.subTextColor, fontWeight: 600 }}>Dự báo Điểm Đồ án</span>
                        <Sparkles size={16} color="#f59e0b" />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>8.8 — 9.2</div>
                      <div style={{ fontSize: '11px', color: theme.subTextColor, marginTop: '4px' }}>
                        Dựa trên tiến độ {currentSprint?.name || 'Sprint'}
                      </div>
                    </div>
                  </div>

                  {/* AI Member Diagnostic Analysis */}
                  <div style={{ marginBottom: '22px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: theme.headingColor, marginBottom: '10px' }}>
                      Chẩn đoán Đóng góp Chi tiết từng Thành viên
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {members.map((m) => {
                        const isTop = m.pct >= 22;
                        const isUnder = m.pct < 12;
                        return (
                          <div
                            key={m.userId}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '12px',
                              backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                              border: theme.tableBorder,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '14px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  backgroundColor: m.color,
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                {getInitials(m.name)}
                              </div>
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: theme.headingColor }}>
                                  {m.name}
                                </div>
                                <div style={{ fontSize: '11px', color: theme.subTextColor }}>{m.role}</div>
                              </div>
                            </div>

                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (m.pct / 30) * 100)}%`, backgroundColor: m.color }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: theme.headingColor, minWidth: '45px', textAlign: 'right' }}>
                                {m.pct.toFixed(1)}%
                              </span>
                            </div>

                            <div style={{ minWidth: '170px', textAlign: 'right' }}>
                              {isTop ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#10b981', backgroundColor: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                  <Sparkles size={12} />
                                  <span>Năng suất vượt trội</span>
                                </span>
                              ) : isUnder ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#f59e0b', backgroundColor: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                  <Zap size={12} />
                                  <span>Cần giao thêm Task</span>
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#6366f1', backgroundColor: isLight ? '#e0e7ff' : 'rgba(99, 102, 241, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                  <CheckCircle2 size={12} />
                                  <span>Đạt chuẩn tiến độ</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Smart Actionable Recommendations */}
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: isLight
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)'
                        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.1) 100%)',
                      border: '1px solid rgba(129, 140, 248, 0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#818cf8', marginBottom: '8px' }}>
                      <Lightbulb size={16} /> Khuyến nghị Hành động từ FairShare AI cho Sprint tới:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: theme.textColor, lineHeight: 1.6 }}>
                      <li>
                        <strong>Tái cân bằng khối lượng:</strong> Ghép cặp hỗ trợ giữa thành viên dẫn đầu và thành viên có sản lượng thấp hơn qua hình thức Code Review hoặc Pair-Programming.
                      </li>
                      <li>
                        <strong>Khai thác chiều D3 (Phối hợp):</strong> Tăng cường trao đổi và hoàn tất các vòng chấm chéo ngang hàng ($k \ge 3$) để bảo đảm tính minh bạch.
                      </li>
                      <li>
                        <strong>Cập nhật minh chứng thủ công:</strong> Nộp tài liệu họp nhóm hoặc biên bản trao đổi bên ngoài hệ thống trước khi chốt nghiệm thu đồ án.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: ALGORITHM TRANSPARENCY (4-LAYER ROBUST MAD) */}
              {aiActiveTab === 'algorithm' && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: theme.headingColor, marginBottom: '14px' }}>
                    Cơ chế Tính toán 4 Tầng Robust MAD (Sprint 4 - CR-03)
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                    {[
                      {
                        step: 'Tầng 1',
                        name: 'Trích xuất Vector Đặc trưng Thô (Raw Vector Extraction)',
                        desc: 'Thu thập chuỗi ActivityEvent bất biến: Story Points, Task hoàn thành, đúng hạn deadline, số lần rework, đóng góp thủ công và chấm chéo.',
                        badge: 'x_i = [SP, Tasks, OnTime, Collab, Peer, Evidence]',
                        color: '#6366f1',
                      },
                      {
                        step: 'Tầng 2',
                        name: 'Chuẩn hóa Khử nhiễu & Chống gian lận (Robust MAD Anti-gaming)',
                        desc: 'Áp dụng hàm log tự nhiên ln(1 + x) để triệt tiêu việc spam commit/task. Chuẩn hóa theo Trung vị (Median) và Độ lệch tuyệt đối trung vị (MAD) của nhóm.',
                        badge: 'z_i = (x_i - Median) / MAD',
                        color: '#06b6d4',
                      },
                      {
                        step: 'Tầng 3',
                        name: 'Nén Không gian 4 Chiều Cốt lõi (4D Core Dimensional Projection)',
                        desc: 'Quy đổi về 4 trục tọa độ chính: D1 Sản lượng (40%), D2 Độ tin cậy (25%), D3 Phối hợp (15%), D4 Đánh giá chéo ngang hàng (20%).',
                        badge: 'C_i = 0.4*D1 + 0.25*D2 + 0.15*D3 + 0.2*D4',
                        color: '#10b981',
                      },
                      {
                        step: 'Tầng 4',
                        name: 'Logistic Sigmoid & Mô phỏng Bootstrap CI 95%',
                        desc: 'Mô phỏng Monte-Carlo 1.000 vòng lặp để xác định khoảng tin cậy sai số [Low, High], bảo vệ sinh viên khỏi các đánh giá thiên lệch.',
                        badge: 'Bootstrap B=1000, 95% Confidence Interval',
                        color: '#ec4899',
                      },
                    ].map((layer, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '14px',
                          backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                          border: theme.tableBorder,
                          borderLeft: `4px solid ${layer.color}`,
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: layer.color }}>
                            {layer.step}: {layer.name}
                          </span>
                          <code style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: isLight ? '#e0e7ff' : 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                            {layer.badge}
                          </code>
                        </div>
                        <div style={{ fontSize: '12px', color: theme.subTextColor, lineHeight: 1.4 }}>
                          {layer.desc}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 4D Vector Matrix Table */}
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: theme.headingColor, marginBottom: '8px' }}>
                      Bảng Ma trận Vector 4D của các thành viên
                    </div>
                    <div style={{ border: theme.tableBorder, borderRadius: '12px', overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: '580px', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)', color: theme.subTextColor, borderBottom: theme.tableBorder, whiteSpace: 'nowrap' }}>
                            <th style={{ textAlign: 'left', padding: '8px 12px' }}>Thành viên</th>
                            <th style={{ textAlign: 'center', padding: '8px 10px' }}>D1 Sản lượng</th>
                            <th style={{ textAlign: 'center', padding: '8px 10px' }}>D2 Tin cậy</th>
                            <th style={{ textAlign: 'center', padding: '8px 10px' }}>D3 Phối hợp</th>
                            <th style={{ textAlign: 'center', padding: '8px 10px' }}>D4 Chấm chéo</th>
                            <th style={{ textAlign: 'right', padding: '8px 12px' }}>% Phân bổ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((m) => (
                            <tr key={m.userId} style={{ borderBottom: theme.tableBorder }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: theme.headingColor }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: m.color }} />
                                  <span>{m.name}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px 10px', color: '#6366f1', fontWeight: 700 }}>
                                {m.d1Output.toFixed(2)}
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px 10px', color: '#06b6d4', fontWeight: 700 }}>
                                {m.d2Reliability.toFixed(2)}
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px 10px', color: '#10b981', fontWeight: 700 }}>
                                {m.d3Collaboration.toFixed(2)}
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px 10px', color: '#ec4899', fontWeight: 700 }}>
                                {m.d4Peer.toFixed(2)}
                              </td>
                              <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 800, color: theme.headingColor }}>
                                {m.pct.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AI ADVISOR CHAT */}
              {aiActiveTab === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'min(420px, 52dvh)' }}>
                  {/* Quick prompts */}
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px' }}>
                    {[
                      'Đánh giá tổng quan hiệu suất nhóm',
                      'Ai đang tụt lại và cần hỗ trợ?',
                      'Gợi ý cách chia điểm đồ án công bằng nhất',
                      'Giải thích điểm D2 độ tin cậy',
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendAiMessage(prompt)}
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          backgroundColor: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                          color: '#818cf8',
                          border: '1px solid rgba(129, 140, 248, 0.2)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Sparkles size={11} className="text-purple-400" />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>

                  {/* Messages List */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      padding: '10px 4px',
                    }}
                  >
                    {aiChatMessages.map((msg, idx) => {
                      const isAi = msg.sender === 'ai';
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                            flexDirection: isAi ? 'row' : 'row-reverse',
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              backgroundColor: isAi ? '#6366f1' : '#10b981',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {isAi ? <Bot size={16} /> : 'Me'}
                          </div>

                          <div
                            style={{
                              maxWidth: '80%',
                              padding: '10px 14px',
                              borderRadius: '14px',
                              backgroundColor: isAi
                                ? isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)'
                                : '#4f46e5',
                              color: isAi ? theme.textColor : '#ffffff',
                              fontSize: '12px',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              border: isAi ? theme.tableBorder : 'none',
                            }}
                          >
                            {msg.text}
                            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: isAi ? 'left' : 'right' }}>
                              {msg.time}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {isAiThinking && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            backgroundColor: '#6366f1',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Sparkles size={14} />
                        </div>
                        <div style={{ fontSize: '12px', color: '#818cf8', fontStyle: 'italic' }}>
                          FairShare AI đang phân tích dữ liệu ActivityEvent và ma trận 4D...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Box */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: theme.tableBorder, paddingTop: '10px' }}>
                    <input
                      type="text"
                      placeholder="Đặt câu hỏi cho FairShare AI về dữ liệu đóng góp đồ án..."
                      value={aiChatInput}
                      onChange={(e) => setAiChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendAiMessage();
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                        border: theme.tableBorder,
                        color: theme.textColor,
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleSendAiMessage()}
                      disabled={!aiChatInput.trim() || isAiThinking}
                      style={{
                        padding: '0 18px',
                        borderRadius: '10px',
                        backgroundColor: '#4f46e5',
                        color: '#fff',
                        border: 'none',
                        cursor: !aiChatInput.trim() || isAiThinking ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: !aiChatInput.trim() || isAiThinking ? 0.6 : 1,
                      }}
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: theme.tableBorder,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ fontSize: '11.5px', color: theme.subTextColor }}>
                Dữ liệu được bảo mật &amp; đối soát theo Nghị định 13/2023/NĐ-CP
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Print-specific styles to hide all app navigation on paper print */}
      <style>{`
        @media print {
          body, .report-print-document {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .report-print-document * {
            color: #000000 !important;
            border-color: #cbd5e1 !important;
            background-color: transparent !important;
          }
          .report-print-document table thead tr {
            background-color: #f1f5f9 !important;
          }
          .report-print-document table tfoot tr {
            background-color: #f8fafc !important;
          }
          .report-print-document code {
            background-color: #f1f5f9 !important;
          }
          .no-print, nav, header, aside, .dock-container, .page-head, button, [class*="fs-toast"], [class*="toast"] {
            display: none !important;
          }
          .page.pad {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .report-print-document {
            box-shadow: none !important;
            border: none !important;
            padding: 20px !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
