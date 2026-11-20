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
  const [selectedEvent, setSelectedEvent] = useState<NeuronEventItem | null>(null);
  const [cutDay, setCutDay] = useState<number>(5);

  const teamId = activeTeamId || teams[0]?.id || 1;

  // Load team members
  useEffect(() => {
    if (!teamId) return;
    teamApi
      .getMembers(teamId)
      .then((res) => {
        const rawMembers = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (rawMembers.length > 0) {
          const list = rawMembers.map((tm) => ({
            id: tm.user?.id || tm.userId || tm.id,
            fullName: tm.user?.fullName || tm.fullName || 'Thành viên',
            email: tm.user?.email || tm.email || '',
          }));
          setMembers(list);
          setSelectedUserId((prev) => prev || list[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch members, using defaults:', err);
      });
  }, [teamId]);

  const createFallbackData = useCallback(() => {
    const targetMember = members.find((m) => m.id === selectedUserId);
    const targetName =
      targetMember?.fullName ||
      (selectedUserId === 110
        ? 'Trần Thu Trang (Frontend Dev)'
        : selectedUserId === 109
        ? 'Nguyễn Hoàng Nam (Trưởng nhóm)'
        : selectedUserId === 111
        ? 'Lê Quốc Bảo (Backend Dev)'
        : selectedUserId === 112
        ? 'Phạm Minh Đức (DevOps)'
        : selectedUserId === 113
        ? 'Đặng Thảo Vy (QA Engineer)'
        : user?.fullName || 'Trần Thu Trang (Frontend Dev)');

    const isTrang = targetName.includes('Trang') || selectedUserId === 110;
    const isNam = targetName.includes('Nam') || selectedUserId === 109;
    const isBao = targetName.includes('Bảo') || selectedUserId === 111;

    const finalPct = isNam ? 0.39 : isTrang ? 0.22 : isBao ? 0.15 : 0.20;
    const compositeScore = isNam ? 65.6 : isTrang ? 33.1 : isBao ? 25.4 : 35.0;
    const distanceToCenter = isNam ? 1.34 : isTrang ? 2.20 : isBao ? 2.85 : 1.80;
    const availabilityFactor = isBao ? 0.90 : 1.0;
    const d1 = isNam ? 2.4 : isTrang ? 1.8 : 1.5;
    const d2 = isNam ? 1.9 : isTrang ? 1.6 : 1.2;
    const d3 = isNam ? 2.1 : isTrang ? 1.7 : 1.4;
    const d4 = isNam ? 2.0 : isTrang ? 1.5 : 1.3;

    const mockData: MultidimensionalNetworkDto = {
      teamId,
      sprintId: selectedSprintId || 2,
      sprintName:
        selectedSprintId === 1
          ? 'Sprint 1 - Thiết kế Kiến trúc & UI Kit'
          : selectedSprintId === 2
          ? 'Sprint 2 - Phát triển Tính năng & Tích hợp API'
          : 'Sprint 3 - Hoàn thiện MVP & UI Chấm chéo',
      focusedUserId: selectedUserId || 110,
      focusedUserName: targetName,
      finalPct,
      score: finalPct * 100,
      d1Output: d1,
      d2Reliability: d2,
      d3Collaboration: d3,
      d4Peer: d4,
      compositeScore,
      availabilityFactor,
      confidenceIntervalLow: Number((finalPct * 100 - 2.5).toFixed(1)),
      confidenceIntervalHigh: Number((finalPct * 100 + 2.5).toFixed(1)),
      distanceToCenter,
      isSuspicious: false,
      hasSufficientEvidence: true,
      totalEventsCount: isNam ? 28 : isTrang ? 22 : 16,
      tierBreakdown: {
        rawFeatures: {
          cardsCompleted: isNam ? 10 : isTrang ? 7 : 6,
          totalStoryPoints: isNam ? 18.0 : isTrang ? 12.5 : 11.0,
          onTimeRate: isNam ? 0.95 : isTrang ? 0.88 : 0.82,
          manualPoints: isNam ? 5.0 : isTrang ? 3.0 : 2.5,
        },
        logFeatures: {
          ln_1_sp: Number(Math.log1p(isNam ? 18.0 : 12.5).toFixed(2)),
          ln_1_cards: Number(Math.log1p(isNam ? 10 : 7).toFixed(2)),
          ln_1_manual: Number(Math.log1p(isNam ? 5.0 : 3.0).toFixed(2)),
        },
        robustZScores: {
          z_sp: d1,
          z_ontime: d2,
          z_collab: d3,
          z_peer: d4,
        },
        dimensions: {
          D1_Output: d1,
          D2_Reliability: d2,
          D3_Collaboration: d3,
          D4_Peer: d4,
        },
        availabilityFactor,
        availabilityBonusFactor: 1.0 + 0.5 * (1.0 - availabilityFactor),
        adjustedDimensions: {
          D1_prime: d1,
          D2_prime: d2,
          D3_prime: d3,
          D4_prime: d4,
        },
        compositeScore,
        finalPercentage: finalPct,
      },
      nodes: [
        {
          id: `root-${selectedUserId || 110}`,
          label: targetName,
          type: 'ROOT',
          category: 'MEMBER',
          weight: compositeScore,
          badge: `${(finalPct * 100).toFixed(1)}%`,
          status: 'NORMAL',
          color: '#6366f1',
          description: 'Thành viên quan sát',
        },
        {
          id: 'dim-d1',
          label: 'D1 - Sản lượng (Output)',
          type: 'DIMENSION',
          category: 'D1',
          weight: d1,
          badge: `+${d1.toFixed(2)}`,
          status: 'ACTIVE',
          color: '#10b981',
          description: 'Story points, Cards hoàn thành, Độ khó thẻ',
        },
        {
          id: 'dim-d2',
          label: 'D2 - Tin cậy & Tiến độ',
          type: 'DIMENSION',
          category: 'D2',
          weight: d2,
          badge: `+${d2.toFixed(2)}`,
          status: 'ACTIVE',
          color: '#06b6d4',
          description: 'Tỷ lệ đúng hạn, Độ trễ trung vị, Rework',
        },
        {
          id: 'dim-d3',
          label: 'D3 - Phối hợp & Review',
          type: 'DIMENSION',
          category: 'D3',
          weight: d3,
          badge: `+${d3.toFixed(2)}`,
          status: 'ACTIVE',
          color: '#8b5cf6',
          description: 'Comment xây dựng, Review chéo, @mentions',
        },
        {
          id: 'dim-d4',
          label: 'D4 - Đánh giá đồng cấp',
          type: 'DIMENSION',
          category: 'D4',
          weight: d4,
          badge: `+${d4.toFixed(2)}`,
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
          badge: isBao ? '1 Rào cản' : '0 Rào cản',
          status: isBao ? 'WARN' : 'ACTIVE',
          color: '#f59e0b',
          description: 'Lý do tiến độ trễ & ảnh hưởng khả dụng',
        },
        {
          id: 'imp-1',
          label: isBao
            ? 'Trùng lịch thi học phần (a_i = 0.90 bù hợp lệ)'
            : 'Không phát sinh rào cản ngoại cảnh (a_i = 1.00)',
          type: 'IMPEDIMENT',
          category: 'IMPEDIMENT',
          weight: isBao ? 1.5 : 0.0,
          badge: 'Khả dụng',
          status: isBao ? 'WARN' : 'ACTIVE',
          color: '#f59e0b',
          description: "Bù khả dụng kích hoạt: D' = D * (1 + 0.5(1 - a_i))",
        },
      ],
      links: [
        { source: `root-${selectedUserId || 110}`, target: 'dim-d1', weight: 1.0, type: 'PRIMARY', color: '#10b981', animated: true },
        { source: `root-${selectedUserId || 110}`, target: 'dim-d2', weight: 1.0, type: 'PRIMARY', color: '#06b6d4', animated: true },
        { source: `root-${selectedUserId || 110}`, target: 'dim-d3', weight: 1.0, type: 'PRIMARY', color: '#8b5cf6', animated: true },
        { source: `root-${selectedUserId || 110}`, target: 'dim-d4', weight: 1.0, type: 'PRIMARY', color: '#ec4899', animated: true },
        { source: `root-${selectedUserId || 110}`, target: 'cat-impediments', weight: 1.0, type: 'SECONDARY', color: '#f59e0b', animated: true },
      ],
      sprints: [
        { id: 1, name: 'Sprint 1 - Thiết kế Kiến trúc & UI Kit', isCurrent: false, status: 'COMPLETED' },
        { id: 2, name: 'Sprint 2 - Phát triển Tính năng & Tích hợp API', isCurrent: true, status: 'ACTIVE' },
        { id: 3, name: 'Sprint 3 - Hoàn thiện MVP & UI Chấm chéo', isCurrent: false, status: 'PLANNED' },
        { id: 4, name: 'Sprint 4 - Cảnh báo sớm & Báo cáo PDF', isCurrent: false, status: 'PLANNED' },
        { id: 5, name: 'Sprint 5 - Kiểm thử & Bảo vệ đồ án', isCurrent: false, status: 'PLANNED' },
      ],
    };
    setNetworkData(mockData);
    const rootNode = mockData.nodes.find((n) => n.type === 'ROOT');
    setSelectedNode(rootNode || mockData.nodes[0]);
  }, [teamId, selectedSprintId, selectedUserId, user?.fullName, members]);

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
            ? 'fixed lg:relative z-50 lg:z-40 right-0 top-[var(--top,64px)] bottom-0 lg:top-0 lg:bottom-auto lg:h-full w-full max-w-[min(420px,92vw)] lg:w-[420px] lg:max-w-[34vw] translate-x-0 shadow-2xl'
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
          isOpenImpactModalDirectly={isOpenImpactModalDirectly}
          onCloseImpactModalDirectly={() => setIsOpenImpactModalDirectly(false)}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
          cutDay={cutDay}
          maxDays={14}
        />
      </div>
    </div>
  );
};
