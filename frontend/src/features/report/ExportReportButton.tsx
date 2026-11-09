import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { reportApi } from '../../api/report.api';

export interface ExportReportButtonProps {
  teamId: number;
  sprintId?: number;
}

export const ExportReportButton: React.FC<ExportReportButtonProps> = ({ teamId, sprintId = 1 }) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const blob = await reportApi.downloadPdfReport(teamId, sprintId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fairshare-report-team-${teamId}-sprint-${sprintId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Không thể xuất báo cáo PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} isLoading={loading} variant="primary">
      📄 Xuất báo cáo PDF
    </Button>
  );
};
