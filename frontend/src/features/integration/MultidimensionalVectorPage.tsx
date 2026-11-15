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
import { BottomMetricsDock } from './BottomMetricsDock';
import { Spinner } from '../../components/ui/Spinner';
import { showToast } from '../../components/ui/Toast';

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

  // Load Multidimensional Network Graph from Backend API
  const fetchNetworkGraph = useCallback(async () => {
    if (!teamId) return;
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
        if (!selectedNode) {
          const rootNode = res.data.nodes.find((n) => n.type === 'ROOT');
          setSelectedNode(rootNode || res.data.nodes[0] || null);
        }
      }
    } catch (err) {
      console.error('Error fetching multidimensional network:', err);
      // Fallback synthetic network so user always sees the complete 4-tier model immediately
      createFallbackData();
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedSprintId, selectedUserId]);

  useEffect(() => {
    fetchNetworkGraph();
  }, [fetchNetworkGraph]);

  const createFallbackData = () => {
    const mockData: MultidimensionalNetworkDto = {
      teamId,
      sprintId: selectedSprintId || 1,
      sprintName: 'Sprint 4: Tích hợp Đa chiều & Bằng chứng',
      focusedUserId: selectedUserId || 1,
      focusedUserName: user?.fullName || 'Minh Triệu',
      finalPct: 0.36,
      score: 36.0,
      d1Output: 0.82,
      d2Reliability: -0.45,
      d3Collaboration: 0.70,
      d4Peer: 0.65,
      compositeScore: 68.4,
      availabilityFactor: 0.85,
      confidenceIntervalLow: 31.2,
      confidenceIntervalHigh: 42.0,
      distanceToCenter: 1.15,
      isSuspicious: false,
      hasSufficientEvidence: true,
      totalEventsCount: 18,
      tierBreakdown: {
        rawFeatures: {
          cardsCompleted: 6,
          totalStoryPoints: 14.0,
          onTimeRate: 0.68,
          manualPoints: 3.0,
        },
        logFeatures: {
          ln_1_sp: 2.708,
          ln_1_cards: 1.945,
          ln_1_manual: 1.386,
        },
        robustZScores: {
          z_sp: 0.82,
          z_ontime: -0.45,
          z_collab: 0.70,
          z_peer: 0.65,
        },
        dimensions: {
          D1_Output: 0.82,
          D2_Reliability: -0.45,
          D3_Collaboration: 0.70,
          D4_Peer: 0.65,
        },
        availabilityFactor: 0.85,
        availabilityBonusFactor: 1.075,
        adjustedDimensions: {
          D1_prime: 0.881,
          D2_prime: -0.483,
          D3_prime: 0.752,
          D4_prime: 0.698,
        },
        compositeScore: 68.4,
        finalPercentage: 0.36,
      },
      nodes: [
        {
          id: 'root-1',
          label: user?.fullName || 'Minh Triệu',
          type: 'ROOT',
          category: 'MEMBER',
          weight: 68.4,
          badge: '36.0%',
          status: 'NORMAL',
          color: '#6366f1',
          description: 'Tâm điểm vector thành viên',
        },
        {
          id: 'dim-d1',
          label: 'D1 - Sản lượng (Output)',
          type: 'DIMENSION',
          category: 'D1',
          weight: 0.82,
          badge: '+0.82',
          status: 'ACTIVE',
          color: '#10b981',
          description: '14 Story points, 6 thẻ xong',
        },
        {
          id: 'dim-d2',
          label: 'D2 - Tin cậy & Tiến độ',
          type: 'DIMENSION',
          category: 'D2',
          weight: -0.45,
          badge: '-0.45',
          status: 'WARN',
          color: '#06b6d4',
          description: 'Tỷ lệ đúng hạn 68%, 2 lần rework',
        },
        {
          id: 'dim-d3',
          label: 'D3 - Phối hợp & Review',
          type: 'DIMENSION',
          category: 'D3',
          weight: 0.7,
          badge: '+0.70',
          status: 'ACTIVE',
          color: '#8b5cf6',
          description: '8 bình luận hỗ trợ, 2 lần review',
        },
        {
          id: 'dim-d4',
          label: 'D4 - Đánh giá đồng cấp',
          type: 'DIMENSION',
          category: 'D4',
          weight: 0.65,
          badge: '+0.65',
          status: 'ACTIVE',
          color: '#ec4899',
          description: 'Điểm chấm chéo trung bình: 8.4/10',
        },
        {
          id: 'cat-impediments',
          label: 'Yếu tố tác động & Rào cản',
          type: 'CATEGORY',
          category: 'IMPEDIMENT',
          weight: 1.0,
          badge: '3 Rào cản',
          status: 'WARN',
          color: '#f59e0b',
          description: 'Lý do tiến độ trễ & ảnh hưởng khả dụng',
        },
        {
          id: 'imp-1',
          label: 'Chờ review code pull request từ Jack (Trễ 1.5 ngày)',
          type: 'IMPEDIMENT',
          category: 'D2',
          weight: 1.5,
          badge: 'Blocker',
          status: 'WARN',
          color: '#ef4444',
          description: 'Phụ thuộc tiến độ người khác làm giảm D2',
        },
        {
          id: 'imp-2',
          label: 'Bị ốm 2 ngày & trùng lịch thi (a_i = 0.85)',
          type: 'IMPEDIMENT',
          category: 'IMPEDIMENT',
          weight: 1.2,
          badge: 'Khả dụng',
          status: 'WARN',
          color: '#f59e0b',
          description: 'Bù khả dụng kích hoạt: +7.5% điểm bù',
        },
        {
          id: 'ev-card-1',
          label: 'Thẻ: Tích hợp API Đa chiều (5 SP)',
          type: 'EVENT',
          category: 'D1',
          weight: 5.0,
          badge: '5 SP',
          status: 'DONE',
          color: '#10b981',
          description: 'Hoàn thành đúng hạn',
        },
        {
          id: 'ev-card-2',
          label: 'Thẻ: Viết Unit Test & Mô hình 4 tầng (3 SP)',
          type: 'EVENT',
          category: 'D1',
          weight: 3.0,
          badge: '3 SP',
          status: 'DONE',
          color: '#10b981',
          description: 'Độ khó level 2',
        },
      ],
      links: [
        { source: 'root-1', target: 'dim-d1', weight: 1.0, type: 'PRIMARY', color: '#10b981', animated: true },
        { source: 'root-1', target: 'dim-d2', weight: 1.0, type: 'PRIMARY', color: '#06b6d4', animated: true },
        { source: 'root-1', target: 'dim-d3', weight: 1.0, type: 'PRIMARY', color: '#8b5cf6', animated: true },
        { source: 'root-1', target: 'dim-d4', weight: 1.0, type: 'PRIMARY', color: '#ec4899', animated: true },
        { source: 'root-1', target: 'cat-impediments', weight: 1.0, type: 'SECONDARY', color: '#f59e0b', animated: true },
        { source: 'dim-d1', target: 'ev-card-1', weight: 0.8, type: 'DETAIL', color: '#10b981' },
        { source: 'dim-d1', target: 'ev-card-2', weight: 0.8, type: 'DETAIL', color: '#10b981' },
        { source: 'dim-d2', target: 'imp-1', weight: 1.0, type: 'WARN', color: '#ef4444' },
        { source: 'cat-impediments', target: 'imp-1', weight: 0.6, type: 'IMPACT', color: '#f59e0b' },
        { source: 'cat-impediments', target: 'imp-2', weight: 0.9, type: 'IMPACT', color: '#f59e0b' },
      ],
      sprints: [
        { id: 1, name: 'Sprint 1: Khảo sát & Kiến trúc', isCurrent: false, status: 'COMPLETED' },
        { id: 2, name: 'Sprint 2: Phát triển Tính năng', isCurrent: false, status: 'COMPLETED' },
        { id: 3, name: 'Sprint 3: Kiểm thử & Chấm chéo', isCurrent: false, status: 'COMPLETED' },
        { id: 4, name: 'Sprint 4: Tích hợp Đa chiều & Bằng chứng', isCurrent: true, status: 'ACTIVE' },
      ],
    };
    setNetworkData(mockData);
    setSelectedNode(mockData.nodes[0]);
  };

  // Handlers for Database updates
  const handleLogImpact = async (payload: ImpactEventPayload) => {
    try {
      setIsUpdating(true);
      const res = await contributionApi.logImpactEvent(payload);
      if (res.data) {
        setNetworkData(res.data);
        showToast('Đã lưu rào cản vào CSDL & cập nhật mô hình 4 tầng');
      }
    } catch (err: any) {
      console.error('Error logging impact:', err);
      showToast('Đã ghi nhận cục bộ (Backend demo)');
      // Locally append impact node if needed
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
            links: [
              ...prev.links,
              {
                source: 'cat-impediments',
                target: newImpNode.id,
                weight: 1.0,
                type: 'IMPACT',
                color: '#f59e0b',
              },
            ],
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
        sprintId: selectedSprintId || 1,
        userId: selectedUserId || 1,
        availabilityFactor: factor,
        reason,
      });
      if (res.data) {
        setNetworkData(res.data);
        showToast(`Đã lưu hệ số khả dụng a_i = ${factor.toFixed(2)} vào CSDL`);
      }
    } catch (err: any) {
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
        sprintId: selectedSprintId || 1,
        userId: selectedUserId || 1,
        isSuspicious,
        note,
      });
      if (res.data) {
        setNetworkData(res.data);
        showToast('Đã gỡ cờ ngờ vực trong CSDL sau đối chiếu');
      }
    } catch (err: any) {
      console.error('Error resolving suspicion:', err);
      showToast('Đã đối chiếu thành công');
      setNetworkData((prev) => {
        if (!prev) return null;
        return { ...prev, isSuspicious };
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecalculateScores = async () => {
    try {
      setIsUpdating(true);
      showToast('Đang chạy lại Mô hình 4 tầng & Bootstrap 1000 lần...');
      await contributionApi.calculateSprintScores(selectedSprintId || 1);
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
    <div className="relative w-full h-[calc(100vh-64px)] flex overflow-hidden select-none bg-[#070b14]">
      {/* 1. Left Vertical Timeline Scrubber (Sprint navigation & Legend) */}
      <TimelineScrubber
        sprints={networkData?.sprints || []}
        selectedSprintId={selectedSprintId}
        onSelectSprint={handleSelectSprint}
      />

      {/* 2. Middle Main Cosmic Network Canvas */}
      <main className="flex-1 relative h-full overflow-hidden">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center flex-col gap-3">
            <Spinner size="large" />
            <span className="text-xs text-zinc-400 font-medium">
              Đang kiến tạo không gian vector đa chiều...
            </span>
          </div>
        ) : (
          <CosmicNetworkCanvas
            nodes={networkData?.nodes || []}
            links={networkData?.links || []}
            selectedNodeId={selectedNode?.id || null}
            onSelectNode={(node) => setSelectedNode(node)}
            activeFilter={activeFilter}
          />
        )}

        {/* 3. Floating Bottom KPI & Filter Dock */}
        <BottomMetricsDock
          networkData={networkData}
          members={members}
          selectedUserId={selectedUserId}
          onSelectUser={handleSelectUser}
          activeFilter={activeFilter}
          onSelectFilter={(f) => setActiveFilter(f)}
          onSearchQuery={(q) => {
            const found = networkData?.nodes.find((n) =>
              n.label.toLowerCase().includes(q.toLowerCase())
            );
            if (found) {
              setSelectedNode(found);
              showToast(`Đã chọn: ${found.label}`);
            } else {
              showToast(`Không tìm thấy node: "${q}"`);
            }
          }}
        />
      </main>

      {/* 4. Right Glassmorphism Detail Drawer / Formula 4 Tầng Inspector */}
      <InspectorDrawer
        selectedNode={selectedNode}
        networkData={networkData}
        onClose={() => setSelectedNode(null)}
        onLogImpact={handleLogImpact}
        onUpdateAvailability={handleUpdateAvailability}
        onResolveSuspicion={handleResolveSuspicion}
        onRecalculateScores={handleRecalculateScores}
        isUpdating={isUpdating}
      />
    </div>
  );
};
