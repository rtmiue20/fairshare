import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  NetworkNodeDto,
  NetworkLinkDto,
  NeuronEventItem,
  MultidimensionalNetworkDto,
  AiChatMessage,
  TcreiPromptBreakdown,
} from '../../types/contribution';
import { contributionApi } from '../../api/contribution.api';
import { formatSprintsWithWeeks, getSprintRailLayout } from './TimelineScrubber';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  Network,
  Filter,
  Sparkles,
  Plus,
  Send,
  X,
  ArrowUpDown,
  ChevronLeft,
  Play,
  Pause,
  Layers,
  Shield,
  Users,
  Star,
  AlertTriangle,
  ChevronDown,
  Check,
  Sliders,
  BarChart2,
  TrendingUp,
  Target,
  ThumbsUp,
  Info,
  Bot,
  Trash2,
  Loader2,
  Database,
  RefreshCw,
} from 'lucide-react';

export interface CosmicNetworkCanvasProps {
  teamId?: number;
  projectName?: string;
  networkData?: MultidimensionalNetworkDto | null;
  nodes: NetworkNodeDto[];
  links: NetworkLinkDto[];
  selectedNodeId: string | null;
  onSelectNode: (node: NetworkNodeDto) => void;
  activeFilter: string;
  onSelectFilter?: (filter: string) => void;
  onOpenImpactModal?: () => void;
  focusedUserName?: string;
  focusedUserRole?: string;
  finalPct?: number;
  sprintName?: string;
  viewMode?: 'overview' | 'detail';
  onSwitchViewMode?: (mode: 'overview' | 'detail') => void;
  sprints?: Array<{ id: number; name: string; startDate?: string; endDate?: string; isCurrent?: boolean; status?: string }>;
  selectedSprintId?: number | null;
  onSelectSprint?: (sprintId: number) => void;
  compositeScore?: number;
  distanceToCenter?: number;
  availabilityFactor?: number;
  members?: Array<{ id: number; fullName: string; email: string; role?: string }>;
  selectedUserId?: number | null;
  onSelectUser?: (userId: number) => void;
  selectedEvent?: NeuronEventItem | null;
  onSelectEvent?: (event: NeuronEventItem | null) => void;
  cutDay?: number;
  onCutDayChange?: (day: number) => void;
}

interface StarBg {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  phase: number;
}

interface ConstellationHub {
  id: string;
  label: string;
  category: string;
  percentage: number;
  badge: string;
  color: string;
  angle: number;
  distance: number;
  satellites: Array<{
    id: string;
    label: string;
    count: number;
    color: string;
    angleOffset: number;
    distOffset: number;
  }>;
}

const DETAIL_AXES = [
  { id: 'D1' as const, name: 'D1 · Sản lượng', short: 'Sản lượng', sub: 'SP · Tasks · Thẻ', color: '#34d399', icon: 'layers' },
  { id: 'D2' as const, name: 'D2 · Tin cậy', short: 'Tin cậy', sub: 'Đúng hạn · Rework', color: '#22d3ee', icon: 'shield' },
  { id: 'D3' as const, name: 'D3 · Phối hợp', short: 'Phối hợp', sub: 'Review · @mention', color: '#a78bfa', icon: 'users' },
  { id: 'D4' as const, name: 'D4 · Chấm chéo', short: 'Chấm chéo', sub: 'Đồng cấp · ẩn danh', color: '#f472b6', icon: 'star' },
  { id: 'IMP' as const, name: 'Rào cản / Khả dụng', short: 'Rào cản', sub: 'Impediment · a_i', color: '#fbbf24', icon: 'alert' },
];

const LEGEND_ITEMS: Array<{
  id: string;
  filterKey: string | null;
  dotColor: string;
  glow: string;
  title: string;
  badge: string;
  badgeClass: string;
  desc: string;
}> = [
  {
    id: 'core',
    filterKey: null,
    dotColor: 'bg-amber-400',
    glow: 'shadow-[0_0_8px_#fbbf24]',
    title: 'Thành viên trọng tâm',
    badge: 'Hạt nhân',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    desc: 'Điểm tổng hợp & % đóng góp Sprint',
  },
  {
    id: 'd1',
    filterKey: 'D1',
    dotColor: 'bg-emerald-500',
    glow: 'shadow-[0_0_8px_#10b981]',
    title: 'D1 · Sản lượng việc',
    badge: '40%',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    desc: 'Thẻ hoàn thành, Story Points & độ khó',
  },
  {
    id: 'd2',
    filterKey: 'D2',
    dotColor: 'bg-cyan-500',
    glow: 'shadow-[0_0_8px_#06b6d4]',
    title: 'D2 · Tiến độ & Tin cậy',
    badge: '20%',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    desc: 'Hoàn thành đúng hạn, hạn chế làm lại',
  },
  {
    id: 'd3',
    filterKey: 'D3',
    dotColor: 'bg-purple-500',
    glow: 'shadow-[0_0_8px_#a855f7]',
    title: 'D3 · Phối hợp nhóm',
    badge: '15%',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    desc: 'Review chéo, thảo luận & hỗ trợ',
  },
  {
    id: 'd4',
    filterKey: 'D4',
    dotColor: 'bg-pink-500',
    glow: 'shadow-[0_0_8px_#ec4899]',
    title: 'D4 · Chấm chéo đồng đội',
    badge: '25%',
    badgeClass: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30',
    desc: 'Đánh giá ẩn danh (từ ≥ 3 lượt)',
  },
  {
    id: 'imp',
    filterKey: 'IMPEDIMENT',
    dotColor: 'bg-orange-500',
    glow: 'shadow-[0_0_8px_#f59e0b]',
    title: 'Rào cản & Khả dụng',
    badge: 'Bù a_i',
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
    desc: 'Bù điểm công bằng khi vắng/trễ hợp lệ',
  },
];

const TCREI_STEPS: Array<{ key: 'T' | 'C' | 'R' | 'E' | 'I'; label: string; title: string }> = [
  { key: 'T', label: 'Task', title: 'T - Task (Nhiệm vụ & Vai trò Copilot)' },
  { key: 'C', label: 'Context', title: 'C - Context (Dữ liệu thật từ MariaDB)' },
  { key: 'R', label: 'Reference', title: 'R - Reference (Công thức Mô hình 4 tầng)' },
  { key: 'E', label: 'Evaluate', title: 'E - Evaluate (Kiểm định & Ví dụ chuẩn)' },
  { key: 'I', label: 'Iterate', title: 'I - Iterate (Hội thoại đa lượt & Gợi ý)' },
];

const renderInlineFormatted = (line: string): React.ReactNode => {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-zinc-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 font-mono text-[10.5px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

export const CosmicNetworkCanvas: React.FC<CosmicNetworkCanvasProps> = ({
  teamId,
  projectName,
  networkData,
  nodes,
  onSelectNode,
  activeFilter,
  onSelectFilter,
  onOpenImpactModal,
  focusedUserName = 'Thành viên',
  focusedUserRole,
  finalPct = 0,
  sprintName = 'Sprint hiện tại',
  viewMode = 'overview',
  onSwitchViewMode,
  sprints = [],
  selectedSprintId = null,
  onSelectSprint,
  compositeScore = 0,
  distanceToCenter = 0,
  availabilityFactor = 1.0,
  members = [],
  selectedUserId = null,
  onSelectUser,
  selectedEvent,
  onSelectEvent,
  cutDay: propCutDay,
  onCutDayChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const detailAreaRef = useRef<HTMLDivElement | null>(null);

  // Pan and Zoom Transform for Overview Canvas
  const [transform, setTransform] = useState({ scale: 1.0, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Floating Controls & AI Chatbox (TCREI) UI state
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showAiCard, setShowAiCard] = useState(false);
  const [teamAiReview, setTeamAiReview] = useState<{
    content: string;
    modelUsed: string;
    liveGeminiUsed: boolean;
    timestamp: string;
    tcrei?: TcreiPromptBreakdown;
    followUps?: string[];
  } | null>(null);
  const [isTeamAiReviewLoading, setIsTeamAiReviewLoading] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [previousInteractionId, setPreviousInteractionId] = useState<string | null>(null);
  const [latestTcrei, setLatestTcrei] = useState<TcreiPromptBreakdown | null>(null);
  const [activeTcreiStep, setActiveTcreiStep] = useState<'T' | 'C' | 'R' | 'E' | 'I' | null>(null);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([
    'Điểm số hiện tại của tôi thế nào?',
    'Cách tính điểm Mô hình 4 tầng?',
    'Tổng quát bảng điểm cả nhóm?',
    'Công việc dự án đang đảm nhận?',
  ]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showMemberDropdown2, setShowMemberDropdown2] = useState(false);
  const [showMobileLegend, setShowMobileLegend] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  const orderedSprints = useMemo(() => {
    const source =
      sprints && sprints.length > 0
        ? sprints
        : sprintName
        ? [{ id: selectedSprintId ?? networkData?.sprintId ?? 1, name: sprintName, isCurrent: true, status: 'ACTIVE' }]
        : [];
    return formatSprintsWithWeeks(source);
  }, [sprints, sprintName, selectedSprintId, networkData?.sprintId]);

  const rootMeta = useMemo(() => {
    const root = (nodes || []).find((n) => n.type === 'ROOT');
    return (root?.metadata || {}) as Record<string, unknown>;
  }, [nodes]);

  const resolvedProjectName =
    projectName ||
    networkData?.teamName ||
    (typeof rootMeta.teamName === 'string' && rootMeta.teamName) ||
    'Dự án nhóm';

  const activeMemberObj = useMemo(() => {
    const targetId = selectedUserId ?? networkData?.focusedUserId;
    return members.find((m) => m.id === targetId) || members[0];
  }, [members, selectedUserId, networkData?.focusedUserId]);

  const resolvedUserRole =
    focusedUserRole ||
    networkData?.focusedUserRole ||
    (typeof rootMeta.role === 'string' && rootMeta.role) ||
    activeMemberObj?.role ||
    'Thành viên';

  const sprintTotalDays = useMemo(() => {
    const d = Number(rootMeta.sprintDays);
    return Number.isFinite(d) && d > 0 ? d : 14;
  }, [rootMeta.sprintDays]);

  const activeSprintStartDate = useMemo(() => {
    const fromSprint = orderedSprints.find((s) =>
      selectedSprintId != null ? s.id === selectedSprintId : Boolean(s.isCurrent || s.status === 'ACTIVE')
    )?.startDate;
    if (fromSprint) return fromSprint;
    if (typeof rootMeta.sprintStartDate === 'string' && rootMeta.sprintStartDate) return rootMeta.sprintStartDate;
    return '';
  }, [orderedSprints, selectedSprintId, rootMeta.sprintStartDate]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAiLoading, isChatOpen]);

  // Close member dropdowns on outside click
  useEffect(() => {
    if (!showMemberDropdown && !showMemberDropdown2) return;
    const handler = () => {
      setShowMemberDropdown(false);
      setShowMemberDropdown2(false);
    };
    const id = setTimeout(() => document.addEventListener('click', handler), 10);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', handler);
    };
  }, [showMemberDropdown, showMemberDropdown2]);

  // Detail View State
  const [selectedAxis, setSelectedAxis] = useState<'D1' | 'D2' | 'D3' | 'D4' | 'IMP'>('D1');
  const [internalCutDay, setInternalCutDay] = useState<number>(14);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [itemFocus, setItemFocus] = useState<number>(0);
  const [stageDimensions, setStageDimensions] = useState({ width: 900, height: 650 });

  // Theme detector for canvas & UI
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.dataset.theme !== 'light';
  });

  useEffect(() => {
    const updateTheme = () => {
      const theme = document.documentElement.dataset.theme;
      setIsDark(theme !== 'light');
    };
    updateTheme();
    const obs = new MutationObserver(() => updateTheme());
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const cutDay = propCutDay !== undefined ? propCutDay : internalCutDay;
  const setCutDay = useCallback(
    (day: number) => {
      setInternalCutDay(day);
      onCutDayChange?.(day);
    },
    [onCutDayChange]
  );

  // Resize Observer for Stage Dimensions
  useEffect(() => {
    const el = detailAreaRef.current || containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setStageDimensions({
          width: entry.contentRect.width || 900,
          height: entry.contentRect.height || 650,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Helper Initials for central Orb
  const initials = useMemo(() => {
    if (!focusedUserName) return 'FS';
    const parts = focusedUserName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [focusedUserName]);

  // Build Events strictly from Real MariaDB Nodes (Zero fake/sample data)
  const memberEvents = useMemo<NeuronEventItem[]>(() => {
    const mid = String(selectedUserId ?? networkData?.focusedUserId ?? 0);
    const list: NeuronEventItem[] = [];

    const dbEventNodes = (nodes || []).filter(
      (n) => (n.type === 'EVENT' || n.type === 'IMPEDIMENT') && !n.id.includes('synthetic')
    );

    dbEventNodes.forEach((n, idx) => {
      const meta = (n.metadata || {}) as Record<string, unknown>;
      const axis: NeuronEventItem['axis'] =
        n.type === 'IMPEDIMENT' || n.category === 'IMPEDIMENT'
          ? 'IMP'
          : n.category === 'D1' || n.category === 'D2' || n.category === 'D3' || n.category === 'D4'
          ? n.category
          : 'D1';

      const src =
        typeof meta.source === 'string' && meta.source
          ? meta.source
          : n.id.startsWith('manual-')
          ? 'Khai báo'
          : axis === 'IMP'
          ? 'Rào cản DB'
          : axis === 'D4'
          ? 'Chấm chéo'
          : 'Bảng Kanban';

      const dayIndex =
        typeof meta.dayIndex === 'number' && Number.isFinite(meta.dayIndex)
          ? Math.max(1, Math.min(sprintTotalDays, meta.dayIndex))
          : Math.min(sprintTotalDays, Math.max(1, Math.round(((idx + 1) / Math.max(1, dbEventNodes.length)) * sprintTotalDays)));

      const occurredDate = typeof meta.occurredDate === 'string' ? meta.occurredDate : '';
      const timeStr = typeof meta.time === 'string' && meta.time !== '--:--' ? meta.time : '';
      const formattedTime = occurredDate ? (timeStr ? `${occurredDate} · ${timeStr}` : occurredDate) : 'Trong Sprint';

      const weightVal = typeof n.weight === 'number' ? n.weight : 1.0;
      const isWarn = n.status === 'WARN';
      const dpVal =
        axis === 'IMP'
          ? 0
          : isWarn
          ? -Number(Math.min(2.5, Math.max(0.3, weightVal * 0.4)).toFixed(1))
          : Number(Math.min(3.5, Math.max(0.2, weightVal * 0.35)).toFixed(1));

      list.push({
        id: `db-${n.id}`,
        mid,
        axis,
        kind: axis === 'IMP' ? 'imp' : axis === 'D3' ? 'review' : axis === 'D4' ? 'rate' : 'card',
        title: n.label,
        src,
        day: dayIndex,
        time: formattedTime,
        impact: isWarn ? -Math.abs(weightVal) : weightVal,
        dp: dpVal,
        evid: n.description || `${src} · ${n.badge || 'Sự kiện đã lưu trong CSDL'}`,
        meta: { sp: weightVal },
      });
    });

    // If no impediment recorded in DB, reflect exact availability state cleanly
    const hasDbImp = list.some((item) => item.axis === 'IMP');
    if (!hasDbImp) {
      const avail = availabilityFactor ?? 1.0;
      list.push({
        id: `${mid}-imp-status`,
        mid,
        axis: 'IMP',
        kind: 'imp',
        title:
          avail < 0.999
            ? `Điều chỉnh khả dụng (a_i = ${avail.toFixed(2)})`
            : 'Không phát sinh rào cản ngoại cảnh (a_i = 1.00)',
        src: 'Hệ thống',
        day: 1,
        time: activeSprintStartDate || 'Từ đầu Sprint',
        impact: avail < 0.999 ? Number(((1 - avail) * 10).toFixed(1)) : 0,
        dp: avail < 0.999 ? Number(((1 - avail) * 12).toFixed(1)) : 0,
        evid:
          avail < 0.999
            ? `Thành viên được ghi nhận hệ số khả dụng a_i = ${avail.toFixed(2)}, kích hoạt bù D' = D · (1 + 0.5(1 - a_i)).`
            : 'Thành viên tham gia đầy đủ 100%, không phát sinh rào cản ngoại cảnh cần bù khả dụng.',
        meta: { days: 0 },
      });
    }

    return list;
  }, [selectedUserId, networkData?.focusedUserId, nodes, sprintTotalDays, availabilityFactor, activeSprintStartDate]);

  // Maximum day matches sprint span & latest event
  const maxDay = useMemo(() => {
    const eventMax = memberEvents.length > 0 ? Math.max(...memberEvents.map((e) => e.day)) : 1;
    return Math.max(1, sprintTotalDays, eventMax);
  }, [memberEvents, sprintTotalDays]);

  useEffect(() => {
    if (propCutDay === undefined) {
      setInternalCutDay(maxDay);
    }
  }, [maxDay, selectedSprintId, selectedUserId, propCutDay]);

  // Bộ đếm thời gian phát lại (Sprint Replay simulation) — tự động dừng khi thẻ vừa hiện ra hết
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setInternalCutDay((prev) => {
        const next = prev >= maxDay ? maxDay : prev + 1;
        if (next >= maxDay) {
          setIsPlaying(false);
        }
        onCutDayChange?.(next);
        return next;
      });
    }, 700);
    return () => clearInterval(timer);
  }, [isPlaying, maxDay, onCutDayChange]);

  // Nút Play/Pause: khi đã xem hết (cutDay >= maxDay), bấm Play lần nữa sẽ tự động tua lại từ Ngày 1 và chạy lại
  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (cutDay >= maxDay) {
        setCutDay(1);
      }
      setIsPlaying(true);
    }
  };

  // Filter events up to cutDay
  const activeEvents = useMemo(() => {
    return memberEvents.filter((ev) => ev.day <= cutDay);
  }, [memberEvents, cutDay]);

  // Events of currently selected axis
  const axisEvents = useMemo(() => {
    return activeEvents.filter((ev) => ev.axis === selectedAxis);
  }, [activeEvents, selectedAxis]);

  // Hub definitions mapped cleanly to real DB metrics across 6 balanced orbital sectors
  const constellationHubs = useMemo<ConstellationHub[]>(() => {
    const raw = (networkData?.tierBreakdown?.rawFeatures || {}) as Record<string, unknown>;
    const cardsDone = Number(raw.cardsCompleted ?? 0);
    const totalSp = Number(raw.totalStoryPoints ?? 0);
    const onTimeRate = Number(raw.onTimeRate ?? 1);
    const manualSp = Number(raw.manualPoints ?? 0);
    const avgDifficulty = Number(raw.avgDifficulty ?? 0);
    const avgDelayDays = Number(raw.avgDelayDays ?? 0);
    const reworkCount = Number(raw.reworkCount ?? 0);
    const commentCount = Number(raw.commentCount ?? 0);
    const reviewForOthersCount = Number(raw.reviewForOthersCount ?? 0);
    const supportMentionCount = Number(raw.supportMentionCount ?? 0);
    const peerUniqueReviewers = Number(raw.peerUniqueReviewers ?? 0);
    const peerAvgScore = Number(raw.peerAvgScore ?? 0);

    const dbD1BoardNodes = (nodes || []).filter(
      (n) => n.type === 'EVENT' && n.category === 'D1' && !n.id.startsWith('manual-') && !n.id.includes('synthetic')
    );
    const dbManualNodes = (nodes || []).filter(
      (n) => n.type === 'EVENT' && n.id.startsWith('manual-')
    );
    const dbD2Nodes = (nodes || []).filter(
      (n) => (n.type === 'EVENT' || n.type === 'IMPEDIMENT') && n.category === 'D2' && !n.id.includes('synthetic')
    );
    const dbD3Nodes = (nodes || []).filter(
      (n) => n.type === 'EVENT' && n.category === 'D3' && !n.id.includes('synthetic')
    );
    const dbD4Nodes = (nodes || []).filter(
      (n) => n.type === 'EVENT' && n.category === 'D4' && !n.id.includes('synthetic')
    );
    const dbImpNodes = (nodes || []).filter(
      (n) => n.category === 'IMPEDIMENT' && n.id !== 'cat-impediments' && !n.id.includes('synthetic')
    );

    const truncLabel = (str: string, max = 26) => (str.length > max ? `${str.slice(0, max - 3)}...` : str);
    const availPct = Math.round((availabilityFactor ?? 1) * 100);
    const collabTotal = commentCount + reviewForOthersCount + supportMentionCount + dbD3Nodes.length;

    const d1Satellites =
      dbD1BoardNodes.length > 0
        ? dbD1BoardNodes.slice(0, 3).map((n, i) => ({
            id: `sat-d1-${n.id}`,
            label: truncLabel(n.label, 28),
            count: Number(Number(n.weight || 1).toFixed(1)),
            color: ['#34d399', '#38bdf8', '#a78bfa'][i % 3],
            angleOffset: [-0.34, 0, 0.34][i % 3],
            distOffset: [78, 86, 78][i % 3],
          }))
        : [
            {
              id: 'sat-d1-empty',
              label: 'Chưa có thẻ hoàn thành',
              count: 0,
              color: '#34d399',
              angleOffset: 0,
              distOffset: 78,
            },
          ];

    const manualSatellites =
      dbManualNodes.length > 0
        ? dbManualNodes.slice(0, 2).map((n, i) => ({
            id: `sat-manual-${n.id}`,
            label: truncLabel(n.label.replace(/^Ngoài hệ thống:\s*/i, ''), 26),
            count: Number(Number(n.weight || 1).toFixed(1)),
            color: i === 0 ? '#34d399' : '#38bdf8',
            angleOffset: i === 0 ? -0.26 : 0.26,
            distOffset: 76,
          }))
        : [
            {
              id: 'sat-diff',
              label: avgDifficulty > 0 ? `Độ khó TB Lv ${avgDifficulty.toFixed(1)}` : 'Chưa ghi nhận khai báo ngoài',
              count: avgDifficulty > 0 ? Number(avgDifficulty.toFixed(1)) : 0,
              color: '#34d399',
              angleOffset: 0,
              distOffset: 76,
            },
          ];

    const d2Satellites =
      dbD2Nodes.length > 0
        ? dbD2Nodes.slice(0, 2).map((n, i) => ({
            id: `sat-d2-${n.id}`,
            label: truncLabel(n.label, 26),
            count: Number(Number(n.weight || 1).toFixed(1)),
            color: n.status === 'WARN' ? '#f87171' : '#22d3ee',
            angleOffset: i === 0 ? -0.24 : 0.24,
            distOffset: 78,
          }))
        : [
            {
              id: 'sat-d2-summary',
              label: reworkCount > 0 ? `Mở lại / Rework` : avgDelayDays > 0 ? 'Độ trễ TB (ngày)' : 'Đúng tiến độ Sprint',
              count: reworkCount > 0 ? reworkCount : avgDelayDays > 0 ? avgDelayDays : Math.round(onTimeRate * 100),
              color: reworkCount > 0 || avgDelayDays > 0 ? '#f87171' : '#22d3ee',
              angleOffset: 0,
              distOffset: 76,
            },
          ];

    const d3Satellites =
      dbD3Nodes.length > 0
        ? dbD3Nodes.slice(0, 2).map((n, i) => ({
            id: `sat-d3-${n.id}`,
            label: truncLabel(n.label, 26),
            count: Number(Number(n.weight || 1).toFixed(1)),
            color: i === 0 ? '#a78bfa' : '#c084fc',
            angleOffset: i === 0 ? -0.24 : 0.24,
            distOffset: 78,
          }))
        : [
            {
              id: 'sat-d3-comments',
              label: 'Thảo luận & Review hộ',
              count: commentCount + reviewForOthersCount,
              color: '#a78bfa',
              angleOffset: -0.22,
              distOffset: 76,
            },
            {
              id: 'sat-d3-support',
              label: 'Hỗ trợ đồng đội (@mention)',
              count: supportMentionCount,
              color: '#34d399',
              angleOffset: 0.24,
              distOffset: 80,
            },
          ];

    const d4Satellites =
      dbD4Nodes.length > 0
        ? dbD4Nodes.slice(0, 2).map((n, i) => ({
            id: `sat-d4-${n.id}`,
            label: truncLabel(n.label, 26),
            count: Number(Number(n.weight || 0).toFixed(1)),
            color: i === 0 ? '#f472b6' : '#ec4899',
            angleOffset: i === 0 ? -0.22 : 0.22,
            distOffset: 74,
          }))
        : [
            {
              id: 'sat-d4-status',
              label: peerUniqueReviewers >= 3 ? 'Đủ lượt ẩn danh hợp lệ' : 'Lượt chấm chéo ẩn danh (cần ≥3)',
              count: peerUniqueReviewers,
              color: '#f472b6',
              angleOffset: 0,
              distOffset: 74,
            },
          ];

    const impSatellites =
      dbImpNodes.length > 0
        ? dbImpNodes.slice(0, 2).map((n, i) => ({
            id: `sat-imp-${n.id}`,
            label: truncLabel(n.label, 26),
            count: Number(Number(n.weight || 1).toFixed(1)),
            color: '#fbbf24',
            angleOffset: i === 0 ? -0.22 : 0.22,
            distOffset: 76,
          }))
        : [
            {
              id: 'sat-imp-clear',
              label: availabilityFactor < 0.999 ? 'Bù công bằng từ khả dụng' : 'Không phát sinh rào cản',
              count: availPct,
              color: availabilityFactor < 0.999 ? '#fbbf24' : '#34d399',
              angleOffset: 0,
              distOffset: 76,
            },
          ];

    return [
      {
        id: 'hub-d1-tasks',
        label: 'D1 · Sản lượng & Thẻ',
        category: 'D1',
        percentage: Math.min(100, Math.round((finalPct ?? 0) * 100)),
        badge: `${cardsDone} Thẻ · ${totalSp} SP`,
        color: '#10b981',
        angle: -2.42,
        distance: 215,
        satellites: d1Satellites,
      },
      {
        id: 'hub-d1-manual',
        label: 'Ngoài Board & Độ khó',
        category: 'D1',
        percentage: 25,
        badge: `${manualSp} SP`,
        color: '#059669',
        angle: -1.42,
        distance: 205,
        satellites: manualSatellites,
      },
      {
        id: 'hub-d2-reliability',
        label: 'D2 · Tiến độ & Tin cậy',
        category: 'D2',
        percentage: Math.round(onTimeRate * 100),
        badge: `${Math.round(onTimeRate * 100)}% Đúng hạn`,
        color: '#06b6d4',
        angle: -0.48,
        distance: 225,
        satellites: d2Satellites,
      },
      {
        id: 'hub-d3-collab',
        label: 'D3 · Phối hợp nhóm',
        category: 'D3',
        percentage: Math.min(100, collabTotal * 15),
        badge: `${collabTotal} Tương tác`,
        color: '#8b5cf6',
        angle: 0.42,
        distance: 225,
        satellites: d3Satellites,
      },
      {
        id: 'hub-d4-peer',
        label: 'D4 · Chấm chéo ẩn danh',
        category: 'D4',
        percentage: Math.min(100, Math.round((peerAvgScore / 5) * 100)),
        badge: peerUniqueReviewers > 0 ? `${peerAvgScore.toFixed(1)}/5 ★` : '0 Lượt',
        color: '#ec4899',
        angle: 1.57,
        distance: 185,
        satellites: d4Satellites,
      },
      {
        id: 'hub-impediments',
        label: `Rào cản & Khả dụng (${dbImpNodes.length})`,
        category: 'IMPEDIMENT',
        percentage: availPct,
        badge: `a_i ${availabilityFactor.toFixed(2)}`,
        color: '#f59e0b',
        angle: 2.82,
        distance: 215,
        satellites: impSatellites,
      },
    ];
  }, [networkData?.tierBreakdown?.rawFeatures, nodes, finalPct, availabilityFactor]);

  const filteredHubs = useMemo(() => {
    if (activeFilter === 'ALL') return constellationHubs;
    return constellationHubs.filter((h) => h.category === activeFilter);
  }, [activeFilter, constellationHubs]);

  // Background star field
  const starField = useMemo<StarBg[]>(() => {
    const list: StarBg[] = [];
    for (let i = 0; i < 180; i++) {
      list.push({
        x: Math.random(),
        y: Math.random(),
        radius: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.0008 + 0.0002,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return list;
  }, []);

  // Main Canvas Render Loop (Constellation in Overview mode)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let isRunning = true;

    const render = (time: number) => {
      if (!isRunning) return;
      const t = time / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Cosmic / Clean Gradient Background according to Theme (Đồng bộ với trang Đóng góp)
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        20,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      if (isDark) {
        bgGrad.addColorStop(0, '#12141c');
        bgGrad.addColorStop(0.45, '#0b0d13');
        bgGrad.addColorStop(1, '#07090e');
      } else {
        bgGrad.addColorStop(0, '#ffffff');
        bgGrad.addColorStop(0.45, '#f8fafc');
        bgGrad.addColorStop(1, '#e2e8f0');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle Ambient Glow Auras (Đồng bộ hiệu ứng mờ ảo với trang Đóng góp)
      if (isDark) {
        const aura1 = ctx.createRadialGradient(width * 0.5, 0, 10, width * 0.5, 0, width * 0.7);
        aura1.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
        aura1.addColorStop(0.7, 'rgba(56, 189, 248, 0.01)');
        aura1.addColorStop(1, 'transparent');
        ctx.fillStyle = aura1;
        ctx.fillRect(0, 0, width, height);

        const aura2 = ctx.createRadialGradient(width * 0.85, height * 0.75, 10, width * 0.85, height * 0.75, width * 0.6);
        aura2.addColorStop(0, 'rgba(99, 102, 241, 0.07)');
        aura2.addColorStop(0.6, 'rgba(99, 102, 241, 0.01)');
        aura2.addColorStop(1, 'transparent');
        ctx.fillStyle = aura2;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Starfield & Galaxy Dust
      starField.forEach((star) => {
        const sx = star.x * width;
        const sy = (star.y * height + t * star.speed * 200) % height;
        const curAlpha = star.alpha * (0.6 + 0.4 * Math.sin(t * 1.8 + star.phase));
        if (isDark) {
          ctx.fillStyle = `rgba(180, 230, 255, ${curAlpha})`;
        } else {
          ctx.fillStyle = `rgba(14, 116, 144, ${curAlpha * 0.45})`;
        }
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // If in Detail Mode, background canvas is just space backdrop; detail DOM renders above
      if (viewMode === 'detail') {
        ctx.restore();
        animFrame = requestAnimationFrame(render);
        return;
      }

      const originX = width / 2 + (width > 960 ? 22 : 0) + transform.x;
      const originY = height / 2 - (height > 560 ? 24 : 0) + transform.y;

      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(transform.scale, transform.scale);

      // 3. Orbital Concentric Rings
      [165, 215, 265, 315].forEach((r, idx) => {
        if (isDark) {
          ctx.strokeStyle = idx % 2 === 0 ? 'rgba(70, 180, 210, 0.14)' : 'rgba(70, 180, 210, 0.07)';
        } else {
          ctx.strokeStyle = idx % 2 === 0 ? 'rgba(14, 116, 144, 0.22)' : 'rgba(14, 116, 144, 0.12)';
        }
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      const hubR = 25;
      const coreR = 46;

      interface PillBox {
        id: string;
        x: number;
        y: number;
        w: number;
        h: number;
        anchorX: number;
        anchorY: number;
        movable: boolean;
        draw: (bx: number, by: number) => void;
      }

      const pillBoxes: PillBox[] = [];
      const circleObstacles: Array<{ cx: number; cy: number; r: number }> = [
        { cx: 0, cy: 0, r: coreR + 12 },
        // Core labels obstacle
        { cx: 0, cy: coreR + 34, r: 44 },
      ];

      // 4. Beams, Satellites & Hub Circles (defer label pills to final anti-collision pass)
      filteredHubs.forEach((hub) => {
        const hx = Math.cos(hub.angle) * hub.distance;
        const hy = Math.sin(hub.angle) * hub.distance;
        circleObstacles.push({ cx: hx, cy: hy, r: hubR + 8 });

        // Gradient beam
        const grad = ctx.createLinearGradient(0, 0, hx, hy);
        if (isDark) {
          grad.addColorStop(0, 'rgba(245, 194, 100, 0.8)');
          grad.addColorStop(1, `${hub.color}88`);
        } else {
          grad.addColorStop(0, 'rgba(217, 119, 6, 0.9)');
          grad.addColorStop(1, `${hub.color}cc`);
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = isDark ? 1.8 : 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        // Traveling pulse particle along beam
        const pulseProgress = (t * 0.4 + Math.abs(hub.angle)) % 1;
        const px = hx * pulseProgress;
        const py = hy * pulseProgress;
        ctx.fillStyle = isDark ? '#ffffff' : '#b45309';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        // 5. Lines & Dots for Hub Satellites
        hub.satellites.forEach((sat) => {
          const satAngle = hub.angle + sat.angleOffset;
          const satDist = hub.distance + sat.distOffset;
          const sx = Math.cos(satAngle) * satDist;
          const sy = Math.sin(satAngle) * satDist;

          ctx.strokeStyle = isDark ? 'rgba(120, 210, 235, 0.45)' : 'rgba(15, 23, 42, 0.22)';
          ctx.lineWidth = isDark ? 1.1 : 1.3;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(sx, sy);
          ctx.stroke();

          ctx.fillStyle = sat.color;
          ctx.beginPath();
          ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Measure satellite pill and place outward from galaxy center
          ctx.font = '600 11.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const labelPart = sat.label;
          const countPart = ` (${sat.count})`;
          const labelWidth = ctx.measureText(labelPart).width;
          const countWidth = ctx.measureText(countPart).width;
          const padX = 8;
          const badgeH = 22;
          const badgeW = labelWidth + countWidth + padX * 2;

          const cosA = Math.cos(satAngle);
          const sinA = Math.sin(satAngle);
          let initX = sx + 10;
          let initY = sy - badgeH / 2;

          if (cosA <= -0.18) {
            initX = sx - 10 - badgeW;
          } else if (Math.abs(cosA) < 0.18) {
            initX = sx - badgeW / 2;
            initY = sinA < 0 ? sy - 10 - badgeH : sy + 10;
          }

          pillBoxes.push({
            id: sat.id,
            x: initX,
            y: initY,
            w: badgeW,
            h: badgeH,
            anchorX: sx,
            anchorY: sy,
            movable: true,
            draw: (bx, by) => {
              // Subtle leader line if nudged away from dot
              const cxPill = bx + badgeW / 2;
              const cyPill = by + badgeH / 2;
              const edgeX = sx < cxPill ? bx : bx + badgeW;
              if (Math.hypot(edgeX - sx, cyPill - sy) > 14) {
                ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.35)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(edgeX, cyPill);
                ctx.stroke();
              }

              ctx.fillStyle = isDark ? 'rgba(24, 24, 29, 0.95)' : 'rgba(255, 255, 255, 0.97)';
              ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.14)' : `${sat.color}aa`;
              ctx.lineWidth = 1.1;
              ctx.beginPath();
              ctx.roundRect(bx, by, badgeW, badgeH, 7);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
              ctx.font = '600 11.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(labelPart, bx + padX, cyPill);

              ctx.fillStyle = sat.color;
              ctx.font = 'bold 11.5px system-ui, -apple-system, sans-serif';
              ctx.fillText(countPart, bx + padX + labelWidth, cyPill);
            },
          });
        });

        // 6. Hub Circle Body
        const hubGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, hubR * 2.1);
        hubGlow.addColorStop(0, isDark ? `${hub.color}aa` : `${hub.color}4d`);
        hubGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = hubGlow;
        ctx.beginPath();
        ctx.arc(hx, hy, hubR * 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isDark ? '#1f1f23' : '#ffffff';
        ctx.beginPath();
        ctx.arc(hx, hy, hubR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hub.color;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // Auto-fit Hub Badge strictly inside the circle (support 2-line split on '·')
        ctx.fillStyle = isDark ? '#ffffff' : hub.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const maxInnerW = hubR * 1.68;
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        if (ctx.measureText(hub.badge).width <= maxInnerW) {
          ctx.fillText(hub.badge, hx, hy);
        } else if (hub.badge.includes('·')) {
          const [topLine, botLine] = hub.badge.split('·').map((s) => s.trim());
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(topLine, hx, hy - 6);
          ctx.fillText(botLine, hx, hy + 6);
        } else if (hub.badge.includes(' ')) {
          const spIdx = hub.badge.indexOf(' ');
          const topLine = hub.badge.slice(0, spIdx);
          const botLine = hub.badge.slice(spIdx + 1);
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(topLine, hx, hy - 6);
          ctx.fillText(botLine, hx, hy + 6);
        } else {
          ctx.font = 'bold 9.5px system-ui, -apple-system, sans-serif';
          ctx.fillText(hub.badge, hx, hy);
        }

        // Hub Label Pill (locked under its hub circle, included in collision solver)
        const hubLabel = hub.label;
        ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const hTextW = ctx.measureText(hubLabel).width;
        const hPadX = 10;
        const hBadgeH = 23;
        const hBadgeW = hTextW + hPadX * 2;
        const hBadgeX = hx - hBadgeW / 2;
        const hBadgeY = hy + hubR + 6;

        pillBoxes.push({
          id: `hub-lbl-${hub.id}`,
          x: hBadgeX,
          y: hBadgeY,
          w: hBadgeW,
          h: hBadgeH,
          anchorX: hx,
          anchorY: hy,
          movable: false,
          draw: (bx, by) => {
            ctx.fillStyle = isDark ? 'rgba(24, 24, 29, 0.95)' : 'rgba(255, 255, 255, 0.97)';
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.16)' : `${hub.color}bb`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(bx, by, hBadgeW, hBadgeH, 7);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
            ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hubLabel, bx + hBadgeW / 2, by + hBadgeH / 2);
          },
        });
      });

      // 6b. 2D Bounding-Box Collision Avoidance Solver for Movable Satellite Pills
      const gapX = 8;
      const gapY = 6;
      const minCanvasY = (-originY + 64) / Math.max(0.4, transform.scale);
      for (let iter = 0; iter < 8; iter++) {
        for (let i = 0; i < pillBoxes.length; i++) {
          const a = pillBoxes[i];
          if (!a.movable) continue;

          if (a.y < minCanvasY) {
            a.y = minCanvasY;
          }

          // Avoid Hub/Core circles
          for (const c of circleObstacles) {
            const closestX = Math.max(a.x, Math.min(c.cx, a.x + a.w));
            const closestY = Math.max(a.y, Math.min(c.cy, a.y + a.h));
            const dx = closestX - c.cx;
            const dy = closestY - c.cy;
            const dist = Math.hypot(dx, dy);
            if (dist < c.r) {
              const pushDirY = a.y + a.h / 2 >= c.cy ? 1 : -1;
              a.y += pushDirY * (c.r - dist + 6);
            }
          }

          // Avoid other pills (both hub labels & sibling satellites)
          for (let j = 0; j < pillBoxes.length; j++) {
            if (i === j) continue;
            const b = pillBoxes[j];
            const overlapX = Math.min(a.x + a.w + gapX, b.x + b.w + gapX) - Math.max(a.x, b.x);
            const overlapY = Math.min(a.y + a.h + gapY, b.y + b.h + gapY) - Math.max(a.y, b.y);
            if (overlapX > 0 && overlapY > 0) {
              const aCenterY = a.y + a.h / 2;
              const bCenterY = b.y + b.h / 2;
              const dir = aCenterY >= bCenterY ? 1 : -1;
              const stepY = b.movable ? overlapY * 0.55 : overlapY + 2;
              a.y += dir * stepY;
              if (b.movable) {
                b.y -= dir * overlapY * 0.45;
              }
            }
          }
        }
      }

      // Draw all Hub Labels & Satellite Pills cleanly ON TOP
      pillBoxes.forEach((p) => p.draw(p.x, p.y));

      // 7. Center Core Orb (Focused Member Sun)
      const coreGlow = ctx.createRadialGradient(0, 0, coreR * 0.4, 0, 0, coreR * 3.0);
      coreGlow.addColorStop(0, 'rgba(245, 194, 100, 0.9)');
      coreGlow.addColorStop(0.5, 'rgba(245, 160, 50, 0.35)');
      coreGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 3.0, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Spikes around Core
      ctx.save();
      ctx.rotate(t * 0.12);
      const spikesCount = 64;
      for (let i = 0; i < spikesCount; i++) {
        const sa = (i / spikesCount) * Math.PI * 2;
        const sl = coreR * (1.18 + 0.22 * Math.sin(i * 3.5 + t * 2));
        ctx.strokeStyle = isDark ? 'rgba(255, 220, 140, 0.75)' : 'rgba(217, 119, 6, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * coreR * 1.02, Math.sin(sa) * coreR * 1.02);
        ctx.lineTo(Math.cos(sa) * sl, Math.sin(sa) * sl);
        ctx.stroke();
      }
      ctx.restore();

      // Core Spherical Gradient
      const coreGrad = ctx.createRadialGradient(-coreR * 0.3, -coreR * 0.3, 2, 0, 0, coreR);
      coreGrad.addColorStop(0, '#fff6db');
      coreGrad.addColorStop(0.35, '#f5c264');
      coreGrad.addColorStop(0.8, '#b87020');
      coreGrad.addColorStop(1, '#5a2e06');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 235, 180, 0.85)';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Core Titles with High-Contrast Pill
      const userName = focusedUserName || 'Thành viên';
      ctx.font = 'bold 14.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const uTextW = ctx.measureText(userName).width;
      const uPadX = 12;
      const uBadgeH = 26;
      const uBadgeW = uTextW + uPadX * 2;
      const uBadgeY = coreR + 24 - uBadgeH / 2;

      ctx.fillStyle = isDark ? 'rgba(31, 31, 35, 0.94)' : 'rgba(255, 255, 255, 0.96)';
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(217, 119, 6, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-uBadgeW / 2, uBadgeY, uBadgeW, uBadgeH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(userName, 0, coreR + 24);

      const sprintShort = sprintName ? sprintName.split(':')[0].split('-')[0].trim() : 'Sprint hiện tại';
      const coreSubtitle = `${resolvedProjectName} · ${sprintShort}`;
      ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isDark ? '#fcd34d' : '#b45309';
      ctx.fillText(coreSubtitle, 0, coreR + 46);

      ctx.restore();

      // 8. Left Vertical Sprint & Week Timeline Rail (Synced from MariaDB, chronological order)
      const railX = 28;
      const waveStartX = 14;

      ctx.save();
      ctx.strokeStyle = isDark ? 'rgba(120, 200, 220, 0.22)' : 'rgba(14, 116, 144, 0.22)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      const waveSteps = 60;
      for (let s = 0; s <= waveSteps; s++) {
        const sy = (s / waveSteps) * height;
        const amp = Math.sin(s * 0.8 + t * 2) * 4 + Math.sin(s * 2.2 - t * 1.5) * 2.5;
        const wx = waveStartX + amp;
        if (s === 0) ctx.moveTo(wx, sy);
        else ctx.lineTo(wx, sy);
      }
      ctx.stroke();

      // Chronological Sprint & Week Nodes positioned cleanly above the Bottom-Left Legend Card
      const { railStartY, railSpacing } = getSprintRailLayout(height, orderedSprints.length, isLegendCollapsed);

      if (orderedSprints.length > 1) {
        const railEndY = railStartY + (orderedSprints.length - 1) * railSpacing;
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(14, 116, 144, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(railX, railStartY);
        ctx.lineTo(railX, railEndY);
        ctx.stroke();
      }

      orderedSprints.forEach((sp, idx) => {
        const sy = railStartY + idx * railSpacing;
        const isCurrent = selectedSprintId != null ? sp.id === selectedSprintId : Boolean(sp.isCurrent || sp.status === 'ACTIVE');
        const subText = sp.dateRangeLabel ? `${sp.weekLabel} · ${sp.dateRangeLabel}` : sp.weekLabel;

        // Node dot on the timeline spine
        ctx.fillStyle = isCurrent
          ? (isDark ? '#f5c264' : '#d97706')
          : (isDark ? '#38bdf8' : '#0284c7');
        ctx.beginPath();
        ctx.arc(railX, sy, isCurrent ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isDark ? '#0b0d13' : '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Capsule card for Sprint + Week label
        const capX = railX + 12;
        const capW = isCurrent ? 156 : 148;
        const capH = isCurrent ? 40 : 34;
        const capY = sy - capH / 2;

        ctx.fillStyle = isCurrent
          ? (isDark ? 'rgba(31, 31, 35, 0.96)' : 'rgba(255, 255, 255, 0.98)')
          : (isDark ? 'rgba(24, 24, 27, 0.78)' : 'rgba(255, 255, 255, 0.85)');
        ctx.strokeStyle = isCurrent
          ? (isDark ? 'rgba(245, 194, 100, 0.9)' : 'rgba(217, 119, 6, 0.85)')
          : (isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(15, 23, 42, 0.14)');
        ctx.lineWidth = isCurrent ? 1.8 : 1.0;
        ctx.beginPath();
        ctx.roundRect(capX, capY, capW, capH, 11);
        ctx.fill();
        ctx.stroke();

        // Sprint Title
        ctx.fillStyle = isCurrent
          ? (isDark ? '#ffdf99' : '#b45309')
          : (isDark ? '#e2e8f0' : '#1e293b');
        ctx.font = isCurrent ? 'bold 12px system-ui, -apple-system, sans-serif' : '600 11.5px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(sp.shortTitle, capX + 10, sy - 7);

        // Status tag on current capsule
        if (isCurrent) {
          ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.14)';
          ctx.beginPath();
          ctx.roundRect(capX + capW - 54, sy - 14, 46, 14, 7);
          ctx.fill();
          ctx.fillStyle = isDark ? '#34d399' : '#059669';
          ctx.font = 'bold 8.5px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Đang xem', capX + capW - 31, sy - 7);
        }

        // Week + Date range subtitle
        ctx.fillStyle = isCurrent
          ? (isDark ? '#cbd5e1' : '#475569')
          : (isDark ? '#94a3b8' : '#64748b');
        ctx.font = '500 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(subText, capX + 10, sy + 8);

        // Connector tick from active pill toward canvas
        if (isCurrent) {
          ctx.strokeStyle = isDark ? 'rgba(245, 194, 100, 0.45)' : 'rgba(217, 119, 6, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(capX + capW, sy);
          ctx.lineTo(capX + capW + 18, sy);
          ctx.stroke();
        }
      });
      ctx.restore();

      ctx.restore(); // restore dpr scale
      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrame);
    };
  }, [transform, filteredHubs, starField, viewMode, focusedUserName, resolvedProjectName, sprintName, orderedSprints, selectedSprintId, isDark, isLegendCollapsed]);

  // Handle Resize for canvas with HiDPI support
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset transform when switching viewMode
  useEffect(() => {
    setTransform({ scale: 1.0, x: 0, y: 0 });
    setIsDragging(false);
  }, [viewMode]);

  // Pan Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode === 'detail') return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || viewMode === 'detail') return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch Pan Overview Canvas
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (viewMode === 'detail' || e.touches.length !== 1) return;
    const t = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = { x: t.clientX - transform.x, y: t.clientY - transform.y };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || viewMode === 'detail' || e.touches.length !== 1) return;
    const t = e.touches[0];
    setTransform((prev) => ({
      ...prev,
      x: t.clientX - dragStartRef.current.x,
      y: t.clientY - dragStartRef.current.y,
    }));
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Pan Detail View (khi kéo thả trên vùng trống chi tiết)
  const handleDetailMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], input, select, a, textarea')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleDetailMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handleDetailMouseUp = () => setIsDragging(false);

  const handleDetailTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], input, select, a, textarea')) return;
    const t = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = { x: t.clientX - transform.x, y: t.clientY - transform.y };
  };

  const handleDetailTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    setTransform((prev) => ({
      ...prev,
      x: t.clientX - dragStartRef.current.x,
      y: t.clientY - dragStartRef.current.y,
    }));
  };

  // Zoom Canvas
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (viewMode === 'detail') return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.5, prev.scale * zoomFactor)),
    }));
  };

  const handleZoom = (type: 'in' | 'out' | 'fit') => {
    if (type === 'in') setTransform((prev) => ({ ...prev, scale: Math.min(2.5, prev.scale * 1.2) }));
    if (type === 'out') setTransform((prev) => ({ ...prev, scale: Math.max(0.4, prev.scale / 1.2) }));
    if (type === 'fit') setTransform({ scale: 1.0, x: 0, y: 0 });
  };

  // Canvas Click: Hit check on hubs or center orb to transition to detail
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || viewMode === 'detail') return;
    const rect = canvas.getBoundingClientRect();

    // Check hit on sprint/week rail
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    if (screenX >= 14 && screenX <= 205 && onSelectSprint && orderedSprints.length > 0) {
      const { railStartY, railSpacing } = getSprintRailLayout(rect.height, orderedSprints.length, isLegendCollapsed);
      const clickedIdx = railSpacing > 0 ? Math.round((screenY - railStartY) / railSpacing) : 0;
      const targetY = railStartY + clickedIdx * railSpacing;
      if (
        clickedIdx >= 0 &&
        clickedIdx < orderedSprints.length &&
        Math.abs(screenY - targetY) <= 24
      ) {
        onSelectSprint(orderedSprints[clickedIdx].id);
        return;
      }
    }

    const originX = rect.width / 2 + (rect.width > 960 ? 22 : 0) + transform.x;
    const originY = rect.height / 2 - (rect.height > 560 ? 24 : 0) + transform.y;
    const px = e.clientX - rect.left - originX;
    const py = e.clientY - rect.top - originY;
    const scaledX = px / transform.scale;
    const scaledY = py / transform.scale;

    // Check hit on center core orb -> zoom into detail
    if (Math.hypot(scaledX, scaledY) < 55) {
      onSwitchViewMode?.('detail');
      return;
    }

    // Check hit on any hub
    for (const hub of filteredHubs) {
      const hx = Math.cos(hub.angle) * hub.distance;
      const hy = Math.sin(hub.angle) * hub.distance;
      if (Math.hypot(scaledX - hx, scaledY - hy) < 34) {
        const matched = nodes.find((n) => n.id.includes(hub.category.toLowerCase())) || nodes[0];
        if (matched) {
          onSelectNode(matched);
        }
        if (hub.category.startsWith('D')) {
          setSelectedAxis(hub.category as 'D1' | 'D2' | 'D3' | 'D4');
        } else if (hub.category === 'IMPEDIMENT') {
          setSelectedAxis('IMP');
        }
        onSwitchViewMode?.('detail');
        return;
      }
    }
  };

  // Build local TCREI fallback when offline or in isolated unit tests
  const buildLocalTcreiFallback = useCallback(
    (questionText: string): { answer: string; tcrei: TcreiPromptBreakdown; followUps: string[] } => {
      const q = questionText.toLowerCase();
      const currentName = networkData?.focusedUserName || focusedUserName || 'Thành viên';
      const pctNum = (networkData?.finalPct ?? finalPct ?? 0) * 100;
      const pctStr = `${pctNum.toFixed(1)}%`;
      const ciNum = networkData?.compositeScore ?? compositeScore ?? 0;
      const scoreStr = `${ciNum.toFixed(1)}/100`;
      const deltaStr = `${(networkData?.distanceToCenter ?? distanceToCenter ?? 0).toFixed(2)}`;
      const aiVal = networkData?.availabilityFactor ?? availabilityFactor ?? 1.0;
      const d1 = networkData?.d1Output ?? 0;
      const d2 = networkData?.d2Reliability ?? 0;
      const d3 = networkData?.d3Collaboration ?? 0;
      const d4 = networkData?.d4Peer ?? 0;

      const tcrei: TcreiPromptBreakdown = {
        task: '[T - Task] FairShare AI Copilot giải đáp chính xác về điểm số, cách tính 4 tầng, tổng quan nhóm và dự án đảm nhận.',
        context: `[C - Context] ${currentName} · ${sprintName} · p_i=${pctStr}, C_i=${scoreStr}, δ_i=${deltaStr}, a_i=${aiVal.toFixed(2)}`,
        reference: '[R - Reference] Tầng 1 (Vector thô) -> Tầng 2 (ln(1+x) & Robust MAD) -> Tầng 3 (D1 40%, D2 20%, D3 15%, D4 25%) -> Tầng 4 (Bù khả dụng & Logistic Sigmoid).',
        evaluate: '[E - Evaluate] Đối chiếu khớp 100% số liệu mạng lưới & cung cấp gợi ý hành động cụ thể.',
        iterate: `[I - Iterate] Duy trì ngữ cảnh hội thoại cho câu hỏi: "${questionText}"`,
      };

      let answer = '';
      if (q.includes('cách tính') || q.includes('tính điểm') || q.includes('công thức') || q.includes('4 tầng')) {
        answer =
          `📐 **Cách tính điểm 4 tầng của ${currentName}:**\n` +
          `• **Tầng 1–2:** Nén ` + '`ln(1+x)`' + ` & chuẩn hóa Robust MAD trên nhóm.\n` +
          `• **Tầng 3 (4 trục):** D1 Sản lượng \`${d1 >= 0 ? '+' : ''}${d1.toFixed(2)}\` (40%), D2 Tin cậy \`${d2 >= 0 ? '+' : ''}${d2.toFixed(2)}\` (20%), D3 Phối hợp \`${d3 >= 0 ? '+' : ''}${d3.toFixed(2)}\` (15%), D4 Chấm chéo \`${d4 >= 0 ? '+' : ''}${d4.toFixed(2)}\` (25%).\n` +
          `• **Tầng 4:** Bù khả dụng \`a_i = ${aiVal.toFixed(2)}\` và hàm Sigmoid cho **C_i = ${scoreStr}**, tỷ lệ **p_i = ${pctStr}**.`;
      } else if (q.includes('dự án') || q.includes('đảm nhận') || q.includes('task') || q.includes('công việc')) {
        const d1Tasks = memberEvents.filter((e) => e.axis === 'D1').slice(0, 3);
        const taskLines = d1Tasks.map((t) => `  - ${t.title} (${t.src})`).join('\n');
        answer =
          `📁 **Dự án & công việc đảm nhận (${sprintName}):**\n` +
          `• Thành viên: **${currentName}** · Tổng số sự kiện ghi nhận: **${memberEvents.length}**\n` +
          (taskLines ? `• Công việc tiêu biểu:\n${taskLines}` : '• Đang đồng bộ dữ liệu thẻ Kanban từ hệ thống.');
      } else if (q.includes('tổng quát') || q.includes('nhóm') || q.includes('cao nhất') || q.includes('dẫn đầu')) {
        answer =
          `🏆 **Tổng quát nhóm (${sprintName}):**\n` +
          `• Thành viên đang quan sát **${currentName}** đạt **p_i = ${pctStr}** (**C_i = ${scoreStr}**).\n` +
          `• Toàn nhóm gồm **${members.length} thành viên** đánh giá đồng thời trên 4 trục D1–D4.`;
      } else {
        answer =
          `📊 **Điểm số của ${currentName} (${sprintName}):**\n` +
          `• Đóng góp **p_i = ${pctStr}** | Sigmoid **C_i = ${scoreStr}** | Khoảng cách tâm **δ_i = ${deltaStr}** | Khả dụng **a_i = ${(aiVal * 100).toFixed(0)}%**.\n` +
          `• Vector 4 trục: D1 \`${d1.toFixed(2)}\` · D2 \`${d2.toFixed(2)}\` · D3 \`${d3.toFixed(2)}\` · D4 \`${d4.toFixed(2)}\`.`;
      }

      return {
        answer,
        tcrei,
        followUps: [
          'Cách tính điểm Mô hình 4 tầng?',
          'Tổng quát bảng điểm cả nhóm?',
          'Công việc dự án đang đảm nhận?',
        ],
      };
    },
    [networkData, focusedUserName, finalPct, compositeScore, distanceToCenter, availabilityFactor, sprintName, memberEvents, members.length]
  );

  // Send question to AI Chatbox Backend (TCREI + Gemini API)
  const sendAiQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isAiLoading) return;

    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const historySnapshot = chatMessages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setIsChatOpen(true);
    setChatMessages((prev) => [...prev, userMsg]);
    setQuestionInput('');
    setIsAiLoading(true);

    try {
      if (typeof contributionApi?.askAiChat === 'function') {
        const res = await contributionApi.askAiChat({
          teamId: teamId || networkData?.teamId || 1,
          sprintId: selectedSprintId ?? networkData?.sprintId ?? null,
          focusedUserId: selectedUserId ?? networkData?.focusedUserId ?? null,
          question: trimmed,
          previousInteractionId,
          history: historySnapshot,
        });
        const data = res?.data;
        if (data && data.answer) {
          setPreviousInteractionId(data.interactionId || null);
          if (data.tcrei) setLatestTcrei(data.tcrei);
          if (Array.isArray(data.suggestedFollowUps) && data.suggestedFollowUps.length > 0) {
            setSuggestedFollowUps(data.suggestedFollowUps);
          }
          const assistantMsg: AiChatMessage = {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: data.answer,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            modelUsed: data.modelUsed,
            liveGeminiUsed: data.liveGeminiUsed,
            tcrei: data.tcrei,
            suggestedFollowUps: data.suggestedFollowUps,
          };
          setChatMessages((prev) => [...prev, assistantMsg]);
          return;
        }
      }
      throw new Error('Fallback to local TCREI');
    } catch {
      const fb = buildLocalTcreiFallback(trimmed);
      setLatestTcrei(fb.tcrei);
      setSuggestedFollowUps(fb.followUps);
      const assistantMsg: AiChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: fb.answer,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'fairshare-tcrei-local',
        liveGeminiUsed: false,
        tcrei: fb.tcrei,
        suggestedFollowUps: fb.followUps,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Ask Submit
  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendAiQuestion(questionInput);
  };

  // Reset AI Nhận xét nhóm khi đổi Team / Sprint / Thành viên
  useEffect(() => {
    setTeamAiReview(null);
  }, [teamId, selectedSprintId, selectedUserId]);

  const buildLocalTeamReviewFallback = useCallback(() => {
    const currentName = networkData?.focusedUserName || focusedUserName || 'Thành viên';
    const pctNum = (networkData?.finalPct ?? finalPct ?? 0) * 100;
    const ciNum = networkData?.compositeScore ?? compositeScore ?? 0;
    const aiVal = networkData?.availabilityFactor ?? availabilityFactor ?? 1.0;
    const d1 = networkData?.d1Output ?? 0;
    const d2 = networkData?.d2Reliability ?? 0;
    const d3 = networkData?.d3Collaboration ?? 0;
    const d4 = networkData?.d4Peer ?? 0;

    const availabilityNote =
      aiVal < 0.999
        ? `Hệ số khả dụng **a_i = ${(aiVal * 100).toFixed(0)}%** — đã kích hoạt cơ chế bù khả dụng \`D' = D·(1 + 0.5(1 - ${aiVal.toFixed(2)}))\` để bảo vệ quyền lợi.`
        : `**100% khả dụng tối đa (\`a_i = 100%\`)** — không phát sinh rào cản ngoại cảnh cần bù điểm.`;

    return (
      `✨ **Nhận xét tổng thể nhóm (${sprintName} · ${members.length} thành viên):**\n` +
      `• **Thành viên đang quan sát (${currentName}):** Tỷ lệ đóng góp **p_i = ${pctNum.toFixed(1)}%**, điểm Sigmoid **C_i = ${ciNum.toFixed(1)}/100**.\n` +
      `• **Sức khỏe 4 trục:** D1 \`${d1 >= 0 ? '+' : ''}${d1.toFixed(2)}\` · D2 \`${d2 >= 0 ? '+' : ''}${d2.toFixed(2)}\` · D3 \`${d3 >= 0 ? '+' : ''}${d3.toFixed(2)}\` · D4 \`${d4 >= 0 ? '+' : ''}${d4.toFixed(2)}\`.\n` +
      `• **Khả dụng & Rào cản:** ${availabilityNote}`
    );
  }, [networkData, focusedUserName, finalPct, compositeScore, availabilityFactor, sprintName, members.length]);

  const TEAM_REVIEW_PROMPT =
    'Hãy nhận xét và đánh giá tổng thể tình hình nhóm, phân bố đóng góp các thành viên, tiến độ công việc, hệ số khả dụng và đề xuất cải thiện trong Sprint hiện tại.';

  const generateTeamAiReview = async () => {
    if (isTeamAiReviewLoading) return;
    setIsTeamAiReviewLoading(true);
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    try {
      if (typeof contributionApi?.askAiChat === 'function') {
        const res = await contributionApi.askAiChat({
          teamId: teamId || networkData?.teamId || 1,
          sprintId: selectedSprintId ?? networkData?.sprintId ?? null,
          focusedUserId: selectedUserId ?? networkData?.focusedUserId ?? null,
          question: TEAM_REVIEW_PROMPT,
          previousInteractionId,
          history: [],
        });
        const data = res?.data;
        if (data && data.answer) {
          setTeamAiReview({
            content: data.answer,
            modelUsed: data.modelUsed,
            liveGeminiUsed: data.liveGeminiUsed,
            timestamp: nowTime,
            tcrei: data.tcrei,
            followUps: data.suggestedFollowUps,
          });
          return;
        }
      }
      throw new Error('Fallback to local team review');
    } catch {
      setTeamAiReview({
        content: buildLocalTeamReviewFallback(),
        modelUsed: 'fairshare-tcrei-local',
        liveGeminiUsed: false,
        timestamp: nowTime,
      });
    } finally {
      setIsTeamAiReviewLoading(false);
    }
  };

  const handleToggleAiInsightCard = () => {
    setShowAiCard((prev) => {
      const next = !prev;
      if (next && !teamAiReview) {
        void generateTeamAiReview();
      }
      return next;
    });
  };

  const handleContinueReviewInChat = () => {
    if (!teamAiReview) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `u-rev-${Date.now()}`,
        role: 'user',
        content: 'Nhận xét và đánh giá tổng thể tình hình nhóm hiện tại',
        timestamp: teamAiReview.timestamp,
      },
      {
        id: `a-rev-${Date.now() + 1}`,
        role: 'assistant',
        content: teamAiReview.content,
        timestamp: teamAiReview.timestamp,
        modelUsed: teamAiReview.modelUsed,
        liveGeminiUsed: teamAiReview.liveGeminiUsed,
        tcrei: teamAiReview.tcrei,
        suggestedFollowUps: teamAiReview.followUps,
      },
    ]);
    if (teamAiReview.tcrei) setLatestTcrei(teamAiReview.tcrei);
    if (teamAiReview.followUps && teamAiReview.followUps.length > 0) {
      setSuggestedFollowUps(teamAiReview.followUps);
    }
    setIsChatOpen(true);
    setShowAiCard(false);
  };

  // ==========================================
  // Layout Calculations for Detail Neuron View
  // ==========================================
  const w = stageDimensions.width;
  const h = stageDimensions.height;
  const ox = Math.min(140, Math.max(96, w * 0.14));
  const oy = h * 0.48;
  const ch = Math.max(58, Math.min(74, (h - 210) / 5 - 12));
  const gap = Math.max(10, Math.min(20, (h - 210 - ch * 5) / 4));
  const catL = ox + Math.max(132, Math.min(165, w * 0.16));
  const catW = Math.max(162, Math.min(200, w * 0.22));
  const xL = catL + catW + Math.max(48, Math.min(92, w * 0.08));
  const itemW = Math.max(230, Math.min(360, w - xL - 28));
  const curve = Math.max(22, Math.min(50, w * 0.05));

  const totalCatH = ch * 5 + gap * 4;
  const catYPositions = useMemo(() => {
    return DETAIL_AXES.map((_, i) => oy - totalCatH / 2 + i * (ch + gap) + ch / 2);
  }, [oy, totalCatH, ch, gap]);

  const activeCatIndex = DETAIL_AXES.findIndex((a) => a.id === selectedAxis);
  const activeCatY = catYPositions[activeCatIndex >= 0 ? activeCatIndex : 0] || oy;
  const activeAxisMeta = DETAIL_AXES[activeCatIndex >= 0 ? activeCatIndex : 0];

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-slate-50 dark:bg-[#07090e] transition-colors duration-300">
      {/* 1. Full Screen Canvas (Constellation in Overview mode / Dimmed galaxy background in Detail mode) */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block transition-all duration-700 ${
          viewMode === 'detail' ? 'opacity-20 filter blur-sm scale-110 pointer-events-none' : 'opacity-100 cursor-grab active:cursor-grabbing touch-none'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      />

      {/* 2. Top Floating Toolbar + Simulation / Impact CTA */}
      <div className="pointer-events-none absolute top-3 inset-x-0 z-30 px-2 sm:px-14 flex flex-wrap items-center justify-center gap-2">
        <div className="pointer-events-auto flex items-center justify-start sm:justify-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-2xl bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 shadow-xl text-zinc-700 dark:text-zinc-300 max-w-full overflow-x-auto scrollbar-none">
        <button
          type="button"
          title="Sơ đồ tổng quan (Overview Galaxy)"
          onClick={() => onSwitchViewMode?.('overview')}
          className={`p-2 rounded-xl transition ${
            viewMode === 'overview'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-[0_0_15px_rgba(245,194,100,0.3)]'
              : 'hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Network className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Chi tiết neuron (Neuron Detail)"
          onClick={() => onSwitchViewMode?.('detail')}
          className={`p-2 rounded-xl transition ${
            viewMode === 'detail'
              ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              : 'hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <GitBranch className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-zinc-200 dark:bg-white/10 mx-1" />

        <button
          type="button"
          title="Phóng to (+)"
          onClick={() => handleZoom('in')}
          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Thu nhỏ (-)"
          onClick={() => handleZoom('out')}
          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Vừa khung nhìn"
          onClick={() => handleZoom('fit')}
          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-zinc-200 dark:bg-white/10 mx-1" />

        <button
          type="button"
          title="Bộ lọc trục tác động"
          onClick={() => setShowFilterMenu((prev) => !prev)}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition ${
            activeFilter !== 'ALL'
              ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40'
              : 'hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
          <span className="text-[11px] font-mono bg-cyan-500/15 px-1.5 py-0.2 rounded-full text-cyan-600 dark:text-cyan-300">
            {activeFilter === 'ALL' ? '5' : '1'}
          </span>
        </button>

        <button
          type="button"
          title="Sắp xếp phân cấp"
          onClick={() => {
            const next = activeFilter === 'ALL' ? 'D1' : activeFilter === 'D1' ? 'D2' : 'ALL';
            onSelectFilter?.(next);
          }}
          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 transition"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="AI Nhận xét nhóm"
          onClick={handleToggleAiInsightCard}
          className={`p-2 rounded-xl transition ${
            showAiCard
              ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'hover:bg-zinc-100 dark:hover:bg-white/10 text-purple-600 dark:text-purple-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </button>

          {viewMode === 'overview' && (
            <button
              type="button"
              title="Chú thích mô hình"
              onClick={() => setShowMobileLegend((prev) => !prev)}
              className={`lg:hidden p-2 rounded-xl transition ${
                showMobileLegend
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Simulation / Impact Button */}
        <div className="pointer-events-auto lg:absolute lg:right-6 lg:top-0 flex items-center shrink-0">
          <button
            type="button"
            data-testid="btn-open-impact-modal"
            onClick={onOpenImpactModal}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center gap-1.5 transition transform hover:-translate-y-0.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Khai báo rào cản</span>
          </button>
        </div>
      </div>

      {/* Filter Dropdown */}
      {showFilterMenu && (
        <div className="absolute top-24 sm:top-16 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 rounded-2xl p-2 shadow-2xl flex flex-wrap gap-1.5 w-[min(360px,calc(100vw-24px))]">
          {['ALL', 'D1', 'D2', 'D3', 'D4', 'IMPEDIMENT'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                onSelectFilter?.(cat);
                setShowFilterMenu(false);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                activeFilter === cat
                  ? 'bg-cyan-500 text-white dark:text-zinc-900 font-bold'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-[#18181b] dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-transparent dark:border-white/5'
              }`}
            >
              {cat === 'ALL'
                ? 'Tất cả các trục'
                : cat === 'D1'
                ? 'D1: Sản lượng'
                : cat === 'D2'
                ? 'D2: Tin cậy'
                : cat === 'D3'
                ? 'D3: Phối hợp'
                : cat === 'D4'
                ? 'D4: Chấm chéo'
                : 'Rào cản'}
            </button>
          ))}
        </div>
      )}

      {/* AI Insight Flyout Panel (TCREI + Gemini Auto Group Review) */}
      {showAiCard && (
        <div
          className="absolute top-16 right-4 sm:right-6 z-40 w-[min(390px,calc(100vw-24px))] p-4 rounded-2xl bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 shadow-2xl text-xs space-y-2.5 text-zinc-800 dark:text-zinc-200 animate-in fade-in"
          data-testid="ai-team-review-panel"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI NHẬN XÉT NHÓM</span>
              {teamAiReview && (
                <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-400/30">
                  {teamAiReview.liveGeminiUsed ? `Gemini · ${teamAiReview.modelUsed}` : 'TCREI · MariaDB'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Phân tích lại nhận xét nhóm"
                disabled={isTeamAiReviewLoading}
                onClick={() => void generateTeamAiReview()}
                className="p-1 rounded-lg text-purple-600 dark:text-purple-300 hover:bg-purple-500/10 disabled:opacity-50 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTeamAiReviewLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                aria-label="Đóng nhận xét nhóm"
                onClick={() => setShowAiCard(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isTeamAiReviewLoading ? (
            <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-[#18181b] border border-purple-200/70 dark:border-white/10 flex items-center gap-2.5 text-purple-700 dark:text-purple-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Đang tổng hợp bảng điểm, tiến độ Kanban & nhận xét nhóm theo chuẩn TCREI...</span>
            </div>
          ) : teamAiReview ? (
            <>
              <div
                className="p-3 rounded-xl bg-purple-50/60 dark:bg-[#18181b] border-l-2 border-purple-500 leading-relaxed text-[11.5px] max-h-64 overflow-y-auto space-y-1 select-text"
                style={{ scrollbarWidth: 'thin' }}
              >
                {teamAiReview.content.split('\n').map((line, idx) => (
                  <div key={idx} className={line.trim().startsWith('•') || line.trim().startsWith('-') ? 'pl-1' : ''}>
                    {renderInlineFormatted(line)}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-0.5 text-[10.5px]">
                <span className="text-zinc-400 font-mono">Cập nhật lúc {teamAiReview.timestamp}</span>
                <button
                  type="button"
                  onClick={handleContinueReviewInChat}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Bot className="w-3 h-3" />
                  <span>Tiếp tục hỏi trong AI Chatbox →</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181b] text-zinc-500 dark:text-zinc-400">
              Bấm biểu tượng làm mới để AI phân tích tình hình nhóm hiện tại.
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          DETAIL NEURON STAGE (Active when viewMode === 'detail')
          ======================================================== */}
      {viewMode === 'detail' && (
        <div
          ref={detailAreaRef}
          className={`absolute inset-0 pointer-events-auto z-20 overflow-hidden text-slate-800 dark:text-slate-100 ${
            isDragging ? 'cursor-grabbing' : 'cursor-default'
          }`}
          onMouseDown={handleDetailMouseDown}
          onMouseMove={handleDetailMouseMove}
          onMouseUp={handleDetailMouseUp}
          onMouseLeave={handleDetailMouseUp}
          onTouchStart={handleDetailTouchStart}
          onTouchMove={handleDetailTouchMove}
          onTouchEnd={handleDetailMouseUp}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
              setTransform((prev) => ({
                ...prev,
                scale: Math.max(0.4, Math.min(2.5, prev.scale * zoomFactor)),
              }));
              return;
            }
            if (axisEvents.length <= 5) return;
            setItemFocus((prev) => Math.max(0, Math.min(axisEvents.length - 1, prev + (e.deltaY > 0 ? 1 : -1))));
          }}
        >
          {/* Top-Left Breadcrumbs */}
          <div className="absolute top-4 left-6 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#1f1f23]/90 backdrop-blur-md border border-zinc-200/90 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 shadow-lg">
            <button
              type="button"
              onClick={() => onSwitchViewMode?.('overview')}
              className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-white font-semibold transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Tổng quan</span>
            </button>
            <span className="text-zinc-400 dark:text-zinc-500">/</span>
            <strong className="text-zinc-900 dark:text-zinc-200">{focusedUserName}</strong>
            <span className="text-zinc-400 dark:text-zinc-500">/</span>
            <span style={{ color: activeAxisMeta.color }} className="font-semibold">
              {activeAxisMeta.name}
            </span>
          </div>

          {/* Zoomable & Pannable Diagram Stage */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: `${w * 0.35}px ${oy}px`,
              transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* SVG Connector Beams (Orb -> Categories -> Events) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <radialGradient id="orbGlowGrad" cx="35%" cy="32%">
                <stop offset="0%" stopColor="#efe6ff" />
                <stop offset="45%" stopColor="#8f70f2" />
                <stop offset="100%" stopColor="#251660" />
              </radialGradient>
            </defs>

            {/* 1. Curved lines from Orb to 5 Category Cards */}
            {DETAIL_AXES.map((axis, idx) => {
              const x1 = ox + 76;
              const y1 = oy - 28;
              const x2 = catL;
              const y2 = catYPositions[idx];
              const d = `M ${x1} ${y1} C ${x1 + 65} ${y1}, ${x2 - 65} ${y2}, ${x2} ${y2}`;
              const isSelected = axis.id === selectedAxis;

              return (
                <g key={axis.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={isSelected ? '#f5c264' : '#7fdcef'}
                    strokeWidth={isSelected ? 5 : 2.5}
                    style={{ opacity: isSelected ? (isDark ? 0.35 : 0.5) : (isDark ? 0.08 : 0.18) }}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={isSelected ? '#f5d58a' : '#0891b2'}
                    strokeWidth={isSelected ? 1.8 : 1.1}
                    style={{ opacity: isSelected ? 0.95 : 0.4 }}
                  />
                </g>
              );
            })}

            {/* 2. Radiant Fiber Lines from Active Category to Event Cards */}
            {axisEvents.map((ev, idx) => {
              const dIdx = idx - itemFocus;
              const ad = Math.abs(dIdx);
              if (ad > 5) return null;

              const step = Math.max(60, Math.min(70, (h - 210) / 7));
              const ey = oy + dIdx * step;
              const ex = xL + curve * (1 - Math.pow(Math.min(1, ad / 5), 2)) + 6;
              const sx = catL + catW;
              const sy = activeCatY;
              const mx = (sx + ex) / 2;
              const d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`;
              const isEventSelected = selectedEvent?.id === ev.id;
              const opacity = Math.max(0.1, 1 - Math.pow(ad / 5, 2));

              return (
                <g key={ev.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={activeAxisMeta.color}
                    strokeWidth={isEventSelected ? 5 : 3}
                    style={{ opacity: opacity * 0.25 }}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={isEventSelected ? '#f59e0b' : activeAxisMeta.color}
                    strokeWidth={isEventSelected ? 2.0 : 1.2}
                    style={{ opacity: opacity * (isEventSelected ? 1 : 0.8) }}
                  />
                  {isEventSelected && (
                    <path
                      d={d}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      className="neuron-flow-anim"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Central Pulsating Orb Component */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${ox}px`, top: `${oy - 28}px` }}
          >
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 200">
                {/* Spikes corona */}
                <g className="neuron-spikes-anim" stroke="#8b5cf6" strokeOpacity="0.75" strokeWidth="1">
                  {Array.from({ length: 80 }).map((_, i) => {
                    const angle = (i / 80) * Math.PI * 2;
                    const len = 64 + (Math.sin(i * 1.7) + 2) * 6;
                    return (
                      <line
                        key={i}
                        x1={100 + Math.cos(angle) * 54}
                        y1={100 + Math.sin(angle) * 54}
                        x2={100 + Math.cos(angle) * len}
                        y2={100 + Math.sin(angle) * len}
                      />
                    );
                  })}
                </g>
                {/* Dashed outer orbit ring */}
                <circle
                  className="neuron-ring-anim"
                  cx="100"
                  cy="100"
                  r="74"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeOpacity="0.4"
                  strokeDasharray="2 7"
                />
                {/* Glowing Core Sphere */}
                <circle cx="100" cy="100" r="48" fill="url(#orbGlowGrad)" />
                <circle cx="100" cy="100" r="48" fill="none" stroke="#e1d6ff" strokeOpacity="0.5" />
                <text
                  x="100"
                  y="107"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  fontSize="22"
                  fill="#ffffff"
                  fillOpacity="0.95"
                >
                  {initials}
                </text>
              </svg>
            </div>

            {/* Orb Member Labels */}
            <div className="mt-2 text-center w-56 mx-auto">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                <span className="block truncate">{resolvedProjectName}</span>
                <span className="text-amber-600 dark:text-amber-300 font-extrabold block truncate">{focusedUserName}</span>
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{resolvedUserRole}</p>

              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-cyan-500/25 text-[11px] font-mono text-cyan-700 dark:text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span>p = {((finalPct ?? 0) * 100).toFixed(1)}% · C_i = {(compositeScore ?? 0).toFixed(1)}</span>
              </div>

              {/* Member Selector Dropdown — Custom Beautiful */}
              <div className="mt-2.5 relative flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowMemberDropdown((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold shadow-sm w-full max-w-[210px] select-none cursor-pointer ${
                    showMemberDropdown
                      ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/25 bg-white dark:bg-[#222632] text-zinc-950 dark:text-white'
                      : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#1c1f28] hover:bg-zinc-100 dark:hover:bg-[#262a36] hover:border-slate-400 dark:hover:border-white/35 text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  {/* Avatar initials */}
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 shadow-xs"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#06b6d4)', color: '#fff' }}
                  >
                    {(activeMemberObj?.fullName || focusedUserName || 'U')
                      .split(' ')
                      .filter(Boolean)
                      .slice(-2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                  <span className="truncate max-w-[130px] text-left font-bold tracking-tight">
                    {activeMemberObj?.fullName || focusedUserName || 'Chọn thành viên'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 ml-auto shrink-0 transition-transform ${showMemberDropdown ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
                </button>

                {showMemberDropdown && (
                  <div
                    className="absolute top-full left-0 mt-2 z-50 w-72 rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{
                      boxShadow:
                        '0 24px 50px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.16), 0 8px 24px -4px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Thành viên nhóm
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                        {members.length}
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1.5 space-y-1" style={{ scrollbarWidth: 'thin' }}>
                      {members.map((m) => {
                        const isActive = (selectedUserId ?? activeMemberObj?.id) === m.id;
                        const roleMatch = m.fullName.match(/\(([^)]+)\)/);
                        const role = m.role || (roleMatch ? roleMatch[1] : null);
                        const displayName = roleMatch ? m.fullName.replace(/ *\([^)]*\)/, '').trim() : m.fullName;
                        const initials = displayName.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase() || 'U';
                        const colors = ['#6366f1,#8b5cf6', '#06b6d4,#0891b2', '#10b981,#059669', '#ec4899,#db2777', '#f59e0b,#d97706'];
                        const colorIdx = m.id % colors.length;
                        const accentColor = colors[colorIdx].split(',')[0];

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => { onSelectUser?.(m.id); setShowMemberDropdown(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${
                              isActive
                                ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-950 dark:text-white font-semibold shadow-xs'
                                : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                            }`}
                          >
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-md transition-transform group-hover:scale-105"
                              style={{ background: `linear-gradient(135deg,${colors[colorIdx]})`, color: '#fff' }}
                            >
                              {initials}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                {displayName}
                              </div>
                              {role ? (
                                <span
                                  className="inline-block text-[9px] font-bold mt-0.5 px-1.5 py-0.2 rounded-full border"
                                  style={{
                                    color: accentColor,
                                    borderColor: `${accentColor}55`,
                                    background: `${accentColor}20`,
                                  }}
                                >
                                  {role}
                                </span>
                              ) : (
                                <div className="text-[9px] text-slate-400 mt-0.5">Thành viên</div>
                              )}
                            </div>
                            {isActive && (
                              <Check className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0 stroke-[2.5]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle: 5 Category Hub Cards */}
          <div className="absolute inset-0 pointer-events-none">
            {DETAIL_AXES.map((axis, idx) => {
              const isSelected = axis.id === selectedAxis;
              const count = activeEvents.filter((e) => e.axis === axis.id).length;
              const topY = catYPositions[idx] - ch / 2;

              return (
                <button
                  key={axis.id}
                  type="button"
                  onClick={() => {
                    setSelectedAxis(axis.id);
                    setItemFocus(0);
                  }}
                  className={`absolute pointer-events-auto flex flex-col justify-center px-3.5 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500/20 to-white dark:to-[#18181b]/95 border-amber-400 shadow-[0_0_24px_rgba(245,194,100,0.3)] ring-1 ring-amber-400/50'
                      : 'bg-white/90 dark:bg-[#1f1f23]/90 border-zinc-200/90 dark:border-white/10 hover:border-cyan-400/50 shadow-md'
                  }`}
                  style={{
                    left: `${catL}px`,
                    top: `${topY}px`,
                    width: `${catW}px`,
                    height: `${ch}px`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: axis.color }}>
                      {axis.id === 'D1' && <Layers className="w-4 h-4" />}
                      {axis.id === 'D2' && <Shield className="w-4 h-4" />}
                      {axis.id === 'D3' && <Users className="w-4 h-4" />}
                      {axis.id === 'D4' && <Star className="w-4 h-4" />}
                      {axis.id === 'IMP' && <AlertTriangle className="w-4 h-4" />}
                    </span>
                    <strong className="text-xl font-bold font-mono text-zinc-900 dark:text-white leading-none">{count}</strong>
                  </div>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 truncate">{axis.short} · {axis.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Right of Middle: Vertical Fan-Out Event Cards */}
          <div className="absolute inset-0 pointer-events-none">
            {axisEvents.length === 0 ? (
              <div
                className="absolute p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 text-xs text-zinc-500 dark:text-zinc-400 text-center bg-white/70 dark:bg-[#18181b]/70"
                style={{ left: `${xL}px`, top: `${oy - 40}px`, width: `${itemW}px` }}
              >
                Chưa có sự kiện nào ở trục <b>{activeAxisMeta.short}</b> trong khoảng này.
                {selectedAxis === 'IMP' && <div className="mt-1 text-cyan-600 dark:text-cyan-300">Bấm <b>+ Khai báo rào cản</b> để ghi nhận lý do vắng/trễ.</div>}
              </div>
            ) : (
              axisEvents.map((ev, idx) => {
                const dIdx = idx - itemFocus;
                const ad = Math.abs(dIdx);
                if (ad > 5) return null;

                const step = Math.max(60, Math.min(70, (h - 210) / 7));
                const itemY = oy + dIdx * step - 26;
                const itemX = xL + curve * (1 - Math.pow(Math.min(1, ad / 5), 2));
                const opacity = Math.max(0.16, 1 - Math.pow(ad / 5, 2));
                const scale = 1 - Math.min(ad, 5) * 0.035;
                const isSelected = selectedEvent?.id === ev.id;

                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent?.(isSelected ? null : ev)}
                    className={`absolute pointer-events-auto flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-100/80 dark:bg-[#28251e] border-amber-400 shadow-[0_0_18px_rgba(245,194,100,0.35)]'
                        : 'bg-white/95 dark:bg-[#1f1f23]/95 border-zinc-200/90 dark:border-white/10 hover:border-cyan-400/60 shadow-sm'
                    }`}
                    style={{
                      left: `${itemX}px`,
                      top: `${itemY}px`,
                      width: `${itemW}px`,
                      opacity,
                      transform: `scale(${scale})`,
                      transformOrigin: 'left center',
                    }}
                  >
                    {/* Glowing status dot */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: ev.axis === 'IMP' ? '#fbbf24' : ev.impact < 0 ? '#f87171' : activeAxisMeta.color,
                        boxShadow: `0 0 8px ${ev.axis === 'IMP' ? '#fbbf24' : ev.impact < 0 ? '#f87171' : activeAxisMeta.color}`,
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <strong className="block text-[12.5px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">{ev.title}</strong>
                      <div className="flex items-center gap-2 mt-1 text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">{ev.src}</span>
                        <span>Ngày {ev.day}</span>
                        <span
                          className="font-bold"
                          style={{
                            color: ev.axis === 'IMP' ? '#d97706' : (ev.dp || 0) < 0 ? '#ef4444' : '#10b981',
                          }}
                        >
                          {ev.axis === 'IMP' ? `+${ev.impact}ng` : `${(ev.dp || 0) >= 0 ? '+' : ''}${(ev.dp || 0).toFixed(1)}pp`}
                        </span>

                        {/* 3-bar impact meter */}
                        <div className="flex items-center gap-0.5 ml-auto">
                          {[1, 2, 3].map((lvl) => (
                            <i
                              key={lvl}
                              className="w-2.5 h-1 rounded-sm"
                              style={{
                                backgroundColor:
                                  lvl <= (ev.axis === 'IMP' ? 2 : Math.min(3, Math.ceil(Math.abs(ev.dp || 1))))
                                    ? activeAxisMeta.color
                                    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>

          {/* Bottom Sprint Replay Playbar */}
          <div className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-6 sm:right-6 z-30 pointer-events-auto flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 shadow-2xl">
            <button
              type="button"
              aria-label={isPlaying ? 'Tạm dừng phát lại' : 'Bắt đầu phát lại sprint'}
              onClick={handleTogglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white shadow-[0_0_15px_rgba(244,114,182,0.4)] transition shrink-0 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0 space-y-1">
              <input
                type="range"
                min={1}
                max={maxDay}
                value={cutDay}
                onChange={(e) => setCutDay(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-200 dark:bg-white/15 accent-pink-500"
              />
              <div className="flex flex-wrap justify-between gap-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                <span>
                  Phát lại sprint · Ngày {cutDay}/{maxDay}
                  {(() => {
                    if (!activeSprintStartDate) return '';
                    const parts = activeSprintStartDate.split('-').map(Number);
                    if (parts.length !== 3 || parts.some(Number.isNaN)) return '';
                    const dt = new Date(parts[0], parts[1] - 1, parts[2] + Math.max(0, cutDay - 1));
                    const dd = String(dt.getDate()).padStart(2, '0');
                    const mm = String(dt.getMonth() + 1).padStart(2, '0');
                    return ` (${dd}/${mm}/${dt.getFullYear()})`;
                  })()}
                </span>
                <span className="text-cyan-600 dark:text-cyan-300 font-semibold">{activeEvents.length} sự kiện ghi nhận đến thời điểm này</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bottom-Left Floating Legend Card (Overview Mode - Clear & Interactive) */}
      {viewMode === 'overview' && (
        <div
          className={`absolute z-30 pointer-events-auto rounded-2xl bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 shadow-xl text-[11px] text-zinc-700 dark:text-zinc-300 transition-all ${
            showMobileLegend
              ? 'block top-28 sm:top-20 bottom-auto left-3 right-3 sm:right-auto sm:w-80 max-h-[calc(100%-300px)] overflow-y-auto p-3.5'
              : 'hidden lg:block lg:bottom-5 lg:left-5 lg:w-[296px] p-3.5'
          }`}
          data-testid="multidimensional-legend"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <h4 className="font-bold text-[10.5px] tracking-wider text-zinc-700 dark:text-zinc-200 uppercase">
                CHÚ THÍCH MÔ HÌNH ĐA CHIỀU
              </h4>
            </div>
            <div className="flex items-center gap-1">
              {activeFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => onSelectFilter?.('ALL')}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/25 cursor-pointer"
                >
                  Hiện tất cả
                </button>
              )}
              <button
                type="button"
                title={isLegendCollapsed ? 'Mở rộng bảng chú thích' : 'Thu gọn bảng chú thích'}
                onClick={() => setIsLegendCollapsed((v) => !v)}
                className="p-0.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLegendCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {!isLegendCollapsed && (
            <>
              <div className="space-y-1 mt-2.5">
                {LEGEND_ITEMS.map((item) => {
                  const isFiltered = item.filterKey !== null && activeFilter === item.filterKey;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!item.filterKey}
                      onClick={() => {
                        if (!item.filterKey) return;
                        onSelectFilter?.(isFiltered ? 'ALL' : item.filterKey);
                      }}
                      className={`w-full text-left flex items-start gap-2.5 px-2 py-1.5 rounded-xl transition-all ${
                        item.filterKey ? 'cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-white/5' : 'cursor-default'
                      } ${
                        isFiltered
                          ? 'bg-cyan-500/10 ring-1 ring-cyan-500/40'
                          : ''
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${item.dotColor} ${item.glow}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {item.title}
                          </span>
                          <span
                            className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${item.badgeClass}`}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2.5 border-t border-zinc-200/80 dark:border-white/10">
                <div
                  className="p-2 rounded-xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200/70 dark:border-white/5"
                  title="Giảm điểm khi chia nhỏ task, chuẩn hóa công bằng theo Median & MAD của nhóm"
                >
                  <div className="flex items-center gap-1 text-[9.5px] text-zinc-500 dark:text-zinc-400">
                    <Sliders className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="truncate">Chống cày điểm ảo</span>
                  </div>
                  <div className="font-mono font-bold text-[10.5px] text-cyan-700 dark:text-cyan-300 mt-0.5 whitespace-nowrap">
                    ln(1+x) · MAD
                  </div>
                </div>

                <div
                  className="p-2 rounded-xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200/70 dark:border-white/5"
                  title="Khoảng tin cậy thống kê 95% qua 1000 lần lấy mẫu Bootstrap"
                >
                  <div className="flex items-center gap-1 text-[9.5px] text-zinc-500 dark:text-zinc-400">
                    <BarChart2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">Độ tin cậy thống kê</span>
                  </div>
                  <div className="font-mono font-bold text-[10.5px] text-emerald-700 dark:text-emerald-300 mt-0.5 whitespace-nowrap">
                    95% CI (Bootstrap)
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. Bottom-Right Floating KPI & AI TCREI Chatbox Dock (Overview Mode) */}
      {viewMode === 'overview' && (
        <div
          className="absolute bottom-3 left-3 right-3 sm:left-auto sm:bottom-6 sm:right-6 z-30 pointer-events-auto sm:w-[460px] sm:max-w-[92vw] flex flex-col rounded-3xl bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-white/10 shadow-2xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.6)] transition-all duration-200"
          style={{ overflow: 'visible' }}
          data-testid="ai-chatbox-dock"
        >
          {/* Top KPI Row */}
          <div className="grid grid-cols-4 divide-x divide-zinc-200 dark:divide-white/10 px-2 sm:px-4 py-2 sm:py-3 bg-zinc-50/80 dark:bg-[#18181b]/80 text-center rounded-t-3xl">
            <div className="px-0.5 sm:px-1">
              <span className="text-[9.5px] sm:text-[10.5px] text-zinc-500 dark:text-zinc-400 block font-medium truncate">Đóng góp p_i</span>
              <strong className="text-xs sm:text-sm font-extrabold text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-0.5 sm:gap-1">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{((finalPct ?? 0) * 100).toFixed(1)}%</span>
              </strong>
            </div>
            <div className="px-0.5 sm:px-1">
              <span className="text-[9.5px] sm:text-[10.5px] text-zinc-500 dark:text-zinc-400 block font-medium truncate">Điểm C_i</span>
              <strong className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white flex items-center justify-center gap-0.5 sm:gap-1">
                <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400 shrink-0" />
                <span>{(compositeScore ?? 0).toFixed(1)}</span>
              </strong>
            </div>
            <div className="px-0.5 sm:px-1">
              <span className="text-[9.5px] sm:text-[10.5px] text-zinc-500 dark:text-zinc-400 block font-medium truncate">Khoảng cách δ_i</span>
              <strong className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5 sm:gap-1">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{(distanceToCenter ?? 0).toFixed(2)}</span>
              </strong>
            </div>
            <div className="px-0.5 sm:px-1">
              <span className="text-[9.5px] sm:text-[10.5px] text-zinc-500 dark:text-zinc-400 block font-medium truncate">Khả dụng a_i</span>
              <strong className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-300 flex items-center justify-center gap-0.5 sm:gap-1">
                <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{((availabilityFactor ?? 1.0) * 100).toFixed(0)}%</span>
              </strong>
            </div>
          </div>

          {/* AI Chatbox Header Strip (TCREI Status + Expand/Collapse) */}
          <div className="px-3.5 py-1.5 border-t border-zinc-200/80 dark:border-white/10 bg-white/70 dark:bg-[#1a1d24]/70 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsChatOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-cyan-300 hover:opacity-80 transition cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>AI TCREI Copilot</span>
              {chatMessages.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-mono bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
                  {chatMessages.length}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1">
              {/* 5-step TCREI Indicator Pills */}
              <div className="hidden sm:flex items-center gap-0.5" title="Quy trình Prompt TCREI (Task - Context - Reference - Evaluate - Iterate)">
                {TCREI_STEPS.map((step) => {
                  const isInspected = activeTcreiStep === step.key;
                  return (
                    <button
                      key={step.key}
                      type="button"
                      title={step.title}
                      onClick={() => {
                        setIsChatOpen(true);
                        setActiveTcreiStep((prev) => (prev === step.key ? null : step.key));
                      }}
                      className={`w-5 h-5 flex items-center justify-center rounded text-[9.5px] font-mono font-bold transition cursor-pointer ${
                        isInspected
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : latestTcrei
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                          : 'bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300/80 dark:hover:bg-white/20'
                      }`}
                    >
                      {step.key}
                    </button>
                  );
                })}
              </div>

              {chatMessages.length > 0 && (
                <button
                  type="button"
                  title="Xóa lịch sử trò chuyện"
                  onClick={() => {
                    setChatMessages([]);
                    setPreviousInteractionId(null);
                    setLatestTcrei(null);
                    setActiveTcreiStep(null);
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              <button
                type="button"
                title={isChatOpen ? 'Thu gọn khung chat' : 'Mở khung chat AI'}
                onClick={() => setIsChatOpen((v) => !v)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition cursor-pointer"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isChatOpen ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>

          {/* Expandable Multi-turn AI Chatbox Panel */}
          {isChatOpen && (
            <div className="px-3 pt-2 pb-1 border-t border-zinc-200/70 dark:border-white/10 bg-zinc-50/60 dark:bg-[#14161c]/70 flex flex-col gap-2">
              {/* Optional TCREI Prompt Inspector Drawer */}
              {activeTcreiStep && (
                <div className="p-2 rounded-xl bg-indigo-50/90 dark:bg-[#1b1f2c] border border-indigo-200 dark:border-indigo-500/30 text-[10.5px] leading-relaxed text-zinc-700 dark:text-zinc-200 max-h-28 overflow-y-auto">
                  <div className="flex items-center justify-between font-bold text-indigo-700 dark:text-cyan-300 mb-1">
                    <span>{TCREI_STEPS.find((s) => s.key === activeTcreiStep)?.title}</span>
                    <button type="button" onClick={() => setActiveTcreiStep(null)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-[10.5px] text-zinc-700 dark:text-zinc-300">
                    {latestTcrei
                      ? (activeTcreiStep === 'T'
                          ? latestTcrei.task
                          : activeTcreiStep === 'C'
                          ? latestTcrei.context
                          : activeTcreiStep === 'R'
                          ? latestTcrei.reference
                          : activeTcreiStep === 'E'
                          ? latestTcrei.evaluate
                          : latestTcrei.iterate)
                      : 'Hãy gửi một câu hỏi bên dưới để xem ngữ cảnh TCREI được trích xuất trực tiếp từ CSDL MariaDB.'}
                  </pre>
                </div>
              )}

              {/* Chat Messages Scroll Container */}
              <div
                ref={chatScrollRef}
                className="max-h-56 overflow-y-auto space-y-2 pr-1 text-xs select-text"
                style={{ scrollbarWidth: 'thin' }}
              >
                {chatMessages.length === 0 ? (
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-[#1c1f28] border border-zinc-200/80 dark:border-white/10 text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    <div className="font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Xin chào! Tôi là FairShare AI Copilot (Chuẩn TCREI)</span>
                    </div>
                    Tôi có thể tra cứu trực tiếp từ CSDL về <strong>điểm số của bạn</strong>, <strong>cách tính 4 tầng</strong>, <strong>tổng quát cả nhóm</strong> và <strong>công việc dự án bạn đang đảm nhận</strong>. Chọn nhanh câu hỏi bên dưới hoặc nhập trực tiếp nhé!
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl px-3 py-2 text-[11.5px] leading-relaxed shadow-xs ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-[#1c1f28] border border-zinc-200/90 dark:border-white/10 text-zinc-800 dark:text-zinc-100 rounded-bl-sm'
                        }`}
                      >
                        <div className="space-y-1">
                          {msg.content.split('\n').map((line, i) => (
                            <div key={i} className={line.trim().startsWith('-') || line.trim().startsWith('•') ? 'pl-1' : ''}>
                              {renderInlineFormatted(line)}
                            </div>
                          ))}
                        </div>

                        {msg.role === 'assistant' && (
                          <div className="mt-1.5 pt-1 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between gap-2 text-[9.5px] text-zinc-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Database className="w-2.5 h-2.5 text-cyan-500" />
                              {msg.liveGeminiUsed ? `Gemini (${msg.modelUsed})` : 'TCREI · MariaDB'}
                            </span>
                            <span>{msg.timestamp}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {isAiLoading && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-[#1c1f28] border border-zinc-200/90 dark:border-white/10 text-[11px] text-cyan-700 dark:text-cyan-300 w-fit">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tổng hợp dữ liệu TCREI & phân tích...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick-Prompt / Iterate Suggestions Row */}
          <div className="px-3 pt-1.5 flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {suggestedFollowUps.map((chip, idx) => (
              <button
                key={`${chip}-${idx}`}
                type="button"
                disabled={isAiLoading}
                onClick={() => void sendAiQuestion(chip)}
                className="px-2.5 py-1 rounded-full text-[10.5px] font-medium whitespace-nowrap bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          <form onSubmit={handleAskSubmit} className="px-3 py-2 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-zinc-100 dark:bg-[#18181b] rounded-2xl px-3 py-2 text-zinc-900 dark:text-white shadow-inner border border-zinc-200 dark:border-white/10">
              <input
                type="text"
                value={questionInput}
                onFocus={() => setIsChatOpen(true)}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Hỏi AI về điểm số, cách tính 4 tầng, dự án..."
                className="w-full bg-transparent text-xs font-medium focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <button
              type="submit"
              aria-label="Gửi câu hỏi AI"
              disabled={isAiLoading || !questionInput.trim()}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 disabled:opacity-60 text-white flex items-center justify-center shadow-lg transition cursor-pointer"
            >
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -rotate-45" />}
            </button>
          </form>

          <div className="px-4 py-2.5 bg-zinc-50/90 dark:bg-[#18181b]/95 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between text-xs rounded-b-3xl" style={{ overflow: 'visible' }}>
            <div className="flex items-center gap-2 relative">
              {/* Custom Member Dropdown — Bottom Dock */}
              {(() => {
                const activeMember = members.find((m) => m.id === (selectedUserId ?? activeMemberObj?.id));
                const activeRoleMatch = activeMember?.fullName.match(/\(([^)]+)\)/);
                const activeDisplayName = activeRoleMatch
                  ? (activeMember?.fullName || '').replace(/ *\([^)]*\)/, '').trim()
                  : activeMember?.fullName || focusedUserName || 'Chọn thành viên';
                const activeInitials = activeDisplayName
                  .split(' ')
                  .filter(Boolean)
                  .slice(-2)
                  .map((w: string) => w[0])
                  .join('')
                  .toUpperCase() || 'U';

                return (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMemberDropdown2((v) => !v)}
                      className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border transition-all text-xs font-semibold select-none cursor-pointer max-w-[210px] shadow-sm ${
                        showMemberDropdown2
                          ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/25 bg-white dark:bg-[#222632] text-zinc-950 dark:text-white'
                          : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#1c1f28] hover:bg-zinc-100 dark:hover:bg-[#262a36] hover:border-slate-400 dark:hover:border-white/35 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 shadow-sm"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#06b6d4)', color: '#fff' }}
                      >
                        {activeInitials}
                      </span>
                      <span className="truncate max-w-[130px] font-bold tracking-tight">{activeDisplayName}</span>
                      <svg
                        className={`w-3 h-3 ml-1 shrink-0 transition-transform ${showMemberDropdown2 ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : 'text-zinc-500 dark:text-zinc-400'}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {showMemberDropdown2 && (
                      <div
                        className="absolute bottom-full left-0 mb-3 z-[9999] w-72 rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
                        style={{
                          boxShadow:
                            '0 24px 50px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.16), 0 8px 24px -4px rgba(0, 0, 0, 0.6)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Thành viên nhóm
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                            {members.length}
                          </span>
                        </div>

                        {/* Member List */}
                        <div className="max-h-64 overflow-y-auto p-1.5 space-y-1" style={{ scrollbarWidth: 'thin' }}>
                          {members.map((m) => {
                            const isActive = (selectedUserId ?? activeMemberObj?.id) === m.id;
                            const roleMatch = m.fullName.match(/\(([^)]+)\)/);
                            const role = m.role || (roleMatch ? roleMatch[1] : null);
                            const displayName = roleMatch
                              ? m.fullName.replace(/ *\([^)]*\)/, '').trim()
                              : m.fullName;
                            const initials = displayName
                              .split(' ')
                              .filter(Boolean)
                              .slice(-2)
                              .map((w: string) => w[0])
                              .join('')
                              .toUpperCase() || '?';
                            const palette = [
                              '#6366f1,#8b5cf6',
                              '#06b6d4,#0891b2',
                              '#10b981,#059669',
                              '#ec4899,#db2777',
                              '#f59e0b,#d97706',
                            ];
                            const ci = m.id % palette.length;
                            const accentColor = palette[ci].split(',')[0];

                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  onSelectUser?.(m.id);
                                  setShowMemberDropdown2(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${
                                  isActive
                                    ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-950 dark:text-white font-semibold shadow-xs'
                                    : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                                }`}
                              >
                                <span
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-md transition-transform group-hover:scale-105"
                                  style={{ background: `linear-gradient(135deg,${palette[ci]})`, color: '#fff' }}
                                >
                                  {initials}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                    {displayName}
                                  </div>
                                  {role ? (
                                    <span
                                      className="inline-block text-[9px] font-bold mt-0.5 px-1.5 py-0.2 rounded-full border"
                                      style={{
                                        color: accentColor,
                                        borderColor: `${accentColor}55`,
                                        background: `${accentColor}20`,
                                      }}
                                    >
                                      {role}
                                    </span>
                                  ) : (
                                    <div className="text-[9px] text-slate-400 mt-0.5">Thành viên</div>
                                  )}
                                </div>
                                {isActive && (
                                  <Check className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0 stroke-[2.5]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                +{Math.max(0, members.length - 1)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSwitchViewMode?.('detail')}
              className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
            >
              <Sparkles className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
              <span>Chi tiết neuron →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
