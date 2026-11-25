import ExcelJS from 'exceljs';
import { ManualContributionItem } from '../types/contribution';

export interface ExportLedgerOptions {
  items: ManualContributionItem[];
  projectName: string;
  sprintName: string;
  getCategoryLabel: (link?: string, task?: string) => string;
}

const formatDateTime = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'APPROVED':
      return 'Đã duyệt (Approved)';
    case 'PENDING':
      return 'Chờ duyệt (Pending)';
    case 'REJECTED':
      return 'Từ chối (Rejected)';
    default:
      return status;
  }
};

export const exportLedgerToXlsx = async ({
  items,
  projectName,
  sprintName,
  getCategoryLabel,
}: ExportLedgerOptions): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FairShare';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('So cai Dong gop', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  // Column definitions (width & key)
  sheet.columns = [
    { key: 'stt', width: 7 },
    { key: 'code', width: 16 },
    { key: 'taskName', width: 40 },
    { key: 'member', width: 24 },
    { key: 'category', width: 18 },
    { key: 'storyPoints', width: 14 },
    { key: 'status', width: 22 },
    { key: 'createdAt', width: 20 },
    { key: 'evidence', width: 42 },
  ];

  // Row 1: Title Banner
  sheet.mergeCells('A1:I1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'FAIRSHARE — SỔ CÁI ĐÓNG GÓP (CONTRIBUTION LEDGER)';
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 30;

  // Row 2: Project & Sprint metadata
  sheet.mergeCells('A2:I2');
  const metaCell = sheet.getCell('A2');
  const exportDateStr = formatDateTime(new Date().toISOString());
  metaCell.value = `Dự án: ${projectName || 'FairShare'}   |   Giai đoạn: ${sprintName || 'Sprint hiện tại'}   |   Ngày xuất: ${exportDateStr}`;
  metaCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 22;

  // Row 3: Summary KPI strip
  const approvedSp = items
    .filter((i) => i.status === 'APPROVED')
    .reduce((acc, i) => acc + Number(i.storyPoints || 0), 0);
  const pendingSp = items
    .filter((i) => i.status === 'PENDING')
    .reduce((acc, i) => acc + Number(i.storyPoints || 0), 0);
  const rejectedCount = items.filter((i) => i.status === 'REJECTED').length;

  sheet.mergeCells('A3:I3');
  const kpiCell = sheet.getCell('A3');
  kpiCell.value = `Tổng mục: ${items.length}   |   Đã duyệt: +${approvedSp.toFixed(1)} SP   |   Chờ duyệt: ${pendingSp.toFixed(1)} SP   |   Từ chối: ${rejectedCount} mục`;
  kpiCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF312E81' } };
  kpiCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
  kpiCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(3).height = 22;

  // Row 4: Spacer
  sheet.getRow(4).height = 10;

  // Row 5: Table Header
  const headers = [
    'STT',
    'Mã đóng góp',
    'Mô tả công việc',
    'Người thực hiện',
    'Phân loại',
    'Story Points',
    'Trạng thái',
    'Ngày ghi nhận',
    'Minh chứng (URL)',
  ];
  const headerRow = sheet.getRow(5);
  headerRow.values = headers;
  headerRow.height = 26;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF4338CA' } },
      bottom: { style: 'medium', color: { argb: 'FF4338CA' } },
      left: { style: 'thin', color: { argb: 'FF6366F1' } },
      right: { style: 'thin', color: { argb: 'FF6366F1' } },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 7 || colNumber === 8
        ? 'center'
        : colNumber === 6
        ? 'right'
        : 'left',
      wrapText: true,
    };
  });

  // Data rows
  items.forEach((item, index) => {
    const rowIdx = 6 + index;
    const row = sheet.getRow(rowIdx);
    const spNum = Number(item.storyPoints || 0);
    const code = `#0${item.id}KG${String(item.id).padStart(2, '0')}`;
    const memberText = item.userEmail ? `${item.userName || 'Thành viên'} (${item.userEmail})` : (item.userName || 'Thành viên');
    const categoryText = getCategoryLabel(item.evidenceLink, item.taskName);
    const statusText = getStatusLabel(item.status);
    const dateText = formatDateTime(item.createdAt);
    const evidenceText = item.evidenceLink || '';

    row.values = [
      index + 1,
      code,
      item.taskName || '',
      memberText,
      categoryText,
      spNum,
      statusText,
      dateText,
      evidenceText,
    ];

    const isEven = index % 2 === 1;
    const baseBg = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      } else if (colNumber === 6) {
        cell.numFmt = '0.0 "SP"';
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        if (item.status === 'APPROVED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF166534' } };
        } else if (item.status === 'PENDING') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF92400E' } };
        } else if (item.status === 'REJECTED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF991B1B' } };
        }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    });

    // Make valid HTTP(S) evidence URL clickable
    if (/^https?:\/\//i.test(evidenceText)) {
      const evCell = row.getCell(9);
      evCell.value = { text: evidenceText, hyperlink: evidenceText };
      evCell.font = { name: 'Arial', size: 10, underline: true, color: { argb: 'FF2563EB' } };
    }

    // Dynamic row height for wrapped text
    const maxLen = Math.max(
      (item.taskName || '').length / 36,
      memberText.length / 22,
      evidenceText.length / 38,
      1
    );
    row.height = Math.max(24, Math.ceil(maxLen) * 16 + 8);
  });

  // Total Row
  const totalRowIdx = 6 + items.length;
  const totalRow = sheet.getRow(totalRowIdx);
  totalRow.values = [
    '',
    'TỔNG CỘNG',
    `${items.length} mục đóng góp`,
    '',
    '',
    { formula: `SUM(F6:F${totalRowIdx - 1})` },
    '',
    '',
    '',
  ];
  totalRow.height = 26;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E1B4B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF4F46E5' } },
      bottom: { style: 'medium', color: { argb: 'FF4F46E5' } },
      left: { style: 'thin', color: { argb: 'FFC7D2FE' } },
      right: { style: 'thin', color: { argb: 'FFC7D2FE' } },
    };
    if (colNumber === 6) {
      cell.numFmt = '0.0 "SP"';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (colNumber === 2) {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  });

  // Enable AutoFilter on the data table
  sheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5 + items.length, column: 9 },
  };

  // Write to browser Blob & trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeProject = (projectName || 'FairShare')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'FairShare';
  link.href = url;
  link.download = `FairShare_Ledger_${safeProject}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
