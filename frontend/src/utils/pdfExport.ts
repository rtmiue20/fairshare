import type { OverviewReportDto } from '../api/report.api';

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render an existing DOM element into a multi-page A4 PDF and trigger download in the browser.
 */
export async function exportElementToPdf(element: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

/**
 * Build a clean printable report element from OverviewReportDto JSON and export it to PDF client-side.
 */
export async function exportOverviewReportPdf(overview: OverviewReportDto, fileName: string): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.padding = '36px 40px';
  container.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.boxSizing = 'border-box';

  const rowsHtml = (overview.members || [])
    .map(
      (m, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 10px;">${idx + 1}</td>
        <td style="padding: 8px 10px; font-weight: 600;">${escapeHtml(m.userName)}</td>
        <td style="padding: 8px 10px;">${escapeHtml(m.role)}</td>
        <td style="padding: 8px 10px; text-align: right;">${Number(m.d1Output ?? 0).toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right;">${Number(m.d2Reliability ?? 0).toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right;">${Number(m.d3Collaboration ?? 0).toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right;">${Number(m.d4Peer ?? 0).toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right; font-weight: 700;">${Number(m.finalPct ?? 0).toFixed(1)}%</td>
      </tr>`
    )
    .join('');

  container.innerHTML = `
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #475569; text-transform: uppercase;">
        FAIRSHARE · HỆ THỐNG ĐO LƯỜNG ĐÓNG GÓP ĐỒ ÁN NHÓM
      </div>
      <h2 style="font-size: 20px; font-weight: 800; margin: 6px 0 4px 0; color: #0f172a;">
        BÁO CÁO NGHIỆM THU ĐÓNG GÓP &amp; MINH BẠCH NĂNG SUẤT
      </h2>
      <div style="font-size: 13px; color: #475569;">
        Đồ án: <strong style="color: #0f172a;">${escapeHtml(overview.teamName)}</strong>
        · Sprint: <strong style="color: #0f172a;">${escapeHtml(overview.sprintName)}</strong>
        · Thời gian: ${escapeHtml(overview.startDate)} – ${escapeHtml(overview.endDate)}
      </div>
    </div>
    <div style="display: flex; gap: 16px; margin-bottom: 18px; font-size: 12px; background: #f8fafc; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div>Thành viên: <strong>${escapeHtml(overview.totalMembers)}</strong></div>
      <div>Tổng task: <strong>${escapeHtml(overview.totalTasks)}</strong></div>
      <div>Sự kiện: <strong>${escapeHtml(overview.totalEvents)}</strong></div>
      <div>Gini: <strong>${Number(overview.giniCoefficient ?? 0).toFixed(3)} (${escapeHtml(overview.giniLabel)})</strong></div>
      <div>Nhóm trưởng: <strong>${escapeHtml(overview.leaderName)}</strong></div>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
          <th style="padding: 8px 10px;">#</th>
          <th style="padding: 8px 10px;">Thành viên</th>
          <th style="padding: 8px 10px;">Vai trò</th>
          <th style="padding: 8px 10px; text-align: right;">D1</th>
          <th style="padding: 8px 10px; text-align: right;">D2</th>
          <th style="padding: 8px 10px; text-align: right;">D3</th>
          <th style="padding: 8px 10px; text-align: right;">D4</th>
          <th style="padding: 8px 10px; text-align: right;">% Đóng góp</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  document.body.appendChild(container);
  try {
    await exportElementToPdf(container, fileName);
  } finally {
    container.remove();
  }
}
