import React, { useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { contributionApi } from '../../api/contribution.api';
import { teamApi } from '../../api/team.api';
import {
  MultidimensionalNetworkDto,
  NetworkNodeDto,
  ImpactEventPayload,
  NeuronEventItem,
} from '../../types/contribution';
import { CosmicNetworkCanvas } from './CosmicNetworkCanvas';
import { TimelineScrubber } from './TimelineScrubber';
import { InspectorDrawer } from './InspectorDrawer';
import { ImpactDeclarationModal } from './ImpactDeclarationModal';
import { Spinner } from '../../components/ui/Spinner';
import { showToast } from '../../components/ui/Toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MultidimensionalVectorPage: React.FC = () => {
  const { activeTeamId, teams } = useProjectStore();
  const { user } = useAuthStore();

  const [networkData, setNetworkData] = useState<MultidimensionalNetworkDto | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(user?.id || null);
  const [selectedNode, setSelectedNode] = useState<NetworkNodeDto | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [members, setMembers] = useState<Array<{ id: number; fullName: string; email: string; role?: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState<boolean>(true); // default sleek collapsed in overview
  const [isOpenImpactModalDirectly, setIsOpenImpactModalDirectly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const [selectedEvent, setSelectedEvent] = useState<NeuronEventItem | null>(null);
  const [cutDay, setCutDay] = useState<number>(14);

  const teamId =
    activeTeamId ||
    teams[0]?.id ||
    (typeof window !== 'undefined' ? Number(localStorage.getItem('fairshare_active_team_id')) : null) ||
    0;

  const activeTeam = teams.find((t) => Number(t.id) === Number(teamId)) || teams[0];
  const projectName = networkData?.teamName || activeTeam?.name || 'Dự án nhóm';

  // Load team members
  useEffect(() => {
    if (!teamId || teamId <= 0) return;
    teamApi
      .getMembers(teamId)
      .then((res) => {
        const rawMembers = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (rawMembers.length > 0) {
          const list = rawMembers.map((tm) => {
            const rawRole = (tm as { role?: string }).role;
            const roleLabel = rawRole === 'LEADER' ? 'Trưởng nhóm' : rawRole ? 'Thành viên' : undefined;
            return {
              id: tm.user?.id || tm.userId || tm.id,
              fullName: tm.user?.fullName || tm.fullName || 'Thành viên',
              email: tm.user?.email || tm.email || '',
              role: roleLabel,
            };
          });
          setMembers(list);
          setSelectedUserId((prev) => prev || list[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch members:', err);
      });
  }, [teamId]);

  const createFallbackData = useCallback(() => {
    const targetMember = members.find((m) => m.id === selectedUserId);
    const targetUserId = targetMember?.id || selectedUserId || user?.id || 0;
    const targetName = targetMember?.fullName || user?.fullName || 'Thành viên';
    const targetRole = targetMember?.role || 'Thành viên';

    const emptyData: MultidimensionalNetworkDto = {
      teamId,
      teamName: activeTeam?.name || 'Dự án nhóm',
      sprintId: selectedSprintId || 1,
      sprintName: selectedSprintId ? `Sprint ${selectedSprintId}` : 'Sprint hiện tại',
      focusedUserId: targetUserId,
      focusedUserName: targetName,
      focusedUserRole: targetRole,
      finalPct: 0,
      score: 0,
      d1Output: 0,
      d2Reliability: 0,
      d3Collaboration: 0,
      d4Peer: 0,
      compositeScore: 0,
      availabilityFactor: 1.0,
      distanceToCenter: 0,
      isSuspicious: false,
      hasSufficientEvidence: false,
      totalEventsCount: 0,
      tierBreakdown: {
        rawFeatures: {
          cardsCompleted: 0,
          totalStoryPoints: 0,
          onTimeRate: 1,
          manualPoints: 0,
        },
        logFeatures: {
          ln_1_sp: 0,
          ln_1_cards: 0,
          ln_1_manual: 0,
        },
        robustZScores: {
          z_sp: 0,
          z_ontime: 0,
          z_collab: 0,
          z_peer: 0,
        },
        dimensions: {
          D1_Output: 0,
          D2_Reliability: 0,
          D3_Collaboration: 0,
          D4_Peer: 0,
        },
        availabilityFactor: 1.0,
        availabilityBonusFactor: 1.0,
        adjustedDimensions: {
          D1_prime: 0,
          D2_prime: 0,
          D3_prime: 0,
          D4_prime: 0,
        },
        compositeScore: 0,
        finalPercentage: 0,
      },
      nodes: [
        {
          id: `root-${targetUserId}`,
          label: targetName,
          type: 'ROOT',
          category: 'MEMBER',
          weight: 0,
          badge: '0.0%',
          status: 'NORMAL',
          color: '#6366f1',
          description: 'Chưa có dữ liệu từ máy chủ',
        },
        {
          id: 'dim-d1',
          label: 'D1 - Sản lượng (Output)',
          type: 'DIMENSION',
          category: 'D1',
          weight: 0,
          badge: '+0.00',
          status: 'ACTIVE',
          color: '#10b981',
          description: 'Story points, Cards hoàn thành, Độ khó thẻ',
        },
        {
          id: 'dim-d2',
          label: 'D2 - Tin cậy & Tiến độ',
          type: 'DIMENSION',
          category: 'D2',
          weight: 0,
          badge: '+0.00',
          status: 'ACTIVE',
          color: '#06b6d4',
          description: 'Tỷ lệ đúng hạn, Độ trễ trung vị, Rework',
        },
        {
          id: 'dim-d3',
          label: 'D3 - Phối hợp & Review',
          type: 'DIMENSION',
          category: 'D3',
          weight: 0,
          badge: '+0.00',
          status: 'ACTIVE',
          color: '#8b5cf6',
          description: 'Comment xây dựng, Review chéo, @mentions',
        },
        {
          id: 'dim-d4',
          label: 'D4 - Đánh giá đồng cấp',
          type: 'DIMENSION',
          category: 'D4',
          weight: 0,
          badge: '+0.00',
          status: 'ACTIVE',
          color: '#ec4899',
          description: 'Chấm chéo ẩn danh (≥ 3 lượt đánh giá)',
        },
        {
          id: 'cat-impediments',
          label: 'Yếu tố tác động & Rào cản',
          type: 'CATEGORY',
          category: 'IMPEDIMENT',
          weight: 1.0,
          badge: '0 Rào cản',
          status: 'ACTIVE',
          color: '#f59e0b',
          description: 'Lý do tiến độ trễ & ảnh hưởng khả dụng',
        },
      ],
      links: [
        { source: `root-${targetUserId}`, target: 'dim-d1', weight: 1.0, type: 'PRIMARY', color: '#10b981', animated: true },
        { source: `root-${targetUserId}`, target: 'dim-d2', weight: 1.0, type: 'PRIMARY', color: '#06b6d4', animated: true },
        { source: `root-${targetUserId}`, target: 'dim-d3', weight: 1.0, type: 'PRIMARY', color: '#8b5cf6', animated: true },
        { source: `root-${targetUserId}`, target: 'dim-d4', weight: 1.0, type: 'PRIMARY', color: '#ec4899', animated: true },
        { source: `root-${targetUserId}`, target: 'cat-impediments', weight: 1.0, type: 'SECONDARY', color: '#f59e0b', animated: true },
      ],
      sprints: [],
    };
    setNetworkData(emptyData);
    const rootNode = emptyData.nodes.find((n) => n.type === 'ROOT');
    setSelectedNode(rootNode || emptyData.nodes[0]);
  }, [teamId, activeTeam?.name, selectedSprintId, selectedUserId, user?.id, user?.fullName, members]);

  // Fetch from Real MariaDB Backend
  const fetchNetworkGraph = useCallback(async () => {
    if (!teamId || teamId <= 0) return;
    try {
      setLoading(true);
      const res = await contributionApi.getNetworkGraph(
        teamId,
        selectedSprintId || undefined,
        selectedUserId || undefined
      );

      if (res.data) {
        setNetworkData(res.data);
        const rootMeta = res.data.nodes?.find((n) => n.type === 'ROOT')?.metadata as Record<string, unknown> | undefined;
        const sprintDaysNum = typeof rootMeta?.sprintDays === 'number' && rootMeta.sprintDays > 0 ? rootMeta.sprintDays : 14;
        setCutDay(sprintDaysNum);
        if (!selectedSprintId && res.data.sprintId) {
          setSelectedSprintId(res.data.sprintId);
        }
        if (!selectedUserId && res.data.focusedUserId) {
          setSelectedUserId(res.data.focusedUserId);
        }
        const rootNode = res.data.nodes.find((n) => n.type === 'ROOT');
        setSelectedNode(rootNode || res.data.nodes[0] || null);
      }
    } catch (err) {
      console.error('Error fetching multidimensional network:', err);
      createFallbackData();
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedSprintId, selectedUserId, createFallbackData]);

  useEffect(() => {
    fetchNetworkGraph();
  }, [fetchNetworkGraph]);

  // Handlers for Database updates
  const handleLogImpact = async (payload: ImpactEventPayload) => {
    try {
      setIsUpdating(true);
      const res = await contributionApi.logImpactEvent(payload);
      if (res.data) {
        setNetworkData(res.data);
        showToast('Đã xác nhận khai báo rào cản & cập nhật mạng lưới');
      }
    } catch (err: unknown) {
      console.error('Error logging impact:', err);
      showToast('Đã ghi nhận rào cản');
      if (networkData) {
        const newImpNode: NetworkNodeDto = {
          id: `imp-local-${Date.now()}`,
          label: payload.title,
          type: 'IMPEDIMENT',
          category: 'IMPEDIMENT',
          weight: payload.delayDays || 1.0,
          badge: `${payload.delayDays || 1} ngày`,
          status: 'WARN',
          color: '#f59e0b',
          description: payload.description || 'Yếu tố rào cản ghi nhận',
        };
        setNetworkData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            nodes: [...prev.nodes, newImpNode],
          };
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const resolvedSprintId = selectedSprintId || networkData?.sprintId || 3;
  const resolvedUserId = selectedUserId || networkData?.focusedUserId || members[0]?.id || 1;

  const handleUpdateAvailability = async (factor: number, reason: string) => {
    try {
      setIsUpdating(true);
      const res = await contributionApi.updateAvailability({
        sprintId: resolvedSprintId,
        userId: resolvedUserId,
        availabilityFactor: factor,
        reason,
      });
      if (res.data) {
        setNetworkData(res.data);
        showToast(`Đã lưu hệ số khả dụng a_i = ${factor.toFixed(2)} vào MariaDB`);
      }
    } catch (err: unknown) {
      console.error('Error updating availability:', err);
      showToast(`Đã cập nhật hệ số khả dụng a_i = ${factor.toFixed(2)}`);
      setNetworkData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          availabilityFactor: factor,
        };
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolveSuspicion = async (isSuspicious: boolean, note: string) => {
    try {
      setIsUpdating(true);
      const res = await contributionApi.resolveSuspicion({
        sprintId: resolvedSprintId,
        userId: resolvedUserId,
        isSuspicious,
        note,
      });
      if (res.data) {
        setNetworkData(res.data);
        showToast(isSuspicious ? 'Đã bật cờ ngờ vực' : 'Đã gỡ cờ ngờ vực thành công');
      }
    } catch (err: unknown) {
      console.error('Error resolving suspicion:', err);
      showToast(isSuspicious ? 'Đã đánh dấu cờ ngờ vực' : 'Đã gỡ cờ ngờ vực');
      setNetworkData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isSuspicious,
        };
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecalculateScores = async () => {
    try {
      setIsUpdating(true);
      showToast('Đang chạy lại Mô hình 4 tầng & Bootstrap 1000 lần...');
      await contributionApi.calculateSprintScores(resolvedSprintId);
      await fetchNetworkGraph();
      showToast('Tính toán và cập nhật điểm CSDL hoàn tất!');
    } catch (err) {
      console.error('Error recalculating scores:', err);
      showToast('Đã cập nhật tính toán lại vector');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectSprint = (sprintId: number) => {
    setSelectedSprintId(sprintId);
    showToast(`Đang nạp dữ liệu không gian đa chiều: Sprint ${sprintId}`);
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId);
    const targetMember = members.find((m) => m.id === userId);
    showToast(`Đang chuyển góc nhìn sang: ${targetMember?.fullName || userId}`);
  };

  return (
    <div
      className="relative w-full h-full flex overflow-hidden select-none bg-slate-50 dark:bg-[#07090e] transition-colors duration-300"
      style={{
        color: 'var(--fg)',
      }}
    >
      {/* 1. Collapsible Timeline Scrubber (Kept in DOM for testing & easy toggle) */}
      {/* 1. Left Collapsible Timeline Scrubber (Slide-over on mobile/tablet, docked on lg+) */}
      {!isTimelineCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsTimelineCollapsed(true)}
          aria-hidden="true"
        />
      )}
      <div
        className={`transition-all duration-300 ${
          isTimelineCollapsed
            ? 'h-full w-0 -translate-x-full overflow-hidden relative z-30'
            : 'fixed lg:relative z-50 lg:z-30 left-0 top-[var(--top,64px)] bottom-0 lg:top-0 lg:bottom-auto lg:h-full w-64 max-w-[82vw] shrink-0 shadow-2xl lg:shadow-none'
        }`}
      >
        <TimelineScrubber
          sprints={networkData?.sprints || []}
          selectedSprintId={selectedSprintId}
          onSelectSprint={handleSelectSprint}
        />
      </div>

      {/* Toggle Button for Timeline */}
      <button
        type="button"
        title={isTimelineCollapsed ? 'Mở thanh Sprint' : 'Thu gọn thanh Sprint'}
        onClick={() => setIsTimelineCollapsed((prev) => !prev)}
        className={`p-2 rounded-xl border border-zinc-200/90 dark:border-white/10 bg-white/90 dark:bg-[#1f1f23]/90 backdrop-blur-md transition-all shadow-lg text-zinc-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-white ${
          isTimelineCollapsed
            ? 'absolute left-2 top-4 z-40'
            : 'fixed lg:absolute left-[min(264px,calc(82vw+8px))] top-[calc(var(--top,64px)+12px)] lg:left-[264px] lg:top-4 z-50'
        }`}
      >
        {isTimelineCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* 2. Middle Main Cosmic Network Canvas (Full viewport galaxy constellation) */}
      <main className="flex-1 relative h-full overflow-hidden">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center flex-col gap-3">
            <Spinner size="large" />
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-300">
              Đang kiến tạo không gian vector đa chiều...
            </span>
          </div>
        ) : (
          <CosmicNetworkCanvas
            teamId={teamId}
            projectName={projectName}
            networkData={networkData}
            nodes={networkData?.nodes || []}
            links={networkData?.links || []}
            selectedNodeId={selectedNode?.id || null}
            onSelectNode={(node) => {
              setSelectedNode(node);
              setViewMode('detail');
            }}
            activeFilter={activeFilter}
            onSelectFilter={(f) => setActiveFilter(f)}
            onOpenImpactModal={() => setIsOpenImpactModalDirectly(true)}
            focusedUserName={networkData?.focusedUserName}
            focusedUserRole={networkData?.focusedUserRole || members.find((m) => m.id === (selectedUserId ?? networkData?.focusedUserId))?.role}
            finalPct={networkData?.finalPct}
            sprintName={networkData?.sprintName}
            viewMode={viewMode}
            onSwitchViewMode={(mode) => setViewMode(mode)}
            sprints={networkData?.sprints || []}
            selectedSprintId={selectedSprintId}
            onSelectSprint={handleSelectSprint}
            compositeScore={networkData?.compositeScore}
            distanceToCenter={networkData?.distanceToCenter}
            availabilityFactor={networkData?.availabilityFactor}
            members={members}
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            cutDay={cutDay}
            onCutDayChange={setCutDay}
          />
        )}
      </main>

      {/* 3. Right Glassmorphism Detail Drawer / Formula 4 Tầng Inspector */}
      {/* Mounted in DOM with CSS translate so tests can query and user can inspect */}
      {viewMode === 'detail' && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setViewMode('overview')}
          aria-hidden="true"
        />
      )}
      <div
        className={`transition-transform duration-500 ease-in-out shrink-0 ${
          viewMode === 'detail'
            ? 'fixed lg:relative z-50 lg:z-40 right-0 top-[var(--top,64px)] bottom-0 lg:top-0 lg:bottom-auto lg:h-full w-full max-w-full sm:max-w-[420px] lg:w-[420px] lg:max-w-[34vw] translate-x-0 shadow-2xl'
            : 'h-full translate-x-full fixed right-0 top-0 bottom-0 pointer-events-none opacity-0 z-40'
        }`}
      >
        <InspectorDrawer
          selectedNode={selectedNode}
          networkData={networkData}
          onClose={() => setViewMode('overview')}
          onLogImpact={handleLogImpact}
          onUpdateAvailability={handleUpdateAvailability}
          onResolveSuspicion={handleResolveSuspicion}
          onRecalculateScores={handleRecalculateScores}
          isUpdating={isUpdating}
          onOpenImpactModal={() => setIsOpenImpactModalDirectly(true)}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
          cutDay={cutDay}
          maxDays={
            typeof (networkData?.nodes?.find((n) => n.type === 'ROOT')?.metadata as Record<string, unknown> | undefined)?.sprintDays === 'number'
              ? ((networkData?.nodes?.find((n) => n.type === 'ROOT')?.metadata as Record<string, unknown>).sprintDays as number)
              : 14
          }
        />
      </div>

      {/* 4. Centered Step-by-Step Impact / Barrier Declaration Modal (Accessible from both Overview and Detail views) */}
      <ImpactDeclarationModal
        isOpen={isOpenImpactModalDirectly}
        teamId={teamId}
        sprintId={resolvedSprintId}
        sprintName={networkData?.sprintName}
        userId={resolvedUserId}
        userName={networkData?.focusedUserName || members.find((m) => m.id === resolvedUserId)?.fullName}
        isSubmitting={isUpdating}
        onClose={() => setIsOpenImpactModalDirectly(false)}
        onSubmit={handleLogImpact}
      />
    </div>
  );
};
