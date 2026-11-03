import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ContributionPieChart } from './ContributionPieChart';
import { ContributionTimeline } from './ContributionTimeline';
import { EvidenceTable } from './EvidenceTable';
import { contributionApi } from '../../api/contribution.api';
import { ContributionScore, ContributionSummary, EvidenceItem } from '../../types/contribution';
import { ExportReportButton } from '../report/ExportReportButton';

const DEFAULT_SCORES: ContributionScore[] = [
  { userId: 1, userName: 'Minh Triều (Leader)', percentage: 0.185, taskCompletedCount: 12, docsEditCount: 34, manualScore: 88, totalScore: 92, peerReviewScore: 4.9 },
  { userId: 2, userName: 'Ngọc Thiện (BA)', percentage: 0.178, taskCompletedCount: 11, docsEditCount: 42, manualScore: 89, totalScore: 90, peerReviewScore: 4.85 },
  { userId: 3, userName: 'Phúc Vương (BE)', percentage: 0.165, taskCompletedCount: 9, docsEditCount: 20, manualScore: 84, totalScore: 86, peerReviewScore: 4.75 },
  { userId: 4, userName: 'Trọng Phúc (FE)', percentage: 0.162, taskCompletedCount: 10, docsEditCount: 22, manualScore: 82, totalScore: 85, peerReviewScore: 4.7 },
  { userId: 5, userName: 'Huỳnh Khang (Data)', percentage: 0.158, taskCompletedCount: 8, docsEditCount: 18, manualScore: 80, totalScore: 83, peerReviewScore: 4.8 },
  { userId: 6, userName: 'Nam Anh (QA)', percentage: 0.152, taskCompletedCount: 7, docsEditCount: 16, manualScore: 78, totalScore: 81, peerReviewScore: 4.75 },
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
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  useEffect(() => {
    Promise.all([
      contributionApi.getContributions(1),
      contributionApi.getMemberEvidence(1, 1),
    ])
      .then(([summaryRes, evidenceRes]) => {
        if (summaryRes.data) setSummary(summaryRes.data);
        if (evidenceRes.data) setEvidence(evidenceRes.data);
      })
      .catch((err) => console.error(err));
  }, []);

  const scores = (summary?.scores && summary.scores.length > 0) ? summary.scores : DEFAULT_SCORES;
  const evidenceItems = (evidence && evidence.length > 0) ? evidence : DEFAULT_EVIDENCE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#f8fafc' }}>Bảng đo lường đóng góp</h2>
        <ExportReportButton teamId={1} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card title="Tỷ lệ đóng góp tổng thể">
          <ContributionPieChart data={scores} />
        </Card>

        <Card title="Chi tiết hoạt động thành viên">
          <ContributionTimeline data={scores} />
        </Card>
      </div>

      <Card title="Bằng chứng truy vết minh chứng hoạt động (Audit Trail)">
        <EvidenceTable items={evidenceItems} />
      </Card>
    </div>
  );
};
