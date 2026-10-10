import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ContributionPieChart } from './ContributionPieChart';
import { ContributionTimeline } from './ContributionTimeline';
import { EvidenceTable } from './EvidenceTable';
import { contributionApi } from '../../api/contribution.api';
import { ContributionSummary, EvidenceItem } from '../../types/contribution';
import { Spinner } from '../../components/ui/Spinner';
import { ExportReportButton } from '../report/ExportReportButton';

export const ContributionDashboard: React.FC = () => {
  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      contributionApi.getContributions(1),
      contributionApi.getMemberEvidence(1, 1),
    ])
      .then(([summaryRes, evidenceRes]) => {
        if (summaryRes.data) setSummary(summaryRes.data);
        if (evidenceRes.data) setEvidence(evidenceRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner size="large" />
      </div>
    );
  }

  const scores = summary?.scores || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600 }}>Bảng đo lường đóng góp</h2>
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

      <Card title="Bằng chứng truy vết hoạt động">
        <EvidenceTable items={evidence} />
      </Card>
    </div>
  );
};
