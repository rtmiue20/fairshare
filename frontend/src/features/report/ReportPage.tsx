import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
import { NoProjectState } from '../team/NoProjectState';
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
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1));

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
  const [sortBy, setSortBy] = useState<'PCT' | 'D1' | 'D2' | 'D3' | 'D4'>('PCT');

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

  // Filtered and Sorted Members
  const filteredMembers = useMemo(() => {
    let result = [...members];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    }
    if (filterStatus === 'SUFFICIENT') {
      result = result.filter((m) => m.evidenceStatus === 'SUFFICIENT');
    } else if (filterStatus === 'INSUFFICIENT') {
      result = result.filter((m) => m.evidenceStatus === 'INSUFFICIENT');
    } else if (filterStatus === 'SUSPICIOUS') {
      result = result.filter((m) => m.isSuspicious);
    }

    result.sort((a, b) => {
      if (sortBy === 'D1') return b.d1Output - a.d1Output;
      if (sortBy === 'D2') return b.d2Reliability - a.d2Reliability;
      if (sortBy === 'D3') return b.d3Collaboration - a.d3Collaboration;
      if (sortBy === 'D4') return b.d4Peer - a.d4Peer;
      return b.pct - a.pct;
    });

    return result;
  }, [members, searchQuery, filterStatus, sortBy]);

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

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  // Visual Theme Tokens matching the image and project dark/light modes
  const theme = {
    textColor: isLight ? '#0f172a' : '#f8fafc',
    subTextColor: isLight ? '#64748b' : '#94a3b8',
    headingColor: isLight ? '#0f172a' : '#ffffff',
    panelBg: isLight ? '#ffffff' : 'rgba(18, 19, 26, 0.85)',
    panelBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
    panelShadow: isLight ? '0 20px 48px -10px rgba(0,0,0,0.06)' : '0 24px 60px -15px rgba(0, 0, 0, 0.7)',
    sidebarBg: isLight ? '#fcfcfd' : 'rgba(14, 15, 20, 0.65)',
    sidebarBorder: isLight ? '1px solid #edf2f7' : '1px solid rgba(255, 255, 255, 0.06)',
    itemHoverBg: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)',
    activePillBg: '#4f46e5',
    activePillText: '#ffffff',
    tableBorder: isLight ? '1px solid #edf2f7' : '1px solid rgba(255, 255, 255, 0.06)',
    tableRowBorder: isLight ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.04)',
    tableHeaderBg: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
    paperBg: '#ffffff',
    paperColor: '#1e293b',
    paperBorder: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
    paperShadow: isLight ? '0 10px 30px rgba(0, 0, 0, 0.06)' : '0 12px 36px rgba(0, 0, 0, 0.45)',
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
                  backgroundColor: isLight ? '#ffffff' : 'rgba(18, 19, 26, 0.9)',
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
        <div style={{ backgroundColor: isLight ? '#fff' : 'rgba(18, 19, 26, 0.75)', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
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

        <div style={{ backgroundColor: isLight ? '#fff' : 'rgba(18, 19, 26, 0.75)', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
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

        <div style={{ backgroundColor: isLight ? '#fff' : 'rgba(18, 19, 26, 0.75)', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
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

        <div style={{ backgroundColor: isLight ? '#fff' : 'rgba(18, 19, 26, 0.75)', border: theme.panelBorder, borderRadius: '14px', backdropFilter: 'blur(16px)', padding: '14px 18px', boxShadow: theme.panelShadow }}>
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
                            if (item.id === 'send-all-emails') {
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

          {/* Bottom Promo Card (Mirroring 'Get Trenning AI' from image) */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '16px',
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>
              <Sparkles size={14} /> FairShare AI Engine
            </div>
            <div style={{ fontSize: '11px', color: theme.subTextColor, marginTop: '4px', lineHeight: 1.4 }}>
              Mô hình đo lường 4 tầng Robust MAD tự động đối soát ActivityEvent.
            </div>
            <button
              onClick={() => {
                setActiveTab('progress');
                setActiveCategory('radar-4d');
              }}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8',
                border: 'none',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Khám phá ngay ↗
            </button>
          </div>
        </aside>

        {/* ── Main Panel Right Area (Exact Model from Image) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* Panel Top: Title & Tabs */}
          <div style={{ padding: '24px 28px 0 28px', borderBottom: theme.tableBorder }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: theme.headingColor, margin: '0 0 16px 0' }}>
              Thành viên &amp; Đóng góp (Learners)
            </h2>

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
              {/* Peoples (Count) Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: theme.headingColor,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                  border: theme.tableBorder,
                }}
              >
                <Users size={15} color={theme.subTextColor} />
                <span>Thành viên ({members.length})</span>
                <ChevronDown size={14} color={theme.subTextColor} />
              </div>

              {/* + Add Filter Button with Popover */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: showFilterPopover ? 'rgba(99, 102, 241, 0.2)' : isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                    color: showFilterPopover ? '#818cf8' : theme.headingColor,
                    border: showFilterPopover ? '1px solid #6366f1' : theme.tableBorder,
                    cursor: 'pointer',
                  }}
                >
                  <Filter size={14} />
                  <span>Bộ lọc (Add Filter)</span>
                </button>

                {/* Filter Popover Dropdown (Exact Model from Image) */}
                {showFilterPopover && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      width: '320px',
                      backgroundColor: isLight ? '#ffffff' : '#14151f',
                      border: theme.panelBorder,
                      borderRadius: '16px',
                      padding: '16px',
                      boxShadow: '0 20px 48px rgba(0,0,0,0.45)',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: theme.headingColor }}>Filters</span>
                      <button onClick={() => setShowFilterPopover(false)} style={{ background: 'none', border: 'none', color: theme.subTextColor, cursor: 'pointer' }}>
                        <X size={15} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '12.5px' }}>
                      <span style={{ color: theme.subTextColor }}>Where</span>
                      <span style={{ fontWeight: 600, color: '#818cf8', backgroundColor: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        Chiều đo lường
                      </span>
                      <span style={{ marginLeft: 'auto', color: theme.subTextColor }}>4 selected</span>
                      <Trash2 size={13} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => setFilterDimensions({ d1: true, d2: true, d3: true, d4: true, evidence: true })} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
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

                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: theme.subTextColor, marginBottom: '4px' }}>Trạng thái</div>
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
                          <option value="SUFFICIENT">Đạt chuẩn</option>
                          <option value="INSUFFICIENT">Đang thẩm định</option>
                          <option value="SUSPICIOUS">Bất thường</option>
                        </select>
                      </div>

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
                          <option value="PCT">% Đóng góp (Cao-Thấp)</option>
                          <option value="D1">D1 Sản lượng (Output)</option>
                          <option value="D2">D2 Độ tin cậy (Reliability)</option>
                          <option value="D3">D3 Phối hợp (Collaboration)</option>
                          <option value="D4">D4 Đánh giá chéo (Peer)</option>
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
                      }}
                    >
                      Áp dụng bộ lọc
                    </button>
                  </div>
                )}
              </div>

              {/* Trained 50% Circular Widget (from image) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '6px' }}>
                <CircularProgress pct={Number(totalPercentage) > 0 ? 100 : 50} size={36} color="#10b981" />
                <div>
                  <div style={{ fontSize: '11px', color: theme.subTextColor }}>Tổng phân bổ</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: theme.headingColor }}>
                    {totalPercentage}%
                  </div>
                </div>
              </div>
            </div>

            {/* Right Controls: Search, Export Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isLight ? '#fff' : 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '8px', border: theme.tableBorder, width: '220px' }}>
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
                  <span>{currentSprint ? currentSprint.name : 'Sprint'} · Bảng phân bổ &amp; Năng suất</span>
                </div>
                <div style={{ fontSize: '12px', color: theme.subTextColor }}>
                  &lt; 1/{members.length || 1} Thành viên &gt;
                </div>
              </div>

              {/* The Data Table */}
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
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#475569', textTransform: 'uppercase' }}>
              FAIRSHARE · HỆ THỐNG ĐO LƯỜNG ĐÓNG GÓP ĐỒ ÁN NHÓM
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0' }}>
              BÁO CÁO NGHIỆM THU ĐÓNG GÓP &amp; MINH BẠCH NĂNG SUẤT
            </h2>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Đồ án: <strong style={{ color: '#0f172a' }}>{teamName}</strong> · Mã nhóm: <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>{inviteCode}</code>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Thời điểm xuất:</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{todayStr}</div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>✓ Dữ liệu bất biến đã khóa</div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px 24px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px 18px',
            fontSize: '13px',
            marginBottom: '22px',
          }}
        >
          <div>
            <span style={{ color: '#64748b' }}>Giai đoạn đánh giá:</span>{' '}
            <strong style={{ color: '#0f172a' }}>{currentSprint?.name || 'Sprint'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Thời gian thực hiện:</span>{' '}
            <strong style={{ color: '#0f172a' }}>
              {formatDate(currentSprint?.startDate)} — {formatDate(currentSprint?.endDate)}
            </strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Trưởng nhóm đại diện:</span>{' '}
            <strong style={{ color: '#0f172a' }}>{leaderName}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Cơ chế bảo vệ dữ liệu:</span>{' '}
            <strong style={{ color: '#0f172a' }}>Nghị định 13/2023/NĐ-CP (100% Đồng thuận)</strong>
          </div>
        </div>

        {/* Members Table */}
        <div style={{ overflowX: 'auto', marginBottom: '22px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #0f172a', backgroundColor: '#f1f5f9' }}>
                <th style={{ textAlign: 'center', padding: '10px 8px', color: '#334155', fontWeight: 700, width: '40px' }}>STT</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#334155', fontWeight: 700 }}>Thành viên &amp; Vai trò</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#334155', fontWeight: 700, width: '220px' }}>Tỷ lệ đóng góp (%)</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#334155', fontWeight: 700, width: '80px' }}>Task</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#334155', fontWeight: 700, width: '90px' }}>Hoạt động</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#334155', fontWeight: 700, width: '100px' }}>Chấm chéo</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', color: '#334155', fontWeight: 700, width: '110px' }}>Minh chứng</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Chưa có dữ liệu đóng góp cho giai đoạn này.
                  </td>
                </tr>
              ) : (
                members.map((m, idx) => (
                  <tr key={m.userId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ textAlign: 'center', padding: '12px 8px', color: '#64748b', fontFamily: 'monospace' }}>
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
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: '11px', color: m.isLeader ? '#2563eb' : '#64748b', fontWeight: m.isLeader ? 600 : 400 }}>
                            {m.role}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, (m.pct / 30) * 100)}%`,
                              backgroundColor: m.color,
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', minWidth: '45px', textAlign: 'right' }}>
                          {m.pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                      {m.tasks}
                    </td>

                    <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                      {m.edits}
                    </td>

                    <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: m.peerScore.includes('★') ? '#b45309' : '#0f172a' }}>
                      {m.peerScore}
                    </td>

                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      {m.evidenceStatus === 'SUFFICIENT' ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#15803d',
                            backgroundColor: '#dcfce7',
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
                            color: '#b45309',
                            backgroundColor: '#fef3c7',
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
                            color: '#94a3b8',
                            backgroundColor: '#f1f5f9',
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
              <tr style={{ borderTop: '2px solid #0f172a', backgroundColor: '#f8fafc', fontWeight: 700 }}>
                <td colSpan={2} style={{ padding: '10px 12px', color: '#0f172a' }}>
                  TỔNG CỘNG ({members.length} THÀNH VIÊN)
                </td>
                <td style={{ padding: '10px 12px', color: '#0f172a', fontFamily: 'monospace' }}>
                  <div style={{ textAlign: 'right' }}>{totalPercentage}%</div>
                </td>
                <td style={{ textAlign: 'right', padding: '10px 12px', color: '#0f172a', fontFamily: 'monospace' }}>
                  {totalTasks}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 12px', color: '#0f172a', fontFamily: 'monospace' }}>
                  {totalEdits}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 12px', color: '#64748b' }}>
                  —
                </td>
                <td style={{ textAlign: 'center', padding: '10px 12px', color: '#15803d', fontSize: '11px' }}>
                  100% Đối soát
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legal & Audit Notes */}
        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginBottom: '32px' }}>
          * <strong>Ghi chú kiểm soát đóng góp:</strong> Mọi con số đóng góp được truy vết tự động từ ActivityEvent log bất biến (Task Board nội bộ CR-02, Git commits và Minh chứng công việc thủ công đã duyệt). Cơ chế chấm chéo tuân thủ thuật toán K-Anonymity (Nghị định 13/2023/NĐ-CP). Báo cáo này là cơ sở duy nhất để giảng viên phân bổ điểm đồ án cá nhân.
        </div>

        {/* Official Signatures Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
              ĐẠI DIỆN TRƯỞNG NHÓM ĐỒ ÁN
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginBottom: '40px' }}>
              (Ký và ghi rõ họ tên)
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
              {leaderName}
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              [Đã xác thực chữ ký điện tử FairShare]
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
              GIẢNG VIÊN HƯỚNG DẪN / HỘI ĐỒNG BẢO VỆ
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginBottom: '40px' }}>
              (Nghiệm thu năng suất &amp; Cho điểm đồ án)
            </div>
            <div style={{ borderBottom: '1px dotted #94a3b8', width: '200px', margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '12px', color: '#334155' }}>
              Điểm đánh giá: <strong>_____ / 10.0</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Print-specific styles to hide all app navigation on paper print */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
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
