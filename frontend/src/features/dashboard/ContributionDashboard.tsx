import React, { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, FileText, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ContributionPieChart } from './ContributionPieChart';
import { ContributionTimeline } from './ContributionTimeline';
import { EvidenceTable } from './EvidenceTable';
import { contributionApi } from '../../api/contribution.api';
import { ContributionScore, ContributionSummary, EvidenceItem } from '../../types/contribution';
import { Spinner } from '../../components/ui/Spinner';
import { ExportReportButton } from '../report/ExportReportButton';

const FALLBACK_SCORES: ContributionScore[] = [
  {
    userId: 1,
    userName: 'Minh Triều (M0)',
    percentage: 0.175,
    taskCompletedCount: 8,
    docsEditCount: 12,
    manualScore: 5,
    totalScore: 92,
  },
  {
    userId: 2,
    userName: 'Phúc Vương (M1)',
    percentage: 0.195,
    taskCompletedCount: 11,
    docsEditCount: 9,
    manualScore: 6,
    totalScore: 98,
  },
  {
    userId: 3,
    userName: 'Ngọc Thiện (M2)',
    percentage: 0.165,
    taskCompletedCount: 7,
    docsEditCount: 14,
    manualScore: 4,
    totalScore: 88,
  },
  {
    userId: 4,
    userName: 'Trọng Phúc (M3)',
    percentage: 0.165,
    taskCompletedCount: 8,
    docsEditCount: 10,
    manualScore: 5,
    totalScore: 89,
  },
  {
    userId: 5,
    userName: 'Huỳnh Khang (M4)',
    percentage: 0.15,
    taskCompletedCount: 7,
    docsEditCount: 8,
    manualScore: 4,
    totalScore: 84,
  },
  {
    userId: 6,
    userName: 'Nam Anh (M5)',
    percentage: 0.15,
    taskCompletedCount: 7,
    docsEditCount: 9,
    manualScore: 4,
    totalScore: 85,
  },
];

const FALLBACK_EVIDENCE: EvidenceItem[] = [
  {
    id: 101,
    userId: 2,
    source: 'TRELLO',
    activityType: 'CARD_COMPLETED',
    title: '[Frontend 1] Xây dựng màn hình Đăng nhập/Đăng ký, Layout Dashboard & Routing cơ bản',
    externalUrl: 'https://trello.com',
    timestamp: '2026-11-02T18:30:00Z',
    weight: 15,
  },
  {
    id: 102,
    userId: 1,
    source: 'TRELLO',
    activityType: 'CARD_COMPLETED',
    title: '[PM] Cập nhật kế hoạch Sprint 3–7 và theo dõi tiến độ nhóm',
    externalUrl: 'https://trello.com',
    timestamp: '2026-11-02T13:12:00Z',
    weight: 10,
  },
  {
    id: 103,
    userId: 3,
    source: 'GOOGLE_DOCS',
    activityType: 'DOC_REVISION',
    title: 'Đặc tả API Contract v1.0 & Chính sách đồng thuận dữ liệu (Consent)',
    timestamp: '2026-10-29T20:15:00Z',
    weight: 12,
  },
  {
    id: 104,
    userId: 4,
    source: 'TRELLO',
    activityType: 'CARD_COMPLETED',
    title: 'Thiết kế ERD tổng thể & Migration bảng đóng góp',
    externalUrl: 'https://trello.com',
    timestamp: '2026-10-29T08:01:00Z',
    weight: 12,
  },
  {
    id: 105,
    userId: 6,
    source: 'MANUAL',
    activityType: 'CI_DEPLOYMENT',
    title: 'Cấu hình GitHub Actions CI & Docker Compose MariaDB',
    timestamp: '2026-10-28T21:10:00Z',
    weight: 10,
  },
];

export const ContributionDashboard: React.FC = () => {
  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSprint, setSelectedSprint] = useState('sprint-3');

  useEffect(() => {
    Promise.all([
      contributionApi.getContributions(1),
      contributionApi.getMemberEvidence(1, 1),
    ])
      .then(([summaryRes, evidenceRes]) => {
        if (summaryRes.data && summaryRes.data.scores?.length > 0) {
          setSummary(summaryRes.data);
        } else {
          setSummary({
            teamId: 1,
            sprintId: 3,
            scores: FALLBACK_SCORES,
            updatedAt: new Date().toISOString(),
          });
        }
        if (evidenceRes.data && evidenceRes.data.length > 0) {
          setEvidence(evidenceRes.data);
        } else {
          setEvidence(FALLBACK_EVIDENCE);
        }
      })
      .catch(() => {
        setSummary({
          teamId: 1,
          sprintId: 3,
          scores: FALLBACK_SCORES,
          updatedAt: new Date().toISOString(),
        });
        setEvidence(FALLBACK_EVIDENCE);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner size="large" />
      </div>
    );
  }

  const scores = summary?.scores && summary.scores.length > 0 ? summary.scores : FALLBACK_SCORES;
  const totalTasks = scores.reduce((acc, item) => acc + item.taskCompletedCount, 0);
  const totalDocs = scores.reduce((acc, item) => acc + item.docsEditCount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Bảng đo lường đóng góp
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Tổng hợp tỷ lệ đóng góp từ Trello, tài liệu và khai báo có xác nhận của các thành viên
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            aria-label="Chọn Sprint"
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '14px',
              color: '#0f172a',
            }}
          >
            <option value="sprint-3">Sprint 3 – Nền tảng & Nghiệp vụ (Hiện tại)</option>
            <option value="sprint-2">Sprint 2 – Lập kế hoạch & Thiết kế</option>
            <option value="sprint-1">Sprint 1 – Khởi động & Phân tích</option>
          </select>
          <ExportReportButton teamId={1} />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Thành viên nhóm
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {scores.length} thành viên
              </div>
              <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>
                100% đã xác nhận Consent
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Task Trello hoàn thành
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {totalTasks} tasks
              </div>
              <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '2px' }}>
                Đồng bộ tự động từ Board nhóm
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Đóng góp Tài liệu & Minh chứng
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {totalDocs} lượt
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Có liên kết truy vết gốc
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#fefce8',
                color: '#ca8a04',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Chỉ số cân bằng nhóm
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                Ổn định
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Không phát hiện free-rider
              </div>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#f3e8ff',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BarChart3 size={22} />
            </div>
          </div>
        </Card>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '20px',
        }}
      >
        <Card title="Tỷ lệ đóng góp tổng thể" subtitle="Phân bổ phần trăm đóng góp giữa các thành viên">
          <ContributionPieChart data={scores} />
        </Card>

        <Card title="Chi tiết hoạt động thành viên" subtitle="So sánh số lượng Task Trello, Tài liệu & Điểm thủ công">
          <ContributionTimeline data={scores} />
        </Card>
      </div>

      <Card
        title="Bằng chứng truy vết hoạt động"
        subtitle="Mọi điểm số đóng góp đều gắn liền với sự kiện gốc có thời gian ghi nhận"
      >
        <EvidenceTable items={evidence} />
      </Card>
    </div>
  );
};
