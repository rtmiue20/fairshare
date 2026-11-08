import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { ContributionPieChart } from './ContributionPieChart';
import { ContributionTimeline } from './ContributionTimeline';
import { EvidenceTable } from './EvidenceTable';
import { MemberRadarChart } from './MemberRadarChart';
import { DashboardFilters, SprintOption, MemberOption } from './DashboardFilters';
import { contributionApi } from '../../api/contribution.api';
import {
  ContributionScore,
  ContributionSummary,
  ContributionSummaryItem,
  EvidenceItem,
} from '../../types/contribution';
import { ExportReportButton } from '../report/ExportReportButton';
import { AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, Loader2, RotateCcw } from 'lucide-react';

const AVAILABLE_SPRINTS: SprintOption[] = [
  { id: 1, name: 'Sprint 1: Khởi động & Đặc tả SRS' },
  { id: 2, name: 'Sprint 2: Thiết kế DB & Kiến trúc' },
  { id: 3, name: 'Sprint 3: Xây dựng Core Module' },
  { id: 4, name: 'Sprint 4: Tích hợp Đa chiều & Bằng chứng', isCurrent: true },
  { id: 5, name: 'Sprint 5: Tối ưu & Báo cáo Đồ án' },
];

const DEFAULT_MEMBERS: MemberOption[] = [
  { id: 1, name: 'Minh Triều', role: 'Leader' },
  { id: 2, name: 'Ngọc Thiện', role: 'BA' },
  { id: 3, name: 'Phúc Vương', role: 'BE' },
  { id: 4, name: 'Trọng Phúc', role: 'FE' },
  { id: 5, name: 'Huỳnh Khang', role: 'Data' },
  { id: 6, name: 'Nam Anh', role: 'QA' },
];

// Dữ liệu mẫu Sprint 4
const SPRINT_4_SUMMARY_ITEMS: ContributionSummaryItem[] = [
  {
    userId: 1,
    userName: 'Minh Triều (Leader)',
    finalPct: 18.5,
    d1Output: 1.25,
    d2Reliability: 1.1,
    d3Collaboration: 0.95,
    d4Peer: 1.05,
    compositeScore: 1.15,
    confidenceIntervalLow: 16.2,
    confidenceIntervalHigh: 20.8,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (12 task, 34 docs)',
  },
  {
    userId: 2,
    userName: 'Ngọc Thiện (BA)',
    finalPct: 17.8,
    d1Output: 1.15,
    d2Reliability: 1.2,
    d3Collaboration: 1.0,
    d4Peer: 0.9,
    compositeScore: 1.08,
    confidenceIntervalLow: 15.6,
    confidenceIntervalHigh: 19.9,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (11 task, 42 docs)',
  },
  {
    userId: 3,
    userName: 'Phúc Vương (BE)',
    finalPct: 16.5,
    d1Output: 0.85,
    d2Reliability: 0.9,
    d3Collaboration: 0.7,
    d4Peer: 0.8,
    compositeScore: 0.82,
    confidenceIntervalLow: 14.5,
    confidenceIntervalHigh: 18.4,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (9 task, 20 docs)',
  },
  {
    userId: 4,
    userName: 'Trọng Phúc (FE)',
    finalPct: 16.2,
    d1Output: 0.9,
    d2Reliability: 0.85,
    d3Collaboration: 0.95,
    d4Peer: 0.85,
    compositeScore: 0.88,
    confidenceIntervalLow: 14.1,
    confidenceIntervalHigh: 18.2,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (10 task, 22 docs)',
  },
  {
    userId: 5,
    userName: 'Huỳnh Khang (Data)',
    finalPct: 15.8,
    d1Output: 2.1,
    d2Reliability: -0.8,
    d3Collaboration: -0.6,
    d4Peer: -1.2,
    compositeScore: 0.65,
    confidenceIntervalLow: 12.8,
    confidenceIntervalHigh: 18.9,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: true,
    suspicionFlag: true,
    evidenceStatus: 'Cần rà soát (D1 cao, D4 thấp)',
  },
  {
    userId: 6,
    userName: 'Nam Anh (QA)',
    finalPct: 15.2,
    d1Output: -0.5,
    d2Reliability: 0.1,
    d3Collaboration: 0.2,
    d4Peer: 0.0,
    compositeScore: 0.1,
    confidenceIntervalLow: 13.0,
    confidenceIntervalHigh: 17.5,
    hasSufficientEvidence: false,
    isEnoughEvidence: false,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Chưa đủ bằng chứng (< 5 events)',
  },
];

// Dữ liệu mẫu Sprint 3
const SPRINT_3_SUMMARY_ITEMS: ContributionSummaryItem[] = [
  {
    userId: 1,
    userName: 'Minh Triều (Leader)',
    finalPct: 17.5,
    d1Output: 0.9,
    d2Reliability: 1.0,
    d3Collaboration: 1.1,
    d4Peer: 1.0,
    compositeScore: 1.0,
    confidenceIntervalLow: 15.8,
    confidenceIntervalHigh: 19.2,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (10 task, 25 docs)',
  },
  {
    userId: 2,
    userName: 'Ngọc Thiện (BA)',
    finalPct: 17.2,
    d1Output: 0.8,
    d2Reliability: 1.1,
    d3Collaboration: 0.9,
    d4Peer: 0.95,
    compositeScore: 0.95,
    confidenceIntervalLow: 15.5,
    confidenceIntervalHigh: 18.9,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (9 task, 30 docs)',
  },
  {
    userId: 3,
    userName: 'Phúc Vương (BE)',
    finalPct: 16.8,
    d1Output: 1.0,
    d2Reliability: 0.9,
    d3Collaboration: 0.8,
    d4Peer: 0.85,
    compositeScore: 0.89,
    confidenceIntervalLow: 15.1,
    confidenceIntervalHigh: 18.5,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (11 task, 18 docs)',
  },
  {
    userId: 4,
    userName: 'Trọng Phúc (FE)',
    finalPct: 16.5,
    d1Output: 0.85,
    d2Reliability: 0.8,
    d3Collaboration: 0.9,
    d4Peer: 0.9,
    compositeScore: 0.86,
    confidenceIntervalLow: 14.8,
    confidenceIntervalHigh: 18.2,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (9 task, 20 docs)',
  },
  {
    userId: 5,
    userName: 'Huỳnh Khang (Data)',
    finalPct: 16.1,
    d1Output: 0.7,
    d2Reliability: 0.8,
    d3Collaboration: 0.8,
    d4Peer: 0.8,
    compositeScore: 0.78,
    confidenceIntervalLow: 14.2,
    confidenceIntervalHigh: 18.0,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (8 task, 15 docs)',
  },
  {
    userId: 6,
    userName: 'Nam Anh (QA)',
    finalPct: 15.9,
    d1Output: 0.65,
    d2Reliability: 0.85,
    d3Collaboration: 0.75,
    d4Peer: 0.8,
    compositeScore: 0.76,
    confidenceIntervalLow: 14.0,
    confidenceIntervalHigh: 17.8,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
    evidenceStatus: 'Đầy đủ (7 task, 14 docs)',
  },
];

const DEFAULT_SCORES_S4: ContributionScore[] = [
  { userId: 1, userName: 'Minh Triều (Leader)', percentage: 0.185, taskCompletedCount: 12, docsEditCount: 34, manualScore: 88, totalScore: 92, peerReviewScore: 4.9 },
  { userId: 2, userName: 'Ngọc Thiện (BA)', percentage: 0.178, taskCompletedCount: 11, docsEditCount: 42, manualScore: 89, totalScore: 90, peerReviewScore: 4.85 },
  { userId: 3, userName: 'Phúc Vương (BE)', percentage: 0.165, taskCompletedCount: 9, docsEditCount: 20, manualScore: 84, totalScore: 86, peerReviewScore: 4.75 },
  { userId: 4, userName: 'Trọng Phúc (FE)', percentage: 0.162, taskCompletedCount: 10, docsEditCount: 22, manualScore: 82, totalScore: 85, peerReviewScore: 4.7 },
  { userId: 5, userName: 'Huỳnh Khang (Data)', percentage: 0.158, taskCompletedCount: 8, docsEditCount: 18, manualScore: 80, totalScore: 83, peerReviewScore: 4.8 },
  { userId: 6, userName: 'Nam Anh (QA)', percentage: 0.152, taskCompletedCount: 7, docsEditCount: 16, manualScore: 78, totalScore: 81, peerReviewScore: 4.75 },
];

const DEFAULT_SCORES_S3: ContributionScore[] = [
  { userId: 1, userName: 'Minh Triều (Leader)', percentage: 0.175, taskCompletedCount: 10, docsEditCount: 25, manualScore: 85, totalScore: 88, peerReviewScore: 4.8 },
  { userId: 2, userName: 'Ngọc Thiện (BA)', percentage: 0.172, taskCompletedCount: 9, docsEditCount: 30, manualScore: 86, totalScore: 87, peerReviewScore: 4.8 },
  { userId: 3, userName: 'Phúc Vương (BE)', percentage: 0.168, taskCompletedCount: 11, docsEditCount: 18, manualScore: 82, totalScore: 85, peerReviewScore: 4.7 },
  { userId: 4, userName: 'Trọng Phúc (FE)', percentage: 0.165, taskCompletedCount: 9, docsEditCount: 20, manualScore: 80, totalScore: 83, peerReviewScore: 4.7 },
  { userId: 5, userName: 'Huỳnh Khang (Data)', percentage: 0.161, taskCompletedCount: 8, docsEditCount: 15, manualScore: 78, totalScore: 80, peerReviewScore: 4.6 },
  { userId: 6, userName: 'Nam Anh (QA)', percentage: 0.159, taskCompletedCount: 7, docsEditCount: 14, manualScore: 77, totalScore: 79, peerReviewScore: 4.65 },
];

const DEFAULT_EVIDENCE: EvidenceItem[] = [
  { id: 1, userId: 2, source: 'TRELLO', activityType: 'COMPLETE_CARD', title: 'Hoàn thành thiết kế màn hình Quản lý Nhóm & Hồ sơ cá nhân', timestamp: '2026-11-02T15:30:00Z', weight: 5, externalUrl: 'https://trello.com/b/fairshare' },
  { id: 2, userId: 1, source: 'TRELLO', activityType: 'CREATE_SPRINT', title: 'Thiết lập mục tiêu và DoD (Mô hình 7 Sprints)', timestamp: '2026-11-01T09:15:00Z', weight: 4, externalUrl: 'https://trello.com/b/fairshare' },
  { id: 3, userId: 3, source: 'TRELLO', activityType: 'INTEGRATE_API', title: 'Tích hợp Trello Webhook và kiểm thử kết nối REST API', timestamp: '2026-11-01T14:20:00Z', weight: 5, externalUrl: 'https://github.com/rtmiue20/fairshare' },
  { id: 4, userId: 4, source: 'GOOGLE_DOCS', activityType: 'EDIT_SECTION', title: 'Cập nhật tài liệu SRS đặc tả yêu cầu chức năng', timestamp: '2026-10-31T20:00:00Z', weight: 3, externalUrl: 'https://docs.google.com' },
  { id: 5, userId: 5, source: 'MANUAL', activityType: 'PEER_REVIEW', title: 'Kích hoạt vòng chấm chéo ẩn danh tuân thủ NĐ 13/2023', timestamp: '2026-10-30T16:45:00Z', weight: 3 },
  { id: 6, userId: 6, source: 'TRELLO', activityType: 'DEPLOY_CHECK', title: 'Kiểm thử CI GitHub Actions và rà soát lỗi giao diện', timestamp: '2026-10-29T11:10:00Z', weight: 4, externalUrl: 'https://github.com/rtmiue20/fairshare' },
];

export const ContributionDashboard: React.FC = () => {
  const [selectedSprintId, setSelectedSprintId] = useState<number>(4);
  const [selectedUserId, setSelectedUserId] = useState<number | 'ALL'>('ALL');
  const [activeRadarUserId, setActiveRadarUserId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSprintEmpty, setIsSprintEmpty] = useState<boolean>(false);

  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [summaryItems, setSummaryItems] = useState<ContributionSummaryItem[]>(SPRINT_4_SUMMARY_ITEMS);
  const [evidence, setEvidence] = useState<EvidenceItem[]>(DEFAULT_EVIDENCE);

  // Re-fetch data whenever selectedSprintId changes
  useEffect(() => {
    setIsLoading(true);

    // Trường hợp Sprint 5: Sprint tương lai chưa có dữ liệu (Empty State)
    if (selectedSprintId === 5) {
      setTimeout(() => {
        setSummaryItems([]);
        setSummary(null);
        setEvidence([]);
        setIsSprintEmpty(true);
        setIsLoading(false);
      }, 300);
      return;
    }

    setIsSprintEmpty(false);

    // Gọi API thật từ backend
    Promise.allSettled([
      contributionApi.getContributions(1, selectedSprintId),
      contributionApi.getContributionSummary(1, selectedSprintId),
      contributionApi.getMemberEvidence(1, typeof selectedUserId === 'number' ? selectedUserId : 1, selectedSprintId),
    ])
      .then(([scoresRes, summaryRes, evidenceRes]) => {
        // Dữ liệu Scores
        if (scoresRes.status === 'fulfilled' && scoresRes.value.data) {
          setSummary(scoresRes.value.data);
        } else {
          setSummary(null);
        }

        // Dữ liệu Summary đa chiều 4 tầng
        if (summaryRes.status === 'fulfilled' && summaryRes.value && summaryRes.value.length > 0) {
          setSummaryItems(summaryRes.value);
        } else {
          // Fallback dữ liệu mẫu theo Sprint tương ứng
          if (selectedSprintId === 3) {
            setSummaryItems(SPRINT_3_SUMMARY_ITEMS);
          } else {
            setSummaryItems(SPRINT_4_SUMMARY_ITEMS);
          }
        }

        // Dữ liệu minh chứng truy vết
        if (evidenceRes.status === 'fulfilled' && evidenceRes.value.data) {
          setEvidence(evidenceRes.value.data);
        } else {
          setEvidence(DEFAULT_EVIDENCE);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedSprintId, selectedUserId]);

  // Cập nhật activeRadarUserId khi đổi selectedUserId
  const handleSelectMember = (userId: number | 'ALL') => {
    setSelectedUserId(userId);
    if (typeof userId === 'number') {
      setActiveRadarUserId(userId);
    }
  };

  // Lọc danh sách thành viên hiển thị
  const filteredSummaryItems = useMemo(() => {
    if (selectedUserId === 'ALL') return summaryItems;
    return summaryItems.filter((m) => m.userId === selectedUserId);
  }, [summaryItems, selectedUserId]);

  // Lọc bảng bằng chứng theo thành viên được chọn
  const filteredEvidenceItems = useMemo(() => {
    if (selectedUserId === 'ALL') return evidence;
    return evidence.filter((e) => e.userId === selectedUserId);
  }, [evidence, selectedUserId]);

  const scores = useMemo(() => {
    if (summary?.scores && summary.scores.length > 0) return summary.scores;
    if (selectedSprintId === 3) return DEFAULT_SCORES_S3;
    if (selectedSprintId === 4) return DEFAULT_SCORES_S4;
    return [];
  }, [summary, selectedSprintId]);

  // Thành viên đang được xem trên Radar Chart
  const radarMember = useMemo(() => {
    return summaryItems.find((m) => m.userId === activeRadarUserId) ?? summaryItems[0] ?? null;
  }, [summaryItems, activeRadarUserId]);

  return (
    <div className="flex flex-col gap-6" data-testid="contribution-dashboard">
      {/* Header trang Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Bảng đo lường đóng góp</h2>
          <p className="mt-1 text-xs text-slate-400">
            Hệ thống phân tích đóng góp đa chiều chuẩn Khoa học Dữ liệu kết hợp Bằng chứng truy vết (Audit Trail)
          </p>
        </div>
        <ExportReportButton teamId={1} />
      </div>

      {/* Bộ lọc Sprint & Thành viên (Card 6) */}
      <DashboardFilters
        sprints={AVAILABLE_SPRINTS}
        selectedSprintId={selectedSprintId}
        onSelectSprint={(sprintId) => setSelectedSprintId(sprintId)}
        members={DEFAULT_MEMBERS}
        selectedUserId={selectedUserId}
        onSelectMember={handleSelectMember}
        isLoading={isLoading}
      />

      {/* Khối Loading Indicator khi đang tải */}
      {isLoading && (
        <div
          data-testid="dashboard-loading"
          className="flex h-64 flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-slate-900/40"
        >
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="mt-3 text-xs font-medium text-slate-400">Đang tải và chuẩn hóa dữ liệu thống kê...</p>
        </div>
      )}

      {/* Khối Empty State khi Sprint không có dữ liệu */}
      {!isLoading && isSprintEmpty && (
        <div
          data-testid="dashboard-empty-state"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/40 p-12 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-3xl">
            📂
          </div>
          <h3 className="text-lg font-bold text-white">Chưa có dữ liệu đóng góp cho Sprint này</h3>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
            Sprint {selectedSprintId} chưa diễn ra hoặc chưa có bất kỳ sự kiện hoạt động (Activity Events) nào được ghi nhận từ Trello, Git hoặc Peer Review.
          </p>
          <button
            onClick={() => setSelectedSprintId(4)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-indigo-500"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Quay lại Sprint 4 (Hiện tại)</span>
          </button>
        </div>
      )}

      {/* Nội dung Dashboard chính khi có dữ liệu */}
      {!isLoading && !isSprintEmpty && (
        <>
          {/* Grid chính: Biểu đồ tròn + Danh sách tóm tắt + Biểu đồ Radar 4 chiều */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Cột trái: Tỷ lệ tổng thể & Danh sách thành viên */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              <Card title="Tỷ lệ đóng góp tổng thể (Pie Chart)">
                <ContributionPieChart data={scores} />
              </Card>

              <Card
                title={`Danh sách thành viên & Tỷ lệ đóng góp (Sprint ${selectedSprintId})`}
                extra={
                  <span className="text-xs text-slate-400">
                    Hiển thị: <strong>{filteredSummaryItems.length}</strong> thành viên
                  </span>
                }
              >
                <div className="flex flex-col gap-2">
                  {filteredSummaryItems.map((member) => {
                    const isSelected = member.userId === activeRadarUserId;
                    const isSuspicious = member.suspicionFlag ?? member.isSuspicious ?? false;
                    const isEnough = member.isEnoughEvidence ?? member.hasSufficientEvidence ?? true;

                    return (
                      <div
                        key={member.userId}
                        onClick={() => setActiveRadarUserId(member.userId)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/30 shadow-md ring-1 ring-indigo-500/50'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
                            {member.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{member.userName}</span>
                              {isSuspicious && (
                                <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                                  <AlertTriangle className="h-3 w-3" />
                                  Rà soát
                                </span>
                              )}
                              {!isEnough && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                                  <AlertCircle className="h-3 w-3" />
                                  Thiếu BC
                                </span>
                              )}
                              {isEnough && !isSuspicious && (
                                <span className="inline-flex items-center rounded text-emerald-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              ID: #{member.userId} • {member.evidenceStatus ?? 'Đầy đủ minh chứng'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-sky-400">
                            {member.finalPct?.toFixed(1) ?? '0.0'}%
                          </span>
                          <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Cột phải: Biểu đồ Radar 4 chiều của thành viên đang chọn */}
            <div className="flex flex-col gap-6 lg:col-span-7">
              <Card
                title="Hồ sơ năng lực 4 chiều (Radar Chart)"
                extra={
                  <span className="text-xs font-normal text-slate-400">
                    Thành viên: <strong className="text-sky-400">{radarMember?.userName}</strong>
                  </span>
                }
              >
                <MemberRadarChart member={radarMember} />
              </Card>

              <Card title="Chi tiết hoạt động thành viên">
                <ContributionTimeline data={scores} />
              </Card>
            </div>
          </div>

          {/* Bảng truy vết minh chứng hoạt động (Audit Trail) */}
          <Card
            title="Bằng chứng truy vết minh chứng hoạt động (Audit Trail)"
            extra={
              <span className="text-xs font-normal text-slate-400">
                Tổng số sự kiện ghi nhận: {filteredEvidenceItems.length}
              </span>
            }
          >
            <EvidenceTable items={filteredEvidenceItems} />
          </Card>
        </>
      )}
    </div>
  );
};
