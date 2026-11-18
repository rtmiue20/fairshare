import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { reportApi } from '../../api/report.api';
import { exportOverviewReportPdf } from '../../utils/pdfExport';

export interface ExportReportButtonProps {
  teamId: number;
  sprintId?: number;
}

export const ExportReportButton: React.FC<ExportReportButtonProps> = ({ teamId, sprintId = 1 }) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await reportApi.getOverviewReport(teamId, sprintId);
      if (!res?.data) {
        throw new Error('Missing overview report data');
      }
      await exportOverviewReportPdf(res.data, `fairshare-report-team-${teamId}-sprint-${sprintId}.pdf`);
    } catch {
      alert('Không thể xuất báo cáo PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} isLoading={loading} variant="primary">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <FileDown size={15} />
        <span>Xuất báo cáo PDF</span>
      </span>
    </Button>
  );
};
