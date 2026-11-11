import React, { useState, useEffect } from 'react';
import { ManualContributionForm } from '../dashboard/ManualContributionForm';
import { PendingContributionsList } from '../dashboard/PendingContributionsList';
import { ManualContributionItem } from '../../types/contribution';
import { Sparkles, ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';
import { teamApi } from '../../api/team.api';

interface SwitcherUser {
  id: number;
  name: string;
  role: string;
}

const DEMO_USERS: SwitcherUser[] = [
  { id: 4, name: 'Ngô Trọng Phúc (M3 - Data & Dashboard)', role: 'FE/DB' },
  { id: 2, name: 'Hà Ngọc Thiện (M2 - BA & Board)', role: 'BA' },
  { id: 3, name: 'Nguyễn Phúc Vương (M1 - Backend)', role: 'BE' },
  { id: 1, name: 'Võ Minh Triều (Leader)', role: 'Lead' },
  { id: 5, name: 'Trần Thị Bích (M4 - QA)', role: 'QA' },
  { id: 6, name: 'Lê Hoàng Nam (M5 - DevOps)', role: 'DevOps' },
];

export const ManualContributionPage: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1));

  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  const { user } = useAuthStore();
  const [currentUserId, setCurrentUserId] = useState<number>(user?.id || 4);
  const [selectedSprintId, setSelectedSprintId] = useState<number>(4);
  const [availableUsers, setAvailableUsers] = useState<SwitcherUser[]>(DEMO_USERS);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    teamApi
      .getMembers(currentTeamId)
      .then((res) => {
        if (!mounted) return;
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setAvailableUsers(
            res.data.map((m) => {
              const raw = m as unknown as { userId?: number; fullName?: string };
              const uId = m.user?.id ?? raw.userId ?? m.id;
              const uName = m.user?.fullName ?? raw.fullName ?? `Thành viên #${uId}`;
              return {
                id: uId,
                name: `${uName} (${m.role === 'LEADER' ? 'Leader' : 'Thành viên'})`,
                role: m.role,
              };
            })
          );
        }
      })
      .catch(() => {
        // Fallback to DEMO_USERS
      });
    return () => {
      mounted = false;
    };
  }, [currentTeamId]);

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
    <div className="page pad" data-testid="manual-contribution-page">
      {/* Header Điều hướng & Tiêu đề theo mẫu sample_ui */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link
              to="/dashboard"
              className="btn ghost"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <ArrowLeft size={12} />
              Dashboard
            </Link>
            <span>Đóng góp ngoài Board · CR-02 &amp; M3</span>
          </div>
          <h1>Khai báo &amp; Xét duyệt đóng góp thủ công</h1>
          <p className="lede">
            Ghi nhận công việc ngoài Task Board (Figma, SRS, Tech Research) và xét duyệt chéo chống gian lận (Anti-Fraud Gate).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              fontSize: '0.75rem',
            }}
          >
            <span style={{ color: 'var(--fg3)' }}>Sprint:</span>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(Number(e.target.value))}
              style={{
                background: 'var(--surface2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '0.2rem 0.45rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {[1, 2, 3, 4].map((sp) => (
                <option key={sp} value={sp}>
                  Sprint {sp}
                </option>
              ))}
            </select>
          </div>

          {/* User Switcher phục vụ kiểm thử Anti-Fraud linh hoạt */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              fontSize: '0.75rem',
            }}
          >
            <UserCheck size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--fg3)' }}>Thao tác với tư cách:</span>
            <select
              data-testid="user-switcher-select"
              value={currentUserId}
              onChange={(e) => setCurrentUserId(Number(e.target.value))}
              style={{
                background: 'var(--surface2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '0.2rem 0.45rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Thông báo banner khi thao tác thành công */}
      {successBanner && (
        <div
          style={{
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '10px',
            border: '1px solid color-mix(in srgb, var(--ok) 40%, var(--line))',
            background: 'color-mix(in srgb, var(--ok) 12%, var(--surface))',
            padding: '0.75rem 1rem',
            fontSize: '0.8rem',
            color: 'var(--ok)',
          }}
        >
          <Sparkles size={15} />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Anti-Fraud Banner */}
      <div
        className="panel"
        style={{
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: 'color-mix(in srgb, var(--accent) 8%, var(--surface))',
          borderColor: 'color-mix(in srgb, var(--accent) 30%, var(--line))',
        }}
      >
        <ShieldCheck size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.15rem' }} />
        <div style={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--fg2)' }}>
          <strong style={{ color: 'var(--fg)', display: 'block', marginBottom: '0.15rem' }}>
            Quy tắc chống gian lận (Anti-Fraud Gate)
          </strong>
          Hệ thống không cho phép thành viên tự duyệt hoặc tự cho điểm đóng góp của chính mình (
          <code style={{ color: 'var(--accent)' }}>currentUserId === item.userId</code>). Mọi đóng góp bắt buộc phải được
          thành viên khác trong nhóm kiểm tra minh chứng trước khi tích hợp vào điểm tổng kết trên Dashboard.
        </div>
      </div>

      {/* Grid 2 cột: Bên trái Form khai báo - Bên phải Danh sách chờ duyệt */}
      <div className="grid2">
        <div>
          <ManualContributionForm
            teamId={currentTeamId}
            sprintId={selectedSprintId}
            userId={currentUserId}
            onSuccess={handleFormSuccess}
          />
        </div>

        <div>
          <PendingContributionsList
            teamId={currentTeamId}
            sprintId={selectedSprintId}
            currentUserId={currentUserId}
            refreshTrigger={refreshTrigger}
            onReviewed={handleReviewed}
          />
        </div>
      </div>
    </div>
  );
};
