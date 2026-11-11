import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  Clock,
  Kanban,
  GitBranch,
  FileText,
  X,
  Mail,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { MemberTable } from './MemberTable';
import { ConsentDialog } from './ConsentDialog';
import { teamApi } from '../../api/team.api';
import { peerReviewApi } from '../../api/peerReview.api';
import { boardApi } from '../../api/board.api';
import { useAuthStore } from '../../store/authStore';
import type { Team, Role } from '../../types/team';

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'sprints' | 'consent'>('members');
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [teamSprints, setTeamSprints] = useState<Array<{ num: number; title: string; period: string; status: string; focusTask: string }>>([]);
  const [totalCards, setTotalCards] = useState<number>(0);

  const getMemberInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return (email?.substring(0, 2) || 'TV').toUpperCase();
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchTeam = async () => {
      try {
        const teamIdNum = Number(id) || 1;
        const res = await teamApi.getTeamById(teamIdNum);
        if (isMounted && res?.data) {
          setTeam(res.data);
        }
      } catch {
        if (isMounted) {
          setTeam(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTeam();
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    const teamIdNum = Number(id) || 1;
    peerReviewApi
      .getSprints(teamIdNum)
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setTeamSprints(
            res.data.map((sp, idx) => ({
              num: idx + 1,
              title: sp.name || `Sprint ${idx + 1}`,
              period: sp.startDate && sp.endDate ? `${sp.startDate} - ${sp.endDate}` : '14 ngày',
              status: sp.status === 'ACTIVE' ? 'ACTIVE' : sp.status === 'CLOSED' ? 'DONE' : 'UPCOMING',
              focusTask: 'Thực hiện và phân chia các công việc trên Kanban Board',
            }))
          );
        } else {
          setTeamSprints([]);
        }
      })
      .catch(() => {
        setTeamSprints([]);
      });

    boardApi
      .getBoardsByTeam(teamIdNum)
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const total =
            res.data[0].columns?.reduce(
              (sum, col) => sum + (col.cards?.length || 0),
              0
            ) || 0;
          setTotalCards(total);
        } else {
          setTotalCards(0);
        }
      })
      .catch(() => {
        setTotalCards(0);
      });
  }, [id]);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setShowInviteModal(false);
      setInviteEmail('');
    }, 1500);
  };

  const handleUpdateRole = async (userId: number, role: Role) => {
    try {
      if (team?.id) {
        await teamApi.updateMemberRole(team.id, userId, role);
      }
      setTeam((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members?.map((m) =>
            m.user?.id === userId || m.id === userId ? { ...m, role } : m
          ),
        };
      });
      setActionMessage('Đã cập nhật vai trò thành viên thành công.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch {
      setActionMessage('Không thể cập nhật vai trò (yêu cầu quyền Leader hoặc quy tắc an toàn).');
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?');
    if (!confirmed) return;

    try {
      if (team?.id) {
        await teamApi.deleteMember(team.id, userId);
      }
      setTeam((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members?.filter(
            (m) => m.user?.id !== userId && m.id !== userId
          ),
        };
      });
      setActionMessage('Đã xóa thành viên khỏi danh sách nhóm.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch {
      setActionMessage('Không thể xóa thành viên (nhóm phải giữ lại ít nhất 1 Trưởng nhóm).');
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const { user: currentUser } = useAuthStore();
  const currentTeam = team;
  const isLeader =
    currentTeam?.currentRole === 'LEADER' ||
    Boolean(
      currentTeam?.members?.find(
        (m) =>
          ((m.user?.id ?? (m as unknown as { userId?: number }).userId ?? m.id) === currentUser?.id ||
            (m.user?.email ?? (m as unknown as { email?: string }).email) === currentUser?.email) &&
          m.role === 'LEADER'
      )
    );
  const membersCount = currentTeam?.members?.length || 0;

  if (loading) {
    return (
      <div
        className="page pad flex flex-col items-center justify-center py-24 space-y-3 text-zinc-400"
        style={{ maxWidth: '1240px', margin: '0 auto' }}
      >
        <Loader2 size={24} className="animate-spin text-indigo-400" />
        <span className="text-xs">Đang tải dữ liệu dự án...</span>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div
        className="page pad flex flex-col items-center justify-center py-24 space-y-3 text-zinc-400"
        style={{ maxWidth: '1240px', margin: '0 auto' }}
      >
        <p className="text-sm font-medium">Không tìm thấy thông tin dự án</p>
        <Link to="/teams" className="text-xs text-indigo-400 hover:underline">
          Quay lại danh sách dự án
        </Link>
      </div>
    );
  }

  // Calculate dynamic metrics for the 4 cards
  const leaderCount = currentTeam.members?.filter((m) => m.role === 'LEADER').length || 0;
  const memberCountOnly = Math.max(0, membersCount - leaderCount);

  const consentedCount = currentTeam.members?.filter((m) => m.hasConsented).length || 0;
  const isAllConsented = membersCount > 0 && consentedCount === membersCount;
  const consentRate = membersCount > 0 ? Math.round((consentedCount / membersCount) * 100) : 0;

  const totalSprints = teamSprints.length;
  const activeSprint = teamSprints.find((s) => s.status === 'ACTIVE') || teamSprints[0];
  const activeSprintNum = activeSprint?.num || 1;
  const activeSprintPeriod = activeSprint?.period || '14 ngày';
  const isCurrentSprintActive = activeSprint?.status === 'ACTIVE';

  return (
    <div
      className="page pad space-y-6"
      style={{ maxWidth: '1240px', margin: '0 auto', overflowY: 'visible' }}
    >
      {/* 1. Linear Minimalist Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="space-y-1.5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <Link to="/teams" className="hover:text-zinc-300 transition-colors">
              Danh sách nhóm
            </Link>
            <ChevronRight size={12} className="text-zinc-600" />
            <span className="text-zinc-300">{currentTeam.name}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>{currentTeam.name}</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              {currentTeam.courseName || 'Học kỳ 1 • 2026-2027'}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
            {currentTeam.description || 'Hệ thống hỗ trợ học tập nhóm, quản lý tiến độ Kanban, đo lường đóng góp đa chiều và đánh giá chéo minh bạch.'}
          </p>
        </div>

        {/* Action Buttons: Linear Solid White & Minimalist Border */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to={`/teams/${currentTeam.id}/board`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 hover:text-white hover:bg-indigo-800/50 transition-colors shadow-xs"
          >
            <Kanban size={13} className="text-indigo-400" />
            <span>Task Board</span>
          </Link>
          <button
            onClick={() => setIsConsentOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Cài đặt Consent</span>
          </button>

          {isLeader && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-sm"
            >
              <UserPlus size={13} />
              <span>+ Mời thành viên</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Linear Metric Cards (Dynamic data, border-zinc-800, Monospace Typography) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Team Members */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121318] border border-zinc-800/80 hover:border-zinc-700/80 transition-colors shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Thành viên nhóm
            </span>
            <Users size={14} className="text-zinc-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight">
              {membersCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">sinh viên</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5 overflow-hidden">
              {currentTeam.members && currentTeam.members.length > 0 ? (
                <>
                  {currentTeam.members.slice(0, 5).map((m, i) => {
                    const name = m.fullName || m.user?.fullName;
                    const email = m.email || m.user?.email;
                    const initials = getMemberInitials(name, email);
                    const isLeaderRole = m.role === 'LEADER';
                    return (
                      <div
                        key={m.id || i}
                        title={`${name || email || 'Thành viên'} (${isLeaderRole ? 'Trưởng nhóm' : 'Thành viên'})`}
                        className={`h-5 w-5 rounded-md border text-[9px] font-bold flex items-center justify-center shrink-0 ${
                          isLeaderRole
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                            : 'border-zinc-700/80 bg-zinc-800/80 text-zinc-300'
                        }`}
                      >
                        {initials}
                      </div>
                    );
                  })}
                  {currentTeam.members.length > 5 && (
                    <div className="h-5 w-5 rounded-md border border-zinc-700/80 bg-zinc-850 text-zinc-400 text-[8px] font-bold flex items-center justify-center shrink-0">
                      +{currentTeam.members.length - 5}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-zinc-500">Chưa có thành viên</span>
              )}
            </div>
            <span className="text-zinc-400 hidden sm:inline truncate pl-1">
              {leaderCount > 0
                ? `${leaderCount} Leader · ${memberCountOnly} Member`
                : `${membersCount} vai trò`}
            </span>
          </div>
        </div>

        {/* Card 2: Consent Status */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121318] border border-zinc-800/80 hover:border-zinc-700/80 transition-colors shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Đồng thuận dữ liệu
            </span>
            <ShieldCheck size={14} className={isAllConsented ? 'text-emerald-400' : 'text-amber-400'} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`font-mono text-2xl sm:text-3xl font-semibold tracking-tight ${isAllConsented ? 'text-emerald-400' : 'text-amber-400'}`}>
              {consentedCount} / {membersCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">ký số</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-mono">
            {isAllConsented ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>100% Đã đồng thuận NĐ 13</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <Clock size={12} />
                <span>{consentRate}% Đang thu thập Consent</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Active Sprint */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121318] border border-zinc-800/80 hover:border-zinc-700/80 transition-colors shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Sprint hiện tại
            </span>
            <Calendar size={14} className="text-zinc-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight">
              {activeSprint ? `Sprint ${activeSprintNum}` : 'Sprint 1'}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              / {totalSprints > 0 ? totalSprints : 1} Sprints
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1 truncate max-w-[170px]" title={activeSprintPeriod}>
              <Clock size={11} className={isCurrentSprintActive ? 'text-amber-400' : 'text-zinc-500'} />
              <span className="truncate">{activeSprintPeriod}</span>
            </span>
            <span className={`font-medium ${isCurrentSprintActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {isCurrentSprintActive ? 'Đang diễn ra' : activeSprint?.status === 'DONE' ? 'Hoàn thành' : 'Kế hoạch'}
            </span>
          </div>
        </div>

        {/* Card 4: Metric Integrations */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121318] border border-zinc-800/80 hover:border-zinc-700/80 transition-colors shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Kênh đo lường
            </span>
            <Layers size={14} className="text-zinc-500" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to={`/teams/${currentTeam.id}/board`}
              className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg flex items-center gap-2 hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors group"
            >
              <Kanban size={13} className="text-sky-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 font-mono truncate">Task Board</div>
                <div className="text-xs font-semibold text-zinc-200 font-mono truncate">{totalCards} thẻ</div>
              </div>
            </Link>
            <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg flex items-center gap-2">
              <GitBranch size={13} className="text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 font-mono truncate">Git Version</div>
                <div className="text-xs font-semibold text-zinc-200 font-mono truncate">main branch</div>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Tự động đồng bộ</span>
            </span>
            <Link
              to={`/teams/${currentTeam.id}/board`}
              className="text-sky-400 hover:underline hover:text-sky-300"
            >
              Bảng việc &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Linear Segmented Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'members'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users size={13} />
            <span>Danh sách thành viên ({membersCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('sprints')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'sprints'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar size={13} />
            <span>Kế hoạch Sprint ({teamSprints.length} Sprints)</span>
          </button>

          <button
            onClick={() => setActiveTab('consent')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'consent'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Chính sách Consent NĐ 13</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Member Table */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Thành viên tham gia đồ án
              </h2>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Quản lý định danh các thành viên và trạng thái kích hoạt Consent chia sẻ minh chứng.
              </p>
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              Mã tham gia: <span className="text-zinc-200 font-bold px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded">{currentTeam.inviteCode}</span>
            </div>
          </div>

          {actionMessage && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-300 flex items-center justify-between">
              <span>{actionMessage}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <MemberTable
            members={currentTeam.members || []}
            isLeader={isLeader}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
          />
        </div>
      )}

      {/* Tab 2: Sprints Roadmap */}
      {activeTab === 'sprints' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Lộ trình Sprints theo Đồ án Môn học
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Theo dõi tiến độ bàn giao từng tuần và đối soát trách nhiệm chuyên môn.
            </p>
          </div>

          {teamSprints.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#121318] border border-zinc-800/80 text-center text-zinc-500 text-xs font-mono">
              Chưa có kế hoạch Sprint nào được khởi tạo cho dự án này.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {teamSprints.map((sp) => {
                const isDone = sp.status === 'DONE';
                const isActive = sp.status === 'ACTIVE';

                return (
                  <div
                    key={sp.num}
                    className={`p-4 rounded-xl border transition-colors ${
                      isActive
                        ? 'bg-[#121318] border-zinc-600/80 shadow-sm'
                        : isDone
                        ? 'bg-[#121318] border-zinc-800/80 opacity-90'
                        : 'bg-[#0f1015] border-zinc-850 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-semibold text-xs text-zinc-200">
                        Sprint {sp.num}: {sp.title}
                      </span>
                      {isDone ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Hoàn thành
                        </span>
                      ) : isActive ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1">
                          Đang diễn ra
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-500">
                          Sắp tới
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-500 font-mono mb-3">{sp.period}</div>

                    <div className="pt-2.5 border-t border-zinc-800/60 text-xs">
                      <div className="font-medium text-zinc-300 mb-1 flex items-center gap-1">
                        <FileText size={12} className="text-zinc-400" />
                        <span>Nhiệm vụ trọng tâm:</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed text-[11px]">{sp.focusTask}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Consent Policy */}
      {activeTab === 'consent' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Chính sách Đồng thuận & Bảo mật Dữ liệu (Nghị định 13/2023/NĐ-CP)
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Đảm bảo quyền riêng tư cá nhân khi minh bạch hóa dữ liệu đo lường học tập.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[#121318] border border-zinc-800/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-mono font-bold text-xs">
                1
              </div>
              <h3 className="font-semibold text-zinc-100 text-sm">Tự nguyện & Minh bạch</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sinh viên có toàn quyền lựa chọn cung cấp minh chứng Trello, commit Git hay chỉ số hoạt động mà không bị bắt buộc.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#121318] border border-zinc-800/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-mono font-bold text-xs">
                2
              </div>
              <h3 className="font-semibold text-zinc-100 text-sm">Mục đích giới hạn</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dữ liệu chỉ được sử dụng nội bộ trong phạm vi học phần Quản lý Dự án CNTT, không chia sẻ cho bên thứ ba.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#121318] border border-zinc-800/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-mono font-bold text-xs">
                3
              </div>
              <h3 className="font-semibold text-zinc-100 text-sm">Quyền rút lại Consent</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Thành viên có thể hủy cấp phép hoặc chỉnh sửa phạm vi chia sẻ bất kỳ lúc nào tại màn hình Hồ sơ & Cài đặt cá nhân.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Consent Dialog */}
      <ConsentDialog
        isOpen={isConsentOpen}
        onClose={() => setIsConsentOpen(false)}
        teamId={team?.id ?? 1}
        onSuccess={() => setIsConsentOpen(false)}
      />

      {/* Invite Member Modal - Linear Style */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#121318] border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-zinc-300" />
                <h3 className="font-semibold text-sm text-zinc-100">Mời thành viên vào đồ án</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="font-medium text-xs text-zinc-100">Đã gửi lời mời thành công!</h4>
                <p className="text-xs text-zinc-400 font-mono">Lời mời đã được chuyển tới {inviteEmail}</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Email thành viên
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex items-start gap-2.5">
                  <AlertCircle size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Thành viên mới sẽ cần đăng nhập vào hệ thống và đồng thuận NĐ 13 trước khi dữ liệu được tổng hợp.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg transition-colors shadow-sm"
                  >
                    Gửi lời mời
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};