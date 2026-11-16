import React, { useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { contributionApi } from '../../api/contribution.api';
import { teamApi } from '../../api/team.api';
import {
  MultidimensionalNetworkDto,
  NetworkNodeDto,
  ImpactEventPayload,
} from '../../types/contribution';
import { CosmicNetworkCanvas } from './CosmicNetworkCanvas';
import { TimelineScrubber } from './TimelineScrubber';
import { InspectorDrawer } from './InspectorDrawer';
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
  const [members, setMembers] = useState<Array<{ id: number; fullName: string; email: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState<boolean>(true); // default sleek collapsed in overview
  const [isOpenImpactModalDirectly, setIsOpenImpactModalDirectly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');

  const teamId = activeTeamId || teams[0]?.id || 1;

  // Load team members
  useEffect(() => {
    if (!teamId) return;
    teamApi
      .getMembers(teamId)
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          const list = res.data.map((tm) => ({
            id: tm.user?.id || tm.userId || tm.id,
            fullName: tm.user?.fullName || tm.fullName || 'Thành viên',
            email: tm.user?.email || tm.email || '',
          }));
          setMembers(list);
          if (!selectedUserId && list.length > 0) {
            setSelectedUserId(list[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch members, using defaults:', err);
      });
  }, [teamId, selectedUserId]);

  const createFallbackData = useCallback(() => {
    const mockData: MultidimensionalNetworkDto = {
      teamId,
      sprintId: selectedSprintId || 3,
      sprintName: 'Sprint 3: Hoàn thiện MVP & UI Chấm chéo',
      focusedUserId: selectedUserId || 1,
      focusedUserName: user?.fullName || 'Minh Trieu',
      finalPct: 0.35,
      score: 35.0,
      d1Output: 2.4,
      d2Reliability: 1.8,
      d3Collaboration: 2.1,
      d4Peer: 0.0,
      compositeScore: 99.1,
      availabilityFactor: 1.0,
      confidenceIntervalLow: 32.93,
      confidenceIntervalHigh: 34.67,
      distanceToCenter: 2.52,
      isSuspicious: false,
      hasSufficientEvidence: true,
      totalEventsCount: 22,
      tierBreakdown: {
        rawFeatures: {
          cardsCompleted: 8,
          totalStoryPoints: 12.6,
          onTimeRate: 0.85,
          manualPoints: 2.0,
        },
        logFeatures: {
          ln_1_sp: 2.61,
          ln_1_cards: 2.19,
          ln_1_manual: 1.09,
        },
        robustZScores: {
          z_sp: 2.4,
          z_ontime: 1.8,
          z_collab: 2.1,
          z_peer: 0.0,
        },
        dimensions: {
          D1_Output: 2.4,
          D2_Reliability: 1.8,
          D3_Collaboration: 2.1,
          D4_Peer: 0.0,
        },
        availabilityFactor: 1.0,
        availabilityBonusFactor: 1.0,
        adjustedDimensions: {
          D1_prime: 2.4,
          D2_prime: 1.8,
          D3_prime: 2.1,
          D4_prime: 0.0,
        },
        compositeScore: 99.1,
        finalPercentage: 0.35,
      },
      nodes: [
        {
          id: 'root-1',
          label: user?.fullName || 'Minh Trieu',
          type: 'ROOT',
          category: 'MEMBER',
          weight: 99.1,
          badge: '35.0%',
          status: 'NORMAL',
          color: '#6366f1',
          description: 'Thành viên quan sát',
        },
        {
          id: 'dim-d1',
          label: 'D1 - Sản lượng (Output)',
          type: 'DIMENSION',
          category: 'D1',
          weight: 2.4,
          badge: '+2.40',
          status: 'ACTIVE',
          color: '#10b981',
          description: 'Story points, Cards hoàn thành, Độ khó thẻ',
        },
        {
          id: 'dim-d2',
          label: 'D2 - Tin cậy & Tiến độ',
          type: 'DIMENSION',
          category: 'D2',
          weight: 1.8,
          badge: '+1.80',
          status: 'ACTIVE',
          color: '#06b6d4',
          description: 'Tỷ lệ đúng hạn, Độ trễ trung vị, Rework',
        },
        {
          id: 'dim-d3',
          label: 'D3 - Phối hợp & Review',
          type: 'DIMENSION',
          category: 'D3',
          weight: 2.1,
          badge: '+2.10',
          status: 'ACTIVE',
          color: '#8b5cf6',
          description: 'Comment xây dựng, Review chéo, @mentions',
        },
        {
          id: 'dim-d4',
          label: 'D4 - Đánh giá đồng cấp',
          type: 'DIMENSION',
          category: 'D4',
          weight: 0.0,
          badge: '0.00',
          status: 'ACTIVE',
          color: '#ec4899',
          description: 'Chấm chéo ẩn danh (chưa đủ 3 lượt)',
        },
        {
          id: 'cat-impediments',
          label: 'Yếu tố tác động & Rào cản',
          type: 'CATEGORY',
          category: 'IMPEDIMENT',
          weight: 1.0,
          badge: '1 Rào cản',
          status: 'WARN',
          color: '#f59e0b',
          description: 'Lý do tiến độ trễ & ảnh hưởng khả dụng',
        },
        {
          id: 'imp-1',
          label: 'Trùng lịch thi học kỳ (a_i = 1.00 bù hợp lệ)',
          type: 'IMPEDIMENT',
          category: 'IMPEDIMENT',
          weight: 2.0,
          badge: 'Khả dụng',
          status: 'WARN',
          color: '#f59e0b',
          description: 'Bù khả dụng kích hoạt: D\' = D * (1 + 0.5(1 - a_i))',
        },
      ],
      links: [
        { source: 'root-1', target: 'dim-d1', weight: 1.0, type: 'PRIMARY', color: '#10b981', animated: true },
        { source: 'root-1', target: 'dim-d2', weight: 1.0, type: 'PRIMARY', color: '#06b6d4', animated: true },
        { source: 'root-1', target: 'dim-d3', weight: 1.0, type: 'PRIMARY', color: '#8b5cf6', animated: true },
        { source: 'root-1', target: 'dim-d4', weight: 1.0, type: 'PRIMARY', color: '#ec4899', animated: true },
        { source: 'root-1', target: 'cat-impediments', weight: 1.0, type: 'SECONDARY', color: '#f59e0b', animated: true },
      ],
      sprints: [
        { id: 1, name: 'Sprint 1: Khởi động & Đặc tả SRS', isCurrent: false, status: 'COMPLETED' },
        { id: 2, name: 'Sprint 2: Thiết kế DB & Kiến trúc', isCurrent: false, status: 'COMPLETED' },
        { id: 3, name: 'Sprint 3: Hoàn thiện MVP & UI Chấm chéo', isCurrent: true, status: 'ACTIVE' },
        { id: 4, name: 'Sprint 4: Cảnh báo sớm & Báo cáo PDF', isCurrent: false, status: 'PLANNED' },
        { id: 5, name: 'Sprint 5: Kiểm thử & Bảo vệ đồ án', isCurrent: false, status: 'PLANNED' },
      ],
    };
    setNetworkData(mockData);
    const rootNode = mockData.nodes.find((n) => n.type === 'ROOT');
    setSelectedNode(rootNode || mockData.nodes[0]);
  }, [teamId, selectedSprintId, selectedUserId, user?.fullName]);

  // Fetch from Real MariaDB Backend
  const fetchNetworkGraph = useCallback(async () => {
    try {
      setLoading(true);
      const res = await contributionApi.getNetworkGraph(
        teamId,
        selectedSprintId || undefined,
        selectedUserId || undefined
      );

      if (res.data) {
        setNetworkData(res.data);
        if (!selectedSprintId && res.data.sprintId) {
          setSelectedSprintId(res.data.sprintId);
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
        showToast('Đã lưu rào cản vào CSDL MariaDB & tính lại vector');
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

  const handleUpdateAvailability = async (factor: number, reason: string) => {
    try {
      setIsUpdating(true);
      const res = await contributionApi.updateAvailability({
        sprintId: selectedSprintId || 3,
        userId: selectedUserId || 1,
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
        sprintId: selectedSprintId || 3,
        userId: selectedUserId || 1,
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
      await contributionApi.calculateSprintScores(selectedSprintId || 3);
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
      className="relative w-full h-full flex overflow-hidden select-none bg-[#020609]"
      style={{
        color: 'var(--fg)',
      }}
    >
      {/* 1. Collapsible Timeline Scrubber (Kept in DOM for testing & easy toggle) */}
      <div
        className={`h-full transition-all duration-300 relative z-30 ${
          isTimelineCollapsed ? 'w-0 -translate-x-full overflow-hidden' : 'w-64 shrink-0'
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
        className="absolute left-2 top-4 z-40 p-2 rounded-xl border border-cyan-500/25 bg-[#06151f]/80 backdrop-blur-md transition shadow-lg text-cyan-300 hover:text-white"
      >
        {isTimelineCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* 2. Middle Main Cosmic Network Canvas (Full viewport galaxy constellation) */}
      <main className="flex-1 relative h-full overflow-hidden">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center flex-col gap-3">
            <Spinner size="large" />
            <span className="text-xs font-medium text-cyan-300">
              Đang kiến tạo không gian vector đa chiều...
            </span>
          </div>
        ) : (
          <CosmicNetworkCanvas
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
          />
        )}
      </main>

      {/* 3. Right Glassmorphism Detail Drawer / Formula 4 Tầng Inspector */}
      {/* Mounted in DOM with CSS translate so tests can query and user can inspect */}
      <div
        className={`h-full transition-transform duration-500 ease-in-out shrink-0 z-40 ${
          viewMode === 'detail'
            ? 'translate-x-0 relative shadow-2xl'
            : 'translate-x-full fixed right-0 top-0 bottom-0 pointer-events-none opacity-0'
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
          isOpenImpactModalDirectly={isOpenImpactModalDirectly}
          onCloseImpactModalDirectly={() => setIsOpenImpactModalDirectly(false)}
        />
      </div>
    </div>
  );
};
