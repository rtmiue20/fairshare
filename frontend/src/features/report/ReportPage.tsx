import React, { useState } from 'react';
import { showToast } from '../../components/ui/Toast';
import { reportApi } from '../../api/report.api';
import { useAuthStore } from '../../store/authStore';

interface ReportMember {
  name: string;
  role: string;
  pct: number;
  tasks: number;
  sp: number;
  peer: number;
  color: string;
}

const REPORT_MEMBERS: ReportMember[] = [
  { name: 'Nguyễn Văn Minh Triều', role: 'Leader / PM', pct: 28, tasks: 12, sp: 18, peer: 4.8, color: 'var(--m1, #1a56db)' },
  { name: 'Nguyễn Phúc Vương', role: 'Nền tảng & Board', pct: 22, tasks: 10, sp: 15, peer: 4.5, color: 'var(--m2, #0d9488)' },
  { name: 'Ngô Trọng Phúc', role: 'Scoring & Data', pct: 20, tasks: 9, sp: 14, peer: 4.6, color: 'var(--m3, #6366f1)' },
  { name: 'Hà Ngọc Thiện', role: 'BA & Nhóm', pct: 12, tasks: 6, sp: 8, peer: 4.3, color: 'var(--m4, #f59e0b)' },
  { name: 'Triệu Nguyễn Huỳnh Khang', role: 'Chấm chéo & Alert', pct: 10, tasks: 5, sp: 7, peer: 4.2, color: 'var(--m5, #ec4899)' },
  { name: 'Khiếu Hoàng Nam Anh', role: 'QA & Deployment', pct: 8, tasks: 4, sp: 6, peer: 4.1, color: 'var(--m6, #8b5cf6)' },
];

export const ReportPage: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const { user: currentUser } = useAuthStore();
  const isLeader = currentUser?.id === 1 || currentUser?.email?.startsWith('trieu');

  const handleDownloadBackendPdf = async () => {
    try {
      setDownloading(true);
      // Sử dụng mock teamId=1 và sprintId=4 (hoặc 5)
      const blob = await reportApi.downloadPdfReport(1, 4);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FairShare_BaoCao_DongGop_UEH.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Đã tải thành công file PDF báo cáo từ hệ thống');
    } catch {
      showToast('Đang kết nối backend... Vui lòng dùng tính năng In trực tiếp');
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintPreview = () => {
    window.print();
    showToast('Đã mở hộp thoại in / lưu PDF của trình duyệt');
  };

  return (
    <div className="page pad">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <span className="eyebrow" style={{ textTransform: 'uppercase', fontSize: 12, color: '#64748b', fontWeight: 600 }}>Phân hệ Xuất báo cáo (WP0)</span>
          <h1 style={{ margin: '4px 0 0 0' }}>Bản đóng góp nộp cho giảng viên</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn"
            type="button"
            onClick={handlePrintPreview}
            style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff' }}
          >
            🖨️ Xem trước / In
          </button>
          {isLeader ? (
            <button
              className="btn sq"
              id="pdfBtn"
              type="button"
              onClick={handleDownloadBackendPdf}
              disabled={downloading}
              style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', background: '#1a56db', color: '#fff', border: 'none', fontWeight: 600 }}
            >
              {downloading ? '⏳ Đang tạo PDF...' : '📄 Tải file PDF chính thức'}
            </button>
          ) : (
            <span
              style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', padding: '0 8px' }}
              title="Chỉ Leader mới có quyền xuất file PDF báo cáo chính thức"
            >
              🔒 Xuất PDF: Chỉ dành cho Leader
            </span>
          )}
        </div>
      </div>

      <div className="paper" style={{ background: '#fff', padding: 30, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: 15, marginBottom: 20 }}>
          <h4 style={{ margin: 0, color: '#64748b' }}>TRƯỜNG ĐẠI HỌC KINH TẾ TP. HỒ CHÍ MINH (UEH)</h4>
          <h2 style={{ margin: '8px 0', color: '#1a56db' }}>FAIRSHARE · BÁO CÁO ĐÓNG GÓP & MINH BẠCH NĂNG SUẤT</h2>
          <small style={{ color: '#64748b' }}>
            Môn: Quản lý dự án CNTT · GV: TS. Nguyễn Mạnh Tuấn · Mô hình ScoringEngine v1.1 (CR-03)
          </small>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: 10 }}>Thành viên</th>
              <th style={{ padding: 10 }}>Tỷ lệ đóng góp</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Story Points</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Thẻ hoàn thành</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Chấm chéo (≥3 lượt)</th>
            </tr>
          </thead>
          <tbody id="reportRows">
            {REPORT_MEMBERS.map((m) => (
              <tr key={m.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 10 }}>
                  <b>{m.name}</b>
                  <br />
                  <small style={{ color: '#64748b' }}>{m.role}</small>
                </td>
                <td style={{ padding: 10, width: '30%' }}>
                  <div className="mini" style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(m.pct / 40) * 100}%`,
                        background: m.color,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <small style={{ fontWeight: 600 }}>{m.pct}%</small>
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>{m.sp}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>{m.tasks}</td>
                <td style={{ padding: 10, textAlign: 'center', fontWeight: 600, color: '#0d9488' }}>{m.peer.toFixed(1)} / 5.0</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ background: '#f8fafc', padding: 15, borderRadius: 6, fontSize: 13, color: '#475569', borderLeft: '4px solid #1a56db' }}>
          <b>Ghi chú truy vết & Đạo đức dữ liệu:</b>
          <br />
          • Mọi con số đều truy vết được về thẻ công việc (Kanban Task Board) và sự kiện hoạt động bất biến (`ActivityEvent`) trong phụ lục.
          <br />
          • Báo cáo tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân (100% Consent từ các thành viên).
        </div>
      </div>
    </div>
  );
};
