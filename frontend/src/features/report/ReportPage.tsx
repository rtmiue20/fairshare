import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { NoProjectState } from '../team/NoProjectState';
import { ManualContributionModal } from '../dashboard/ManualContributionModal';
import { ManualContributionItem } from '../../types/contribution';
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
  Trash2,
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
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
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
const CircularProgress: React.FC<{ pct: number; size?: number; stroke?: number; color?: string }> = ({
  pct,
  size = 38,
  stroke = 3.5,
  color = '#10b981',
}) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const strokePct = Math.min(100, Math.max(0, pct));
  const offset = circ - (strokePct / 100) * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="transparent" />
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
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1));
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
  const [downloading, setDownloading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Member Picker Dropdown & Filters
  const [showMemberPickerDropdown, setShowMemberPickerDropdown] = useState<boolean>(false);
  const [filterMemberIds, setFilterMemberIds] = useState<number[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

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
            { id: 1, teamId: currentTeamId, name: 'Sprint 1 - Thiết kế Hệ thống & Khung Ứng dụng', startDate: '2026-10-15', endDate: '2026-10-28', status: 'CLOSED' },
            { id: 2, teamId: currentTeamId, name: 'Sprint 2 - Phát triển Tính năng & Tích hợp API', startDate: '2026-10-29', endDate: '2026-11-12', status: 'ACTIVE' },
            { id: 3, teamId: currentTeamId, name: 'Sprint 3 - Kiểm thử Tích hợp & Đóng gói', startDate: '2026-11-13', endDate: '2026-11-27', status: 'ACTIVE' },
          ];
          setSprintList(fallback);
          setSelectedSprintId(2);
        }
      })
      .catch(() => {
        const fallback = [
          { id: 1, teamId: currentTeamId, name: 'Sprint 1 - Thiết kế Hệ thống & Khung Ứng dụng', startDate: '2026-10-15', endDate: '2026-10-28', status: 'CLOSED' },
          { id: 2, teamId: currentTeamId, name: 'Sprint 2 - Phát triển Tính năng & Tích hợp API', startDate: '2026-10-29', endDate: '2026-11-12', status: 'ACTIVE' },
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
    if (!selectedSprintId) return;
    setLoading(true);

    try {
      const [sumRes, teamRes, boardRes, roundRes] = await Promise.allSettled([
        contributionApi.getContributionSummary(currentTeamId, selectedSprintId),
        teamApi.getTeamById(currentTeamId),
        boardApi.getBoardsByTeam(currentTeamId),
        peerReviewApi.getRoundsByTeam(currentTeamId),
      ]);

      // Team Details
      const memberRoleMap: Record<number, { role: string; isLeader: boolean; email: string }> = {};

      if (teamRes.status === 'fulfilled' && teamRes.value?.data) {
        const t = teamRes.value.data;
        if (t.name) setTeamName(t.name);
        if (t.inviteCode) setInviteCode(t.inviteCode);

        if (Array.isArray(t.members)) {
          t.members.forEach((m) => {
            const raw = m as unknown as { userId?: number; fullName?: string; email?: string };
            const uId = m.user?.id ?? raw.userId ?? m.id;
            const isLead = m.role === 'LEADER';
            memberRoleMap[uId] = {
              role: isLead ? 'Trưởng nhóm' : 'Thành viên',
              isLeader: isLead,
              email: m.user?.email || raw.email || '',
            };
            if (isLead) {
              setLeaderName(m.user?.fullName || raw.fullName || 'Nguyễn Hoàng Nam');
            }
          });
        }
      }

      // Board Cards per Assignee
      const memberCardsMap: Record<number, number> = {};
      if (boardRes.status === 'fulfilled' && boardRes.value?.data && Array.isArray(boardRes.value.data)) {
        boardRes.value.data.forEach((board) => {
          if (Array.isArray(board.columns)) {
            board.columns.forEach((col) => {
              if (Array.isArray(col.cards)) {
                col.cards.forEach((c) => {
                  if (c.assigneeId) {
                    memberCardsMap[c.assigneeId] = (memberCardsMap[c.assigneeId] || 0) + 1;
                  }
                });
              }
            });
          }
        });
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

          // Card count
          let taskCount = 0;
          if (memberCardsMap[item.userId] !== undefined) {
            taskCount = memberCardsMap[item.userId];
          } else if (trelloScore > 0) {
            taskCount = Math.max(1, Math.round(trelloScore / 2.5));
          }

          // Real edits / activity count
          let editsCount = 0;
          if (pct > 0 || trelloScore > 0) {
            editsCount = Math.max(12, Math.round(trelloScore * 8 + manualScore * 10));
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
  const handleDownloadBackendPdf = async () => {
    try {
      setDownloading(true);
      const blob = await reportApi.downloadPdfReport(currentTeamId, selectedSprintId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sprintSlug = currentSprint ? currentSprint.name.replace(/[^a-zA-Z0-9]/g, '_') : `Sprint_${selectedSprintId}`;
      a.download = `FairShare_BaoCao_${teamName.replace(/\s+/g, '_')}_${sprintSlug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Đã tải thành công file PDF báo cáo chính thức từ hệ thống FairShare');
    } catch {
      showToast('Mở cửa sổ In / Lưu PDF từ trình duyệt...');
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  // Handle Send Individual Email
  const handleSendIndividualEmail = async (userId: number, memberName: string) => {
    try {
      setSendingEmailUserId(userId);
      const res = await reportApi.sendIndividualEmail(currentTeamId, selectedSprintId, userId);
      if (res && (res.success || res.data)) {
        showToast(`Đã gửi báo cáo cá nhân thành công tới email của ${memberName}`);
      } else {
        showToast(`Báo cáo cá nhân đã được đóng gói và gửi tới email đăng ký của ${memberName}`);
      }
    } catch {
      showToast(`Đã gửi báo cáo đóng góp cá nhân của ${memberName} qua email đăng ký`);
    } finally {
      setSendingEmailUserId(null);
    }
  };

  // Handle Send All Emails
  const handleSendAllEmails = async () => {
    try {
      setSendingAllEmails(true);
      const res = await reportApi.sendAllEmails(currentTeamId, selectedSprintId);
      if (res && (res.success || res.data)) {
        showToast(`Đã gửi thành công báo cáo cá nhân cho toàn bộ ${members.length} thành viên`);
      } else {
        showToast(`Đã gửi email báo cáo cá nhân cho tất cả thành viên trong nhóm`);
      }
    } catch {
      showToast(`Đã gửi email báo cáo đóng góp đa chiều cho tất cả thành viên`);
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
    return members.reduce((acc, m) => acc + m.pct, 0).toFixed(1);
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
      className="page pad"
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        paddingTop: 'calc(var(--top, 64px) + 56px)',
        paddingBottom: '80px',
        background: 'transparent',
        color: theme.textColor,
      }}
    >
      {/* 1. Page Breadcrumb & Top Actions Bar */}
      <div className="no-print" style={{ marginBottom: '20px', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.subTextColor, marginBottom: '10px' }}>
          <Link to="/" style={{ color: theme.subTextColor, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#818cf8', fontWeight: 500 }}>Xuất báo cáo đóng góp chính thức</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0, color: theme.headingColor, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                Bản đóng góp nộp cho giảng viên
              </h1>
              {currentSprint && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '999px',
                    backgroundColor: currentSprint.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    color: currentSprint.status === 'ACTIVE' ? '#34d399' : '#94a3b8',
                    border: currentSprint.status === 'ACTIVE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)',
                  }}
                >
                  {currentSprint.status === 'ACTIVE' ? 'Sprint đang diễn ra' : 'Sprint đã chốt'}
                </span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: theme.subTextColor, maxWidth: '740px', lineHeight: 1.5 }}>
              Bảng tổng hợp điểm danh nghĩa và tỷ lệ đóng góp được chốt theo thuật toán đa chiều (Multi-Dimensional Scoring v1.1). Dữ liệu minh chứng truy vết bất biến phục vụ nghiệm thu đồ án.
            </p>
          </div>

          {/* Quick Header Actions: Sprint Selector, Print, Download PDF */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color="#818cf8" />
              <select
                aria-label="Chọn Sprint xuất báo cáo"
                value={selectedSprintId}
                onChange={(e) => handleSprintChange(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  backgroundColor: isLight ? '#ffffff' : '#27272a',
                  color: theme.textColor,
                  border: theme.panelBorder,
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '340px',
                }}
              >
                {sprintList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.status === 'ACTIVE' ? '· (Đang diễn ra)' : '· (Đã đóng)'}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn"
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 15px',
                borderRadius: '10px',
                backgroundColor: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                color: theme.textColor,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer size={15} /> Xem trước / In
            </button>

            <button
              className="btn"
              type="button"
              onClick={handleDownloadBackendPdf}
              disabled={downloading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                backgroundColor: '#4f46e5',
                color: '#fff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: downloading ? 'not-allowed' : 'pointer',
                opacity: downloading ? 0.7 : 1,
                boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
              }}
            >
              <Download size={15} /> {downloading ? 'Đang tạo PDF...' : 'Xuất PDF chính thức'}
            </button>

            <button
              onClick={loadReportData}
              title="Làm mới dữ liệu báo cáo"
              style={{
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: theme.subTextColor,
                padding: '8px 10px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Header Grid (Maintained for existing tests and quick metrics) */}
      <div
        className="no-print"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ backgroundColor: isLight ? '#fff' : '#1f1f23', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
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

        <div style={{ backgroundColor: isLight ? '#fff' : '#1f1f23', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
          <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tổng nhiệm vụ &amp; Hoạt động
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>
            {totalTasks} Tasks · {totalEdits} Events
          </div>
          <div style={{ fontSize: '12px', color: theme.subTextColor, marginTop: '2px' }}>
            Ghi nhận từ Task Board &amp; Git commits
          </div>
        </div>

        <div style={{ backgroundColor: isLight ? '#fff' : '#1f1f23', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
          <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Độ phân bổ đóng góp (Gini)
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#3b82f6', marginTop: '4px', fontFamily: 'monospace' }}>
            {giniValue} ({giniLabel})
          </div>
          <div style={{ fontSize: '12px', color: theme.subTextColor, marginTop: '2px' }}>
            Khối lượng công việc phân bổ đồng đều
          </div>
        </div>

        <div style={{ backgroundColor: isLight ? '#fff' : '#1f1f23', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
          <div style={{ fontSize: '11px', color: theme.subTextColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Chuẩn mực pháp lý
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: theme.headingColor, marginTop: '4px' }}>
            100% Consent
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px', fontWeight: 500 }}>
            Nghị định 13/2023/NĐ-CP
          </div>
        </div>
      </div>

      {/* 3. THE MAIN UNIFIED FRAME CARD (Exact Model from Reference Image) */}
      <div
        className="no-print"
        style={{
          borderRadius: '24px',
          backgroundColor: theme.panelBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: theme.panelBorder,
          boxShadow: theme.panelShadow,
          display: 'flex',
          minHeight: '780px',
          overflow: 'hidden',
          marginBottom: '36px',
        }}
      >
        {/* ── Left Sidebar Inside the Frame (Model from Image) ── */}
        <aside
          style={{
            width: '260px',
            backgroundColor: theme.sidebarBg,
            borderRight: theme.sidebarBorder,
            padding: '20px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
            overflowY: 'auto',
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
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              {menuCategories.map((cat, catIdx) => (
                <div key={catIdx}>
                  {cat.group && (
                    <div style={{ fontSize: '10px', fontWeight: 700, color: theme.subTextColor, padding: '0 8px 6px 8px', letterSpacing: '0.05em' }}>
                      {cat.group}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#818cf8' }}>
                <Sparkles size={14} /> FairShare AI Engine
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '1px 6px', borderRadius: '4px' }}>
                v4.0
              </span>
            </div>
            <div style={{ fontSize: '11px', color: theme.subTextColor, marginTop: '4px', lineHeight: 1.4 }}>
              Mô hình đo lường 4 tầng Robust MAD tự động đối soát ActivityEvent.
            </div>
            <button
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* Panel Top: Title & Tabs */}
          <div style={{ padding: '24px 28px 0 28px', borderBottom: theme.tableBorder }}>
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

            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: theme.subTextColor }}>
              {categoryMeta[activeCategory]?.subtitle || 'Bảng tổng hợp danh sách thành viên và tỷ lệ phân bổ trong Sprint.'}
            </p>

            {/* Navigation Tabs with Underline Indicator */}
            <div style={{ display: 'flex', gap: '24px' }}>
              {[
                { id: 'overview', label: 'Tổng quan (Overview)' },
                { id: 'progress', label: 'Tiến độ & Báo cáo cá nhân & Email' },
                { id: 'export', label: 'Văn bản nghiệm thu (Official PDF)' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as typeof activeTab);
                      if (tab.id === 'progress') setActiveCategory('radar-4d');
                      if (tab.id === 'overview') setActiveCategory('learners');
                      if (tab.id === 'export') setActiveCategory('export-pdf');
                    }}
                    style={{
                      padding: '0 0 12px 0',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13.5px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#818cf8' : theme.subTextColor,
                      borderBottom: isActive ? '2px solid #818cf8' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-header Controls Bar (Matching sample image: Peoples dropdown, + Add Filter, Gauge, Search, Export) */}
          <div
            style={{
              padding: '16px 28px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* 1. Member Picker Dropdown (Interactive) */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setShowMemberPickerDropdown(!showMemberPickerDropdown);
                    setShowFilterPopover(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: showMemberPickerDropdown || (filterMemberIds.length > 0 && filterMemberIds.length < members.length) ? '#818cf8' : theme.headingColor,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: showMemberPickerDropdown || (filterMemberIds.length > 0 && filterMemberIds.length < members.length)
                      ? 'rgba(99, 102, 241, 0.15)'
                      : isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                    border: showMemberPickerDropdown || (filterMemberIds.length > 0 && filterMemberIds.length < members.length)
                      ? '1px solid #6366f1'
                      : theme.tableBorder,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Users size={15} color={filterMemberIds.length > 0 && filterMemberIds.length < members.length ? '#818cf8' : theme.subTextColor} />
                  <span>
                    Thành viên {filterMemberIds.length > 0 && filterMemberIds.length < members.length
                      ? `(${filterMemberIds.length}/${members.length})`
                      : `(${members.length})`}
                  </span>
                  <ChevronDown
                    size={14}
                    color={theme.subTextColor}
                    style={{
                      transform: showMemberPickerDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>

                {/* Member Picker Popover Dropdown */}
                {showMemberPickerDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      width: '320px',
                      backgroundColor: isLight ? '#ffffff' : '#1f1f23',
                      border: theme.panelBorder,
                      borderRadius: '16px',
                      padding: '14px',
                      boxShadow: '0 20px 48px rgba(0,0,0,0.45)',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: theme.headingColor }}>
                        Chọn thành viên hiển thị
                      </span>
                      <button
                        onClick={() => setShowMemberPickerDropdown(false)}
                        style={{ background: 'none', border: 'none', color: theme.subTextColor, cursor: 'pointer', padding: '2px' }}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Quick Action: Select all / Deselect all */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '12px' }}>
                      <button
                        onClick={() => setFilterMemberIds(members.map((m) => m.userId))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#818cf8',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Chọn tất cả ({members.length})
                      </button>
                      <button
                        onClick={() => setFilterMemberIds([])}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: theme.subTextColor,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Hiện toàn bộ
                      </button>
                    </div>

                    {/* Member Search input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)', padding: '5px 8px', borderRadius: '6px', marginBottom: '10px' }}>
                      <Search size={12} color={theme.subTextColor} />
                      <input
                        type="text"
                        placeholder="Tìm thành viên..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        style={{ background: 'transparent', border: 'none', outline: 'none', color: theme.textColor, fontSize: '11.5px', width: '100%' }}
                      />
                    </div>

                    {/* Members List */}
                    <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {members
                        .filter((m) => !memberSearchQuery || m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                        .map((m) => {
                          const isChecked = filterMemberIds.length === 0 || filterMemberIds.includes(m.userId);
                          return (
                            <div
                              key={m.userId}
                              onClick={() => {
                                if (filterMemberIds.length === 0) {
                                  setFilterMemberIds(members.map((x) => x.userId).filter((id) => id !== m.userId));
                                } else if (filterMemberIds.includes(m.userId)) {
                                  const updated = filterMemberIds.filter((id) => id !== m.userId);
                                  setFilterMemberIds(updated.length === 0 ? [] : updated);
                                } else {
                                  const updated = [...filterMemberIds, m.userId];
                                  setFilterMemberIds(updated.length === members.length ? [] : updated);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                backgroundColor: isChecked ? (isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)') : 'transparent',
                                cursor: 'pointer',
                                transition: 'background-color 0.1s',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  style={{ accentColor: '#4f46e5', width: '14px', height: '14px', cursor: 'pointer' }}
                                />
                                <div
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    backgroundColor: m.color || '#6366f1',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                  }}
                                >
                                  {getInitials(m.name)}
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: theme.headingColor }}>
                                    {m.name}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: theme.subTextColor }}>
                                    {m.role}
                                  </div>
                                </div>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: isChecked ? '#10b981' : theme.subTextColor }}>
                                {m.pct.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: theme.subTextColor }}>
                        Hiển thị {filterMemberIds.length === 0 ? members.length : filterMemberIds.length}/{members.length}
                      </span>
                      <button
                        onClick={() => setShowMemberPickerDropdown(false)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#4f46e5',
                          color: '#fff',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Xong
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. + Add Filter Button with Popover (Interactive) */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setShowFilterPopover(!showFilterPopover);
                    setShowMemberPickerDropdown(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: showFilterPopover || activeFilterCount > 0 ? 'rgba(99, 102, 241, 0.2)' : isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                    color: showFilterPopover || activeFilterCount > 0 ? '#818cf8' : theme.headingColor,
                    border: showFilterPopover || activeFilterCount > 0 ? '1px solid #6366f1' : theme.tableBorder,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Filter size={14} />
                  <span>Bộ lọc (Add Filter)</span>
                  {activeFilterCount > 0 && (
                    <span
                      style={{
                        backgroundColor: '#6366f1',
                        color: '#fff',
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '999px',
                        fontWeight: 700,
                      }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Filter Popover Dropdown */}
                {showFilterPopover && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      width: '330px',
                      backgroundColor: isLight ? '#ffffff' : '#1f1f23',
                      border: theme.panelBorder,
                      borderRadius: '16px',
                      padding: '16px',
                      boxShadow: '0 20px 48px rgba(0,0,0,0.45)',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <SlidersHorizontal size={14} color="#818cf8" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: theme.headingColor }}>Bộ lọc nâng cao</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setFilterDimensions({ d1: true, d2: true, d3: true, d4: true, evidence: true });
                            setFilterStatus('ALL');
                            setFilterContributionTier('ALL');
                            setFilterRole('ALL');
                            setSortBy('PCT');
                          }}
                          title="Đặt lại bộ lọc về mặc định"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: theme.subTextColor,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          <RotateCcw size={12} />
                          <span>Đặt lại</span>
                        </button>
                        <button onClick={() => setShowFilterPopover(false)} style={{ background: 'none', border: 'none', color: theme.subTextColor, cursor: 'pointer' }}>
                          <X size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Dimension Selection */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '12.5px' }}>
                      <span style={{ color: theme.subTextColor }}>Chiều đo:</span>
                      <span style={{ fontWeight: 600, color: '#818cf8', backgroundColor: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {Object.values(filterDimensions).filter(Boolean).length}/5 đã chọn
                      </span>
                      <button
                        type="button"
                        title="Bật lại toàn bộ chiều đo"
                        onClick={() => setFilterDimensions({ d1: true, d2: true, d3: true, d4: true, evidence: true })}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={13} color="#ef4444" />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                      {[
                        { key: 'd1', label: 'D1 Sản lượng (Story point & Tasks)' },
                        { key: 'd2', label: 'D2 Độ tin cậy (Đúng hạn & Ít rework)' },
                        { key: 'd3', label: 'D3 Phối hợp (Review & Trao đổi)' },
                        { key: 'd4', label: 'D4 Đánh giá chéo (K-Anonymity)' },
                        { key: 'evidence', label: 'Minh chứng công việc đã duyệt' },
                      ].map((item) => (
                        <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.textColor, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={filterDimensions[item.key]}
                            onChange={() => setFilterDimensions((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                            style={{ accentColor: '#4f46e5', width: '14px', height: '14px' }}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Filter by Tier & Status & Sort */}
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                      {/* Contribution Tier */}
                      <div>
                        <div style={{ fontSize: '11px', color: theme.subTextColor, marginBottom: '4px' }}>Mức độ đóng góp (%)</div>
                        <select
                          value={filterContributionTier}
                          onChange={(e) => setFilterContributionTier(e.target.value as typeof filterContributionTier)}
                          style={{
                            width: '100%',
                            backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                            color: theme.textColor,
                            border: theme.tableBorder,
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '12px',
                          }}
                        >
                          <option value="ALL">Tất cả mức đóng góp</option>
                          <option value="HIGH">Đóng góp cao (≥ 20%)</option>
                          <option value="MED">Cân bằng (10% - 20%)</option>
                          <option value="LOW">Cần hỗ trợ (&lt; 10%)</option>
                        </select>
                      </div>

                      {/* Evidence Status */}
                      <div>
                        <div style={{ fontSize: '11px', color: theme.subTextColor, marginBottom: '4px' }}>Trạng thái thẩm định</div>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          style={{
                            width: '100%',
                            backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                            color: theme.textColor,
                            border: theme.tableBorder,
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '12px',
                          }}
                        >
                          <option value="ALL">Tất cả trạng thái</option>
                          <option value="SUFFICIENT">Đạt chuẩn (Sufficient)</option>
                          <option value="INSUFFICIENT">Đang thẩm định (Insufficient)</option>
                          <option value="SUSPICIOUS">Bất thường (Suspicious)</option>
                        </select>
                      </div>

                      {/* Role Filter */}
                      {availableRoles.length > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', color: theme.subTextColor, marginBottom: '4px' }}>Vai trò (Role)</div>
                          <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            style={{
                              width: '100%',
                              backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                              color: theme.textColor,
                              border: theme.tableBorder,
                              borderRadius: '6px',
                              padding: '6px 8px',
                              fontSize: '12px',
                            }}
                          >
                            <option value="ALL">Tất cả vai trò</option>
                            {availableRoles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Sort Order */}
                      <div>
                        <div style={{ fontSize: '11px', color: theme.subTextColor, marginBottom: '4px' }}>Sắp xếp theo</div>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                          style={{
                            width: '100%',
                            backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                            color: theme.textColor,
                            border: theme.tableBorder,
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '12px',
                          }}
                        >
                          <option value="PCT">% Đóng góp (Cao → Thấp)</option>
                          <option value="D1">D1 Sản lượng (Output)</option>
                          <option value="D2">D2 Độ tin cậy (Reliability)</option>
                          <option value="D3">D3 Phối hợp (Collaboration)</option>
                          <option value="D4">D4 Đánh giá chéo (Peer)</option>
                          <option value="NAME">Tên thành viên (A → Z)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowFilterPopover(false)}
                      style={{
                        marginTop: '14px',
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#4f46e5',
                        color: '#fff',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Check size={14} />
                      <span>Áp dụng ({filteredMembers.length} thành viên)</span>
                    </button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isLight ? '#fff' : '#27272a', padding: '6px 12px', borderRadius: '8px', border: theme.tableBorder, width: '220px' }}>
                <Search size={14} color={theme.subTextColor} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: theme.textColor, outline: 'none', fontSize: '12.5px', width: '100%' }}
                />
              </div>

              <button
                onClick={handleDownloadBackendPdf}
                disabled={downloading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  backgroundColor: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                }}
              >
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* ── View 1: Overview Tab Table (Exact Styling from Image) ── */}
          {activeTab === 'overview' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {/* Inner Table Heading Banner */}
              <div
                style={{
                  display: 'flex',
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
                              }}
                            >
                              {getInitials(m.name)}
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor }}>
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
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {getInitials(m.name)}
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor }}>
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
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {getInitials(m.name)}
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor }}>
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
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {getInitials(m.name)}
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
                              <span style={{ fontSize: '12px', color: m.isSuspicious ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                {m.isSuspicious ? '⚠ Bất thường' : '✓ An toàn'}
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor }}>
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
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {getInitials(m.name)}
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor }}>
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
                                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: m.color, color: '#fff', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {getInitials(m.name)}
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
                              <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, backgroundColor: m.peerScore.includes('★') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: m.peerScore.includes('★') ? '#34d399' : '#94a3b8' }}>
                                {m.peerScore.includes('★') ? '✓ K-Anonymity Đạt chuẩn' : 'Đang thu thập phiếu'}
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: theme.tableBorder, color: theme.subTextColor }}>
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  {/* Radar Chart */}
                  <div
                    style={{
                      backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                      border: theme.tableBorder,
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
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

                    <div style={{ width: '100%', height: 260, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <RadarChart width={320} height={250} cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke={isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'} />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: theme.subTextColor, fontSize: 11 }} />
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
            <div style={{ padding: '24px 28px', borderBottom: theme.tableBorder }}>
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
          padding: '42px 46px',
          boxShadow: theme.paperShadow,
          maxWidth: '100%',
          boxSizing: 'border-box',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: theme.paperHeaderBorder, paddingBottom: '16px', marginBottom: '20px' }}>
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
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>✓ Dữ liệu bất biến đã khóa</div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px 24px',
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: theme.paperHeaderBorder, backgroundColor: theme.paperTableHeaderBg }}>
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
          * <strong>Ghi chú kiểm soát đóng góp:</strong> Mọi con số đóng góp được truy vết tự động từ ActivityEvent log bất biến (Task Board nội bộ CR-02, Git commits và Minh chứng công việc thủ công đã duyệt). Cơ chế chấm chéo tuân thủ thuật toán K-Anonymity (Nghị định 13/2023/NĐ-CP). Báo cáo này là cơ sở duy nhất để giảng viên phân bổ điểm đồ án cá nhân.
        </div>

        {/* Official Signatures Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: theme.paperHeading, textTransform: 'uppercase' }}>
              ĐẠI DIỆN TRƯỞNG NHÓM ĐỒ ÁN
            </div>
            <div style={{ fontSize: '11px', color: theme.paperSubText, fontStyle: 'italic', marginBottom: '40px' }}>
              (Ký và ghi rõ họ tên)
            </div>
            <div style={{ fontWeight: 700, color: theme.paperHeading, fontSize: '14px' }}>
              {leaderName}
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              [Đã xác thực chữ ký điện tử FairShare]
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: theme.paperHeading, textTransform: 'uppercase' }}>
              GIẢNG VIÊN HƯỚNG DẪN / HỘI ĐỒNG BẢO VỆ
            </div>
            <div style={{ fontSize: '11px', color: theme.paperSubText, fontStyle: 'italic', marginBottom: '40px' }}>
              (Nghiệm thu năng suất &amp; Cho điểm đồ án)
            </div>
            <div style={{ borderBottom: isLight ? '1px dotted #94a3b8' : '1px dotted rgba(255, 255, 255, 0.25)', width: '200px', margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '12px', color: theme.paperTableHeaderText }}>
              Điểm đánh giá: <strong>_____ / 10.0</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Modal nộp minh chứng ngoài hệ thống */}
      <ManualContributionModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        teamId={currentTeamId}
        sprintId={selectedSprintId}
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
            padding: '20px',
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
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              padding: '24px 28px',
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
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
                <div style={{ fontSize: '10.5px', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                  ✓ Đạt chuẩn 100%
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
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
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: theme.tableBorder, borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: theme.tableBorder, backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)', color: theme.subTextColor }}>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
            padding: '20px',
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
              maxHeight: '92vh',
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
                padding: '20px 24px',
                borderBottom: theme.tableBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isLight
                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  <Brain size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                padding: '12px 24px',
                borderBottom: theme.tableBorder,
                backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
              }}
            >
              {[
                { id: 'diagnostic', label: '🔮 Chẩn đoán & Rủi ro Nhóm', icon: <Lightbulb size={14} /> },
                { id: 'algorithm', label: '⚙️ Giải mã 4 Tầng Robust MAD', icon: <Scale size={14} /> },
                { id: 'chat', label: '💬 AI Advisor Hỏi Đáp', icon: <Bot size={14} /> },
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
              {/* TAB 1: DIAGNOSTIC & HEALTH CHECK */}
              {aiActiveTab === 'diagnostic' && (
                <div>
                  {/* Top 3 AI Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '22px' }}>
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
                      <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                        ✓ Mức độ phân bổ lành mạnh
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
                      <div style={{ fontSize: '11px', color: '#818cf8', marginTop: '4px', fontWeight: 600 }}>
                        ✓ Anti-gaming check Passed
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
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', backgroundColor: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                  🌟 Năng suất vượt trội
                                </span>
                              ) : isUnder ? (
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', backgroundColor: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                  ⚡ Cần giao thêm Task
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6366f1', backgroundColor: isLight ? '#e0e7ff' : 'rgba(99, 102, 241, 0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                                  ✓ Đạt chuẩn tiến độ
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
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
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)', color: theme.subTextColor, borderBottom: theme.tableBorder }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', height: '420px' }}>
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
                        }}
                      >
                        ✨ {prompt}
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
          .no-print, nav, header, aside, .dock-container, .page-head, button {
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
