import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Share2,
  Printer,
  Download,
  Plus,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  FileText,
  Figma,
  Code2,
  Layers,
  Sparkles,
  Paperclip,
  X,
  UserCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { teamApi } from '../../api/team.api';
import { peerReviewApi } from '../../api/peerReview.api';
import { contributionApi } from '../../api/contribution.api';
import { ManualContributionItem } from '../../types/contribution';
import { showToast } from '../../components/ui/Toast';
import { NoProjectState } from '../team/NoProjectState';
import { ManualContributionForm } from '../dashboard/ManualContributionForm';

interface SprintOption {
  id: number;
  name: string;
  isCurrent?: boolean;
}

interface MemberInfo {
  id: number;
  name: string;
  fullName: string;
  role: string;
  email?: string;
}

export const ManualContributionPage: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1));

  const { user } = useAuthStore();
  const [currentUserId, setCurrentUserId] = useState<number>(user?.id || 1);
  const [selectedSprintId, setSelectedSprintId] = useState<number>(1);
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [availableUsers, setAvailableUsers] = useState<MemberInfo[]>([]);

  // Ledger state from Database
  const [contributions, setContributions] = useState<ManualContributionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'points'>('recent');

  // Selected contribution for preview detail card
  const [selectedItem, setSelectedItem] = useState<ManualContributionItem | null>(null);

  // Modal create contribution
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Active action menu row id
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Anti-fraud feedback banner
  const [fraudWarning, setFraudWarning] = useState<string | null>(null);

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 1. Fetch Sprints & Teams
  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  useEffect(() => {
    let mounted = true;
    peerReviewApi
      .getSprints(currentTeamId)
      .then((res) => {
        if (!mounted) return;
        if (Array.isArray(res.data) && res.data.length > 0) {
          const list = res.data.map((sp, idx) => ({
            id: sp.id,
            name: sp.name || `Sprint ${idx + 1}`,
            isCurrent: sp.status === 'ACTIVE',
          }));
          setSprints(list);
          const activeSp = list.find((s) => s.isCurrent) || list[0];
          setSelectedSprintId(activeSp.id);
        } else {
          setSprints([{ id: 1, name: 'Sprint 1', isCurrent: true }]);
          setSelectedSprintId(1);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setSprints([{ id: 1, name: 'Sprint 1', isCurrent: true }]);
        setSelectedSprintId(1);
      });
    return () => {
      mounted = false;
    };
  }, [currentTeamId]);

  // 2. Fetch Team Members
  useEffect(() => {
    let mounted = true;
    teamApi
      .getTeamById(currentTeamId)
      .then((res) => {
        if (!mounted) return;
        if (res?.data?.members && Array.isArray(res.data.members) && res.data.members.length > 0) {
          const list: MemberInfo[] = res.data.members.map((m) => {
            const raw = m as unknown as { userId?: number; fullName?: string };
            const uId = m.user?.id ?? raw.userId ?? m.id;
            const uName = m.user?.fullName ?? raw.fullName ?? m.user?.email ?? `Thành viên #${uId}`;
            const roleText = m.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên';
            return {
              id: uId,
              name: uName,
              fullName: uName,
              role: roleText,
              email: m.user?.email || m.email,
            };
          });
          setAvailableUsers(list);

          if (user?.id && list.some((u) => u.id === user.id)) {
            setCurrentUserId(user.id);
          } else if (list.length > 0) {
            setCurrentUserId(list[0].id);
          }
        }
      })
      .catch(() => {
        if (!mounted) return;
        if (user?.id) {
          setAvailableUsers([
            { id: user.id, name: user.fullName || 'Người dùng hiện tại', fullName: user.fullName || 'Người dùng hiện tại', role: 'Thành viên' },
          ]);
          setCurrentUserId(user.id);
        }
      });
    return () => {
      mounted = false;
    };
  }, [currentTeamId, user?.id, user?.fullName]);

  // 3. Load Contributions from DB
  const loadContributions = useCallback(async () => {
    if (!currentTeamId) return;
    setLoading(true);
    try {
      // Call backend GET /api/contributions/manual
      const res = await contributionApi.getAllManualContributions(
        currentTeamId,
        selectedSprintId,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      if (res?.data && Array.isArray(res.data)) {
        setContributions(res.data);
        if (res.data.length > 0 && !selectedItem) {
          setSelectedItem(res.data[0]);
        }
      } else {
        setContributions([]);
      }
    } catch {
      // Fallback: try pending endpoint
      try {
        const pendingRes = await contributionApi.getPendingManualContributions(currentTeamId, selectedSprintId);
        if (pendingRes?.data && Array.isArray(pendingRes.data)) {
          setContributions(pendingRes.data);
          if (pendingRes.data.length > 0 && !selectedItem) {
            setSelectedItem(pendingRes.data[0]);
          }
        }
      } catch {
        setContributions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentTeamId, selectedSprintId, statusFilter, selectedItem]);

  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  // Click outside to close action menu
  useEffect(() => {
    const handleOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Filtered & Sorted contributions
  const filteredContributions = useMemo(() => {
    let result = [...contributions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.taskName?.toLowerCase().includes(q) ||
          c.userName?.toLowerCase().includes(q) ||
          String(c.id).includes(q) ||
          c.evidenceLink?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'points') {
      result.sort((a, b) => Number(b.storyPoints) - Number(a.storyPoints));
    }

    return result;
  }, [contributions, searchQuery, statusFilter, sortBy]);

  // Calculated Metrics
  const metrics = useMemo(() => {
    const totalTransactions = contributions.length;
    const approvedList = contributions.filter((c) => c.status === 'APPROVED');
    const pendingList = contributions.filter((c) => c.status === 'PENDING');
    const rejectedList = contributions.filter((c) => c.status === 'REJECTED');

    const totalApprovedPoints = approvedList.reduce((sum, c) => sum + Number(c.storyPoints || 0), 0);
    const totalPendingPoints = pendingList.reduce((sum, c) => sum + Number(c.storyPoints || 0), 0);
    const totalRejectedPoints = rejectedList.reduce((sum, c) => sum + Number(c.storyPoints || 0), 0);
    const totalPoints = contributions.reduce((sum, c) => sum + Number(c.storyPoints || 0), 0);
    const approvalRate = totalPoints > 0 ? (totalApprovedPoints / totalPoints) * 100 : 0;

    return {
      totalCount: totalTransactions,
      approvedCount: approvedList.length,
      pendingCount: pendingList.length,
      rejectedCount: rejectedList.length,
      approvedPoints: totalApprovedPoints,
      pendingPoints: totalPendingPoints,
      rejectedPoints: totalRejectedPoints,
      totalPoints,
      approvalRate,
    };
  }, [contributions]);

  // Dynamic Chart Data computed from real database contributions
  const { chartReceivedData, chartSpentData } = useMemo(() => {
    // If no contributions, build empty/baseline points
    if (contributions.length === 0) {
      const defaultDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const emptySeries = defaultDays.map((d) => ({
        label: d,
        current: 0,
        baseline: 0,
      }));
      return { chartReceivedData: emptySeries, chartSpentData: emptySeries };
    }

    // Sort contributions chronologically
    const sorted = [...contributions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Group by date formatted as 'DD/MM'
    const dateMap: { [date: string]: { approved: number; pending: number; total: number } } = {};
    sorted.forEach((item) => {
      const d = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
        : 'Hôm nay';
      if (!dateMap[d]) {
        dateMap[d] = { approved: 0, pending: 0, total: 0 };
      }
      const pts = Number(item.storyPoints || 0);
      dateMap[d].total += pts;
      if (item.status === 'APPROVED') {
        dateMap[d].approved += pts;
      } else if (item.status === 'PENDING') {
        dateMap[d].pending += pts;
      }
    });

    const dates = Object.keys(dateMap);
    // Running cumulative approved points
    let runningApproved = 0;
    let runningPending = 0;

    const received = dates.map((dateKey) => {
      runningApproved += dateMap[dateKey].approved;
      return {
        label: dateKey,
        current: Number(runningApproved.toFixed(1)),
        baseline: Number((runningApproved * 0.7).toFixed(1)),
      };
    });

    const spent = dates.map((dateKey) => {
      runningPending += dateMap[dateKey].pending;
      return {
        label: dateKey,
        current: Number(runningPending.toFixed(1)),
        baseline: Number((runningPending * 0.5).toFixed(1)),
      };
    });

    return { chartReceivedData: received, chartSpentData: spent };
  }, [contributions]);

  // Approve Contribution (Saves to DB)
  const handleApprove = async (item: ManualContributionItem) => {
    if (item.userId === currentUserId) {
      setFraudWarning('Quy tắc Anti-Fraud: Bạn không thể tự phê duyệt bài đóng góp do chính mình khai báo!');
      setTimeout(() => setFraudWarning(null), 5000);
      return;
    }

    try {
      await contributionApi.reviewManualContribution(item.id, currentUserId, 'APPROVE');
      showToast.success(`Đã phê duyệt minh chứng "${item.taskName}" (+${item.storyPoints} SP) thành công!`);
      loadContributions();
      if (selectedItem?.id === item.id) {
        setSelectedItem({ ...selectedItem, status: 'APPROVED' });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể phê duyệt đóng góp.';
      showToast.error(msg || 'Lỗi khi cập nhật trạng thái');
    }
  };

  // Reject Contribution (Saves to DB)
  const handleReject = async (item: ManualContributionItem) => {
    if (item.userId === currentUserId) {
      setFraudWarning('Quy tắc Anti-Fraud: Bạn không thể từ chối bài đóng góp do chính mình khai báo!');
      setTimeout(() => setFraudWarning(null), 5000);
      return;
    }

    try {
      await contributionApi.reviewManualContribution(item.id, currentUserId, 'REJECT');
      showToast.info(`Đã từ chối minh chứng "${item.taskName}".`);
      loadContributions();
      if (selectedItem?.id === item.id) {
        setSelectedItem({ ...selectedItem, status: 'REJECTED' });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể từ chối đóng góp.';
      showToast.error(msg || 'Lỗi khi cập nhật trạng thái');
    }
  };

  // Delete Contribution (Deletes from DB)
  const handleDelete = async (item: ManualContributionItem) => {
    if (!window.confirm(`Xác nhận xóa đóng góp "${item.taskName}" khỏi cơ sở dữ liệu?`)) {
      return;
    }

    try {
      await contributionApi.deleteManualContribution(item.id, currentUserId);
      showToast.success(`Đã xóa đóng góp "${item.taskName}" khỏi DB.`);
      loadContributions();
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
    } catch {
      showToast.error('Không thể xóa đóng góp. Vui lòng kiểm tra quyền hạn.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredContributions.length === 0) {
      showToast.info('Không có dữ liệu đóng góp để xuất.');
      return;
    }

    const headers = ['Mã đóng góp', 'Tiêu đề công việc', 'Người thực hiện', 'Story Points', 'Trạng thái', 'Ngày tạo', 'Minh chứng'];
    const rows = filteredContributions.map((c) => [
      `#0${c.id}`,
      `"${c.taskName.replace(/"/g, '""')}"`,
      `"${(c.userName || 'Thành viên').replace(/"/g, '""')}"`,
      c.storyPoints,
      c.status,
      c.createdAt,
      `"${c.evidenceLink || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FairShare_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast.success('Đã xuất file báo cáo Ledger (CSV) thành công!');
  };

  // Select all checkboxes
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContributions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContributions.map((c) => c.id));
    }
  };

  const toggleSelectRow = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Helper formatting category badge
  const getCategoryMeta = (link?: string, task?: string) => {
    const l = (link || '').toLowerCase();
    const t = (task || '').toLowerCase();
    if (l.includes('figma') || t.includes('design') || t.includes('ui') || t.includes('ux')) {
      return { label: 'Figma / UI Design', icon: <Figma size={12} className="text-purple-500" /> };
    }
    if (l.includes('doc') || l.includes('drive') || t.includes('srs') || t.includes('tài liệu')) {
      return { label: 'Tài liệu SRS', icon: <FileText size={12} className="text-blue-500" /> };
    }
    if (l.includes('github') || l.includes('gitlab') || t.includes('code') || t.includes('backend') || t.includes('api')) {
      return { label: 'Source code', icon: <Code2 size={12} className="text-emerald-500" /> };
    }
    return { label: 'Task Board', icon: <Layers size={12} className="text-amber-500" /> };
  };

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  return (
    <div
      className="page pad space-y-6"
      style={{ maxWidth: '1380px', margin: '0 auto', color: 'var(--fg)' }}
    >
      {/* ── TOP HEADER (Ledger Style matching Image 1) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1">
            <span>Dashboard</span>
            <span>&gt;</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">Đóng góp (Ledger)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
            <span>Ledger</span>
          </h1>
        </div>

        {/* Action controls on top right */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time period / Sprint dropdown */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs shadow-xs">
            <Calendar size={14} className="text-zinc-400" />
            <span className="text-zinc-400 font-normal">Time period:</span>
            <select
              aria-label="Chọn Sprint"
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(Number(e.target.value))}
              className="bg-transparent text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              {sprints.map((sp) => (
                <option key={sp.id} value={sp.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                  {sp.name} {sp.isCurrent ? '• Hiện tại' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="text-zinc-400" />
          </div>

          {/* Account switcher */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs shadow-xs">
            <UserCheck size={14} className="text-indigo-500 shrink-0" />
            <select
              aria-label="Tài khoản thực hiện"
              value={currentUserId}
              onChange={(e) => setCurrentUserId(Number(e.target.value))}
              className="bg-transparent text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer text-xs max-w-[150px] truncate"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors shadow-xs cursor-pointer"
          >
            <Share2 size={13} />
            <span>Export</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            title="In sổ cái Ledger"
            className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors shadow-xs cursor-pointer"
          >
            <Printer size={15} />
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            title="Tải tệp dữ liệu"
            className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors shadow-xs cursor-pointer"
          >
            <Download size={15} />
          </button>

          {/* + Khai báo đóng góp (Prominent Button) */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B50EB] hover:bg-[#4E44DE] active:scale-[0.98] text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Khai báo đóng góp</span>
          </button>
        </div>
      </div>

      {/* Anti-Fraud Warning Banner if triggered */}
      {fraudWarning && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs animate-shake">
          <ShieldAlert size={18} className="shrink-0" />
          <span className="font-medium">{fraudWarning}</span>
        </div>
      )}

      {/* ── 4 TOP METRIC CARDS (Dynamic from Database) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total transactions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Total transactions</span>
            <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              <Layers size={13} />
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {metrics.totalCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span>{metrics.approvedCount} đã duyệt</span>
            <span className="text-zinc-400 font-normal">• {metrics.pendingCount} chờ duyệt</span>
          </div>
        </div>

        {/* Card 2: Total points received */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Total points received</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <ArrowDownLeft size={13} />
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              +{metrics.approvedPoints.toFixed(1)} SP
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span>↗ {metrics.approvalRate.toFixed(1)}%</span>
            <span className="text-zinc-400 font-normal">tỷ lệ duyệt hợp lệ</span>
          </div>
        </div>

        {/* Card 3: Total points pending */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Total points pending</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500">
              <ArrowUpRight size={13} />
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {metrics.pendingPoints > 0 ? `${metrics.pendingPoints.toFixed(1)} SP` : '0.0 SP'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <span>{metrics.pendingCount} mục</span>
            <span className="text-zinc-400 font-normal">chờ đánh giá chéo</span>
          </div>
        </div>

        {/* Card 4: Net valid contribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Net valid points</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <Sparkles size={13} />
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              +{metrics.approvedPoints.toFixed(1)} SP
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span>↗ {metrics.approvalRate.toFixed(0)}%</span>
            <span className="text-zinc-400 font-normal">hiệu suất hoàn thành</span>
          </div>
        </div>
      </div>

      {/* ── 2 ANALYTICS CHARTS + FLOATING PREVIEW CARD (Dynamic from DB) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
        {/* Left Chart: Overall points approved */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
              Overall points approved (Tích lũy SP)
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Thực tế duyệt (SP)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                <span>Kỳ vọng cơ sở</span>
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartReceivedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200, 200, 200, 0.2)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `${v} SP`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl shadow-xl text-xs">
                          <p className="font-bold text-zinc-900 dark:text-white">+{payload[0]?.value} SP</p>
                          <p className="text-[10px] text-zinc-500 font-medium">Thời điểm: {label}</p>
                          <p className="text-[10px] text-emerald-500 font-semibold">Tích lũy điểm hợp lệ</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="current" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#receivedGrad)" />
                <Area type="monotone" dataKey="baseline" stroke="#93C5FD" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Overall points pending */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-sm flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
              Overall points pending (Chờ thẩm định)
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Chờ duyệt (SP)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-200"></span>
                <span>Mức trung bình</span>
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSpentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200, 200, 200, 0.2)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `${v} SP`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl shadow-xl text-xs">
                          <p className="font-bold text-amber-500">{payload[0]?.value} SP</p>
                          <p className="text-[10px] text-zinc-500 font-medium">Thời điểm: {label}</p>
                          <p className="text-[10px] text-amber-500 font-semibold">Chờ đánh giá chéo</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="current" stroke="#D97706" strokeWidth={2.5} fillOpacity={1} fill="url(#spentGrad)" />
                <Area type="monotone" dataKey="baseline" stroke="#FDE68A" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Floating Detail Card (Connected to selected contribution) */}
          {selectedItem && (
            <div
              className="hidden sm:block absolute top-12 right-6 z-10 w-64 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-700/80 rounded-2xl p-4 shadow-2xl transition-all animate-fadeIn"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-pink-600 flex items-center justify-center">
                    <Sparkles size={12} />
                  </div>
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate max-w-[140px]">
                    {selectedItem.taskName}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <p className="font-mono text-[10px] text-zinc-400"># TASK-{selectedItem.id}</p>
                <p className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-200">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    selectedItem.status === 'APPROVED' ? 'bg-emerald-500' : selectedItem.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'
                  }`}></span>
                  <span>{selectedItem.userName || 'Thành viên'}</span>
                </p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{selectedItem.storyPoints} Story Points ({metrics.totalPoints > 0 ? Math.round((Number(selectedItem.storyPoints) / metrics.totalPoints) * 100) : 100}%)
                </p>

                {/* Evidence link & attachments */}
                <div className="pt-1.5">
                  <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
                    <Paperclip size={11} /> {selectedItem.evidenceLink ? '1 minh chứng đính kèm' : 'Không có đính kèm'}
                  </span>
                  <div className="flex items-center gap-2 mt-1.5">
                    {selectedItem.evidenceLink ? (
                      <a
                        href={selectedItem.evidenceLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-750 transition-colors text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[200px]"
                        title={selectedItem.evidenceLink}
                      >
                        <ExternalLink size={12} className="shrink-0" />
                        <span className="truncate">Mở minh chứng</span>
                      </a>
                    ) : (
                      <div className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-400">
                        Chưa gắn URL
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick actions inside floating card */}
                {selectedItem.status === 'PENDING' && (
                  <div className="flex items-center gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedItem)}
                      className="flex-1 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedItem)}
                      className="flex-1 py-1 text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM SECTION: LEDGER DATA TABLE (Image 1 Style) ── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-sm space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for transaction ID, date, category"
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-750 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filters & Sort */}
          <div className="flex items-center gap-2">
            {/* Filter status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-750 text-xs text-zinc-700 dark:text-zinc-300">
              <span className="text-zinc-400">Filters:</span>
              <select
                aria-label="Lọc trạng thái"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED')}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-white dark:bg-zinc-900">Tất cả</option>
                <option value="APPROVED" className="bg-white dark:bg-zinc-900">Đã duyệt (Approved)</option>
                <option value="PENDING" className="bg-white dark:bg-zinc-900">Chờ duyệt (Pending)</option>
                <option value="REJECTED" className="bg-white dark:bg-zinc-900">Từ chối (Rejected)</option>
              </select>
            </div>

            {/* Sort order */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-750 text-xs text-zinc-700 dark:text-zinc-300">
              <select
                aria-label="Sắp xếp"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest' | 'points')}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                <option value="recent" className="bg-white dark:bg-zinc-900">Recent transactions</option>
                <option value="oldest" className="bg-white dark:bg-zinc-900">Oldest transactions</option>
                <option value="points" className="bg-white dark:bg-zinc-900">Highest points</option>
              </select>
              <ChevronDown size={13} className="text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-400">
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredContributions.length && filteredContributions.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-300 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Transaction ID / Date</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Payee / From</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto mb-2" />
                    <span>Đang đồng bộ sổ cái từ Database...</span>
                  </td>
                </tr>
              ) : filteredContributions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <p className="text-sm font-medium">Chưa có giao dịch đóng góp nào trong kỳ này.</p>
                    <p className="text-xs text-zinc-500 mt-1">Bấm "+ Khai báo đóng góp" để bắt đầu ghi nhận minh chứng.</p>
                  </td>
                </tr>
              ) : (
                filteredContributions.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const isSelected = selectedItem?.id === item.id;
                  const categoryMeta = getCategoryMeta(item.evidenceLink, item.taskName);
                  const dateStr = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '11:52 AM, Aug 14, 2026';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(item.id)}
                          className="rounded border-zinc-300 cursor-pointer"
                        />
                      </td>

                      {/* Transaction ID / Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-[12px] block">
                          #0{item.id}HGL{item.id}
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5 font-mono">
                          {dateStr}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1 max-w-xs">
                          {item.taskName}
                        </div>
                        {item.evidenceLink && (
                          <a
                            href={item.evidenceLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-500 hover:underline mt-0.5 truncate max-w-xs"
                          >
                            <ExternalLink size={10} />
                            <span>{item.evidenceLink}</span>
                          </a>
                        )}
                      </td>

                      {/* Payee / From */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 block text-[12px]">
                              {item.userName || 'Thành viên'}
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              {item.userEmail || `User #${item.userId}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {categoryMeta.icon}
                          <span>{categoryMeta.label}</span>
                        </span>
                      </td>

                      {/* Amount / Story Points */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        {item.status === 'APPROVED' ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-[13px]">
                            +{Number(item.storyPoints).toFixed(1)} SP
                          </span>
                        ) : item.status === 'REJECTED' ? (
                          <span className="font-semibold text-rose-500 font-mono text-[13px]">
                            0.0 SP
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-500 font-mono text-[13px]">
                            +{Number(item.storyPoints).toFixed(1)} SP
                          </span>
                        )}
                        <span className="block text-[10px] text-zinc-400 font-mono">
                          {item.status === 'APPROVED'
                            ? `Đã duyệt vào sổ cái`
                            : item.status === 'REJECTED'
                            ? `Từ chối / Không tính`
                            : `Chờ xét duyệt chéo`}
                        </span>
                      </td>

                      {/* Action Menu */}
                      <td className="py-3.5 px-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                          className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {/* Action Popup Dropdown */}
                        {activeMenuId === item.id && (
                          <div
                            className="absolute right-3 top-10 z-30 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 shadow-xl py-1 text-xs text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem(item);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-300"
                            >
                              <ExternalLink size={13} />
                              <span>Xem chi tiết</span>
                            </button>

                            {item.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleApprove(item);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Phê duyệt (Duyệt)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleReject(item);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 flex items-center gap-2"
                                >
                                  <XCircle size={13} />
                                  <span>Từ chối</span>
                                </button>
                              </>
                            )}

                            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800"></div>

                            <button
                              type="button"
                              onClick={() => {
                                handleDelete(item);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 flex items-center gap-2"
                            >
                              <Trash2 size={13} />
                              <span>Xóa khỏi DB</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL KHAI BÁO ĐÓNG GÓP (SAVE TO DB) ── */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl">
            {/* Embedded Multi-step Contribution Form connecting directly to DB */}
            <ManualContributionForm
              teamId={currentTeamId}
              sprintId={selectedSprintId}
              userId={currentUserId}
              onCancel={() => setIsCreateModalOpen(false)}
              onSuccess={(newItem) => {
                showToast.success(`Đã lưu đóng góp "${newItem.taskName}" vào DB!`);
                setIsCreateModalOpen(false);
                loadContributions();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
