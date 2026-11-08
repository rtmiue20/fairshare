import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ContributionPieChart } from './ContributionPieChart';
import { ContributionTimeline } from './ContributionTimeline';
import { EvidenceTable } from './EvidenceTable';
import { MemberRadarChart } from './MemberRadarChart';
import { contributionApi } from '../../api/contribution.api';
import {
  ContributionScore,
  ContributionSummary,
  ContributionSummaryItem,
  EvidenceItem,
} from '../../types/contribution';
import { ExportReportButton } from '../report/ExportReportButton';
import { AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, BarChart2 } from 'lucide-react';

const DEFAULT_SCORES: ContributionScore[] = [
  { userId: 1, userName: 'Minh Triều (Leader)', percentage: 0.185, taskCompletedCount: 12, docsEditCount: 34, manualScore: 88, totalScore: 92, peerReviewScore: 4.9 },
  { userId: 2, userName: 'Ngọc Thiện (BA)', percentage: 0.178, taskCompletedCount: 11, docsEditCount: 42, manualScore: 89, totalScore: 90, peerReviewScore: 4.85 },
  { userId: 3, userName: 'Phúc Vương (BE)', percentage: 0.165, taskCompletedCount: 9, docsEditCount: 20, manualScore: 84, totalScore: 86, peerReviewScore: 4.75 },
  { userId: 4, userName: 'Trọng Phúc (FE)', percentage: 0.162, taskCompletedCount: 10, docsEditCount: 22, manualScore: 82, totalScore: 85, peerReviewScore: 4.7 },
  { userId: 5, userName: 'Huỳnh Khang (Data)', percentage: 0.158, taskCompletedCount: 8, docsEditCount: 18, manualScore: 80, totalScore: 83, peerReviewScore: 4.8 },
  { userId: 6, userName: 'Nam Anh (QA)', percentage: 0.152, taskCompletedCount: 7, docsEditCount: 16, manualScore: 78, totalScore: 81, peerReviewScore: 4.75 },
];

const DEFAULT_SUMMARY_ITEMS: ContributionSummaryItem[] = [
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

const DEFAULT_EVIDENCE: EvidenceItem[] = [
  { id: 1, userId: 2, source: 'TRELLO', activityType: 'COMPLETE_CARD', title: 'Hoàn thành thiết kế màn hình Quản lý Nhóm & Hồ sơ cá nhân', timestamp: '2026-11-02T15:30:00Z', weight: 5, externalUrl: 'https://trello.com/b/fairshare' },
  { id: 2, userId: 1, source: 'TRELLO', activityType: 'CREATE_SPRINT', title: 'Thiết lập mục tiêu và DoD (Mô hình 7 Sprints)', timestamp: '2026-11-01T09:15:00Z', weight: 4, externalUrl: 'https://trello.com/b/fairshare' },
  { id: 3, userId: 3, source: 'TRELLO', activityType: 'INTEGRATE_API', title: 'Tích hợp Trello Webhook và kiểm thử kết nối REST API', timestamp: '2026-11-01T14:20:00Z', weight: 5, externalUrl: 'https://github.com/rtmiue20/fairshare' },
  { id: 4, userId: 4, source: 'GOOGLE_DOCS', activityType: 'EDIT_SECTION', title: 'Cập nhật tài liệu SRS đặc tả yêu cầu chức năng', timestamp: '2026-10-31T20:00:00Z', weight: 3, externalUrl: 'https://docs.google.com' },
  { id: 5, userId: 5, source: 'MANUAL', activityType: 'PEER_REVIEW', title: 'Kích hoạt vòng chấm chéo ẩn danh tuân thủ NĐ 13/2023', timestamp: '2026-10-30T16:45:00Z', weight: 3 },
  { id: 6, userId: 6, source: 'TRELLO', activityType: 'DEPLOY_CHECK', title: 'Kiểm thử CI GitHub Actions và rà soát lỗi giao diện', timestamp: '2026-10-29T11:10:00Z', weight: 4, externalUrl: 'https://github.com/rtmiue20/fairshare' },
];

export const ContributionDashboard: React.FC = () => {
  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [summaryItems, setSummaryItems] = useState<ContributionSummaryItem[]>(DEFAULT_SUMMARY_ITEMS);
  const [selectedUserId, setSelectedUserId] = useState<number>(1);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  useEffect(() => {
    // 1. Tải dữ liệu tổng hợp đóng góp truyền thống
    contributionApi.getContributions(1)
      .then((res) => {
        if (res.data) setSummary(res.data);
      })
      .catch((err) => console.error('getContributions error:', err));

    // 2. Tải dữ liệu Mô hình Đa chiều 4 tầng từ Summary API (M3 - Sprint 4)
    contributionApi.getContributionSummary(1, 1)
      .then((items) => {
        if (items && items.length > 0) {
          setSummaryItems(items);
          setSelectedUserId(items[0].userId);
        }
      })
      .catch((err) => {
        console.warn('getContributionSummary fallback to defaults:', err);
      });

    // 3. Tải dữ liệu bằng chứng truy vết
    contributionApi.getMemberEvidence(1, 1)
      .then((res) => {
        if (res.data) setEvidence(res.data);
      })
      .catch((err) => console.error('getMemberEvidence error:', err));
  }, []);

  const scores = (summary?.scores && summary.scores.length > 0) ? summary.scores : DEFAULT_SCORES;
  const evidenceItems = (evidence && evidence.length > 0) ? evidence : DEFAULT_EVIDENCE;

  const selectedMember = summaryItems.find((m) => m.userId === selectedUserId) ?? summaryItems[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header trang Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Bảng đo lường đóng góp</h2>
          <p className="mt-1 text-xs text-slate-400">
            Hệ thống phân tích đóng góp đa chiều chuẩn Khoa học Dữ liệu kết hợp Bằng chứng truy vết (Audit Trail)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300">
            Sprint đang chọn: <strong className="text-white">Sprint 4</strong>
          </div>
          <ExportReportButton teamId={1} />
        </div>
      </div>

      {/* Grid chính: Biểu đồ tròn + Danh sách tóm tắt + Biểu đồ Radar 4 chiều */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột trái: Tỷ lệ tổng thể & Danh sách thành viên */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card title="Tỷ lệ đóng góp tổng thể (Pie Chart)">
            <ContributionPieChart data={scores} />
          </Card>

          <Card title="Danh sách thành viên & Tỷ lệ đóng góp (Sprint 4)">
            <div className="flex flex-col gap-2">
              {summaryItems.map((member) => {
                const isSelected = member.userId === selectedUserId;
                const isSuspicious = member.suspicionFlag ?? member.isSuspicious ?? false;
                const isEnough = member.isEnoughEvidence ?? member.hasSufficientEvidence ?? true;

                return (
                  <div
                    key={member.userId}
                    onClick={() => setSelectedUserId(member.userId)}
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
            title={
              <div className="flex items-center justify-between">
                <span>Hồ sơ năng lực 4 chiều (Radar Chart)</span>
                <span className="text-xs font-normal text-slate-400">
                  Thành viên: <strong className="text-sky-400">{selectedMember?.userName}</strong>
                </span>
              </div>
            }
          >
            <MemberRadarChart member={selectedMember} />
          </Card>

          <Card title="Chi tiết hoạt động thành viên">
            <ContributionTimeline data={scores} />
          </Card>
        </div>
      </div>

      {/* Bảng truy vết minh chứng hoạt động (Audit Trail) */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-sky-400" />
              <span>Bằng chứng truy vết minh chứng hoạt động (Audit Trail)</span>
            </div>
            <span className="text-xs font-normal text-slate-400">
              Tổng số sự kiện ghi nhận: {evidenceItems.length}
            </span>
          </div>
        }
      >
        <EvidenceTable items={evidenceItems} />
      </Card>
    </div>
  );
};
