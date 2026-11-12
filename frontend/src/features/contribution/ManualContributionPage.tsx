import React, { useState, useEffect } from 'react';
import { ManualContributionForm } from '../dashboard/ManualContributionForm';
import { PendingContributionsList, MemberInfo } from '../dashboard/PendingContributionsList';
import { ManualContributionItem } from '../../types/contribution';
import { Sparkles, ArrowLeft, ShieldCheck, UserCheck, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';
import { teamApi } from '../../api/team.api';
import { peerReviewApi } from '../../api/peerReview.api';

interface SprintOption {
  id: number;
  name: string;
  isCurrent?: boolean;
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
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  // Đồng bộ danh sách Sprints thực tế của dự án
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

  // Đồng bộ danh sách thành viên thực tế của dự án
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
            };
          });
          setAvailableUsers(list);

          // Nếu user đang đăng nhập nằm trong nhóm, chọn user đó; nếu không chọn thành viên đầu tiên
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
            { id: user.id, name: user.fullName || 'Người dùng hiện tại', role: 'Thành viên' },
          ]);
          setCurrentUserId(user.id);
        }
      });
    return () => {
      mounted = false;
    };
  }, [currentTeamId, user?.id, user?.fullName]);

  const handleFormSuccess = (newItem: ManualContributionItem) => {
    setRefreshTrigger((prev) => prev + 1);
    setSuccessBanner(
      `Đã thêm công việc "${newItem.taskName}" (${newItem.storyPoints} SP) vào hàng đợi xét duyệt!`
    );
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleReviewed = (item: ManualContributionItem, action: 'APPROVE' | 'REJECT') => {
    setSuccessBanner(
      `Đã ${action === 'APPROVE' ? 'DUYỆT' : 'TỪ CHỐI'} đóng góp "${item.taskName}". Hệ thống đã cập nhật số liệu!`
    );
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  return (
    <div
      className="page pad space-y-6"
      data-testid="manual-contribution-page"
      style={{ maxWidth: '1240px', margin: '0 auto', overflowY: 'visible' }}
    >
      {/* Header Điều hướng & Tiêu đề tinh gọn chuẩn web thật */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="space-y-1.5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <Link
              to="/dashboard"
              className="hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={12} />
              <span>Dashboard</span>
            </Link>
            <ChevronRight size={12} className="text-zinc-600" />
            <span className="text-zinc-300">Đóng góp ngoài Task Board</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Khai báo &amp; Xét duyệt đóng góp</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
            Ghi nhận minh chứng độc lập (tài liệu, thiết kế, nghiên cứu) và xét duyệt chéo giữa các thành viên.
          </p>
        </div>

        {/* 2 Dropdown đồng bộ: Sprint và Thành viên */}
        <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
          {/* Dropdown 1: Sprint */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121318] border border-zinc-800/90 text-xs">
            <span className="text-zinc-500 font-mono">Sprint:</span>
            <select
              aria-label="Chọn Sprint"
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(Number(e.target.value))}
              className="bg-transparent text-zinc-200 font-medium font-mono focus:outline-none cursor-pointer text-xs"
            >
              {sprints.map((sp) => (
                <option key={sp.id} value={sp.id} className="bg-zinc-900 text-zinc-200">
                  {sp.name} {sp.isCurrent ? '• Đang chạy' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Thao tác với tư cách thành viên */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121318] border border-zinc-800/90 text-xs">
            <UserCheck size={14} className="text-indigo-400 shrink-0" />
            <span className="text-zinc-500 font-mono">Tài khoản:</span>
            <select
              data-testid="user-switcher-select"
              aria-label="Thao tác với tư cách"
              value={currentUserId}
              onChange={(e) => setCurrentUserId(Number(e.target.value))}
              className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer text-xs max-w-[220px] truncate"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id} className="bg-zinc-900 text-zinc-200">
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Thông báo banner khi thao tác thành công */}
      {successBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
          <Sparkles size={15} className="shrink-0 text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Anti-Fraud Banner - Viết lại ngắn gọn, rõ ràng, không lộ code biến */}
      <div className="p-4 rounded-xl bg-[#121318] border border-zinc-800/80 flex items-start gap-3 shadow-xs">
        <ShieldCheck size={18} className="text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-zinc-400">
          <strong className="text-zinc-200 block mb-1">
            Nguyên tắc đánh giá chéo công bằng (Anti-Fraud Gate)
          </strong>
          Thành viên không được phép tự phê duyệt bài đóng góp do chính mình khai báo. Mọi minh chứng phải được ít nhất một thành viên khác trong nhóm kiểm tra và xác nhận trước khi điểm được ghi nhận chính thức vào hệ thống.
        </div>
      </div>

      {/* Grid 2 cột: Bên trái Form khai báo - Bên phải Danh sách chờ duyệt */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <ManualContributionForm
            teamId={currentTeamId}
            sprintId={selectedSprintId}
            userId={currentUserId}
            onSuccess={handleFormSuccess}
          />
        </div>

        <div className="lg:col-span-7">
          <PendingContributionsList
            teamId={currentTeamId}
            sprintId={selectedSprintId}
            currentUserId={currentUserId}
            members={availableUsers}
            refreshTrigger={refreshTrigger}
            onReviewed={handleReviewed}
          />
        </div>
      </div>
    </div>
  );
};
