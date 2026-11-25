import { ManualContributionItem } from '../types/contribution';

export interface PrintLedgerOptions {
  items: ManualContributionItem[];
  projectName: string;
  sprintName: string;
  exportedBy?: string;
  getCategoryLabel: (link?: string, task?: string) => string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getStatusBadgeHtml = (status: string): string => {
  switch (status) {
    case 'APPROVED':
      return '<span class="badge badge-approved">Đã duyệt</span>';
    case 'PENDING':
      return '<span class="badge badge-pending">Chờ duyệt</span>';
    case 'REJECTED':
      return '<span class="badge badge-rejected">Từ chối</span>';
    default:
      return `<span class="badge">${escapeHtml(status)}</span>`;
  }
};

export const printLedgerReport = ({
  items,
  projectName,
  sprintName,
  exportedBy,
  getCategoryLabel,
}: PrintLedgerOptions): void => {
  const approvedItems = items.filter((i) => i.status === 'APPROVED');
  const pendingItems = items.filter((i) => i.status === 'PENDING');
  const approvedSp = approvedItems.reduce((acc, i) => acc + Number(i.storyPoints || 0), 0);
  const pendingSp = pendingItems.reduce((acc, i) => acc + Number(i.storyPoints || 0), 0);
  const totalSp = items.reduce((acc, i) => acc + Number(i.storyPoints || 0), 0);
  const approvalRate = items.length > 0 ? Math.round((approvedItems.length / items.length) * 100) : 0;
  const nowStr = formatDateTime(new Date().toISOString());

  const rowsHtml = items
    .map((item, idx) => {
      const code = `#0${item.id}KG${String(item.id).padStart(2, '0')}`;
      const member = item.userName || 'Thành viên';
      const email = item.userEmail ? `<div class="sub">${escapeHtml(item.userEmail)}</div>` : '';
      const category = getCategoryLabel(item.evidenceLink, item.taskName);
      const sp = Number(item.storyPoints || 0).toFixed(1);
      const evidence = item.evidenceLink
        ? `<div class="url">${escapeHtml(item.evidenceLink)}</div>`
        : '<span class="muted">—</span>';

      return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td class="center mono">${escapeHtml(code)}</td>
          <td>
            <div class="task-title">${escapeHtml(item.taskName || '')}</div>
            ${evidence}
          </td>
          <td>
            <div class="member-name">${escapeHtml(member)}</div>
            ${email}
          </td>
          <td class="center">${escapeHtml(category)}</td>
          <td class="right mono bold">+${sp} SP</td>
          <td class="center">${getStatusBadgeHtml(item.status)}</td>
          <td class="center nowrap">${escapeHtml(formatDateTime(item.createdAt))}</td>
        </tr>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>FairShare — Sổ cái Đóng góp (${escapeHtml(projectName)})</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.45;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4f46e5;
      margin-bottom: 3px;
    }
    h1 {
      margin: 0;
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
    }
    .meta-right {
      text-align: right;
      font-size: 10.5px;
      color: #334155;
    }
    .meta-right strong {
      color: #0f172a;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 9px 12px;
      background: #f8fafc;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .kpi-value {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .kpi-value.green { color: #15803d; }
    .kpi-value.amber { color: #b45309; }
    .kpi-value.indigo { color: #4338ca; }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      font-size: 10.5px;
      text-align: left;
      padding: 8px 8px;
      border: 1px solid #1e293b;
    }
    td {
      padding: 7px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
      color: #0f172a;
      word-wrap: break-word;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    tfoot td {
      background: #eef2ff;
      font-weight: 700;
      color: #1e1b4b;
      border-top: 2px solid #4f46e5;
      padding: 8px;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .nowrap { white-space: nowrap; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .bold { font-weight: 700; }
    .task-title { font-weight: 600; color: #0f172a; }
    .member-name { font-weight: 600; color: #0f172a; }
    .sub { font-size: 9.5px; color: #475569; margin-top: 1px; }
    .url { font-size: 9.5px; color: #1d4ed8; margin-top: 2px; word-break: break-all; }
    .muted { color: #64748b; }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 9.5px;
      font-weight: 700;
      border: 1px solid #cbd5e1;
    }
    .badge-approved { background: #dcfce7; color: #166534; border-color: #86efac; }
    .badge-pending  { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    .badge-rejected { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
    .doc-footer {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div>
      <div class="brand">FairShare · Contribution Ledger Report</div>
      <h1>Sổ cái Đóng góp Thành viên</h1>
    </div>
    <div class="meta-right">
      <div>Dự án: <strong>${escapeHtml(projectName || 'FairShare')}</strong></div>
      <div>Giai đoạn: <strong>${escapeHtml(sprintName || 'Sprint hiện tại')}</strong></div>
      ${exportedBy ? `<div>Người xuất: <strong>${escapeHtml(exportedBy)}</strong></div>` : ''}
      <div>Thời gian in: <strong>${escapeHtml(nowStr)}</strong></div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">Tổng giao dịch</div>
      <div class="kpi-value">${items.length} mục</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Điểm đã duyệt</div>
      <div class="kpi-value green">+${approvedSp.toFixed(1)} SP</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Điểm chờ duyệt</div>
      <div class="kpi-value amber">${pendingSp.toFixed(1)} SP</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Tỷ lệ duyệt hợp lệ</div>
      <div class="kpi-value indigo">${approvalRate}%</div>
    </div>
  </div>

  <table>
    <colgroup>
      <col style="width: 4%;" />
      <col style="width: 11%;" />
      <col style="width: 31%;" />
      <col style="width: 16%;" />
      <col style="width: 11%;" />
      <col style="width: 9%;" />
      <col style="width: 9%;" />
      <col style="width: 9%;" />
    </colgroup>
    <thead>
      <tr>
        <th class="center">STT</th>
        <th class="center">Mã</th>
        <th>Mô tả công việc &amp; Minh chứng</th>
        <th>Người thực hiện</th>
        <th class="center">Phân loại</th>
        <th class="right">Điểm (SP)</th>
        <th class="center">Trạng thái</th>
        <th class="center">Ngày ghi nhận</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" class="center muted">Không có dữ liệu đóng góp.</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" class="right">TỔNG CỘNG (${items.length} mục)</td>
        <td class="right mono">+${totalSp.toFixed(1)} SP</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>

  <div class="doc-footer">
    <span>FairShare Engine · Tuân thủ Nghị định 13/2023/NĐ-CP</span>
    <span>Báo cáo minh chứng đóng góp · In lúc ${escapeHtml(nowStr)}</span>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }
  };

  if (doc.readyState === 'complete') {
    window.setTimeout(triggerPrint, 120);
  } else {
    iframe.onload = triggerPrint;
  }
};
