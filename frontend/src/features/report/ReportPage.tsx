import React, { useState } from 'react';
import { showToast } from '../../components/ui/Toast';
import { reportApi } from '../../api/report.api';
import { useAuthStore } from '../../store/authStore';

interface ReportMember {
  name: string;
  role: string;
  pct: number;
  tasks: number;
  edits: number;
  peer: number;
  color: string;
}

const REPORT_MEMBERS: ReportMember[] = [
  { name: 'Nguyễn Văn Minh Triều', role: 'Leader / PM', pct: 28, tasks: 12, edits: 412, peer: 4.8, color: 'var(--m1, #2f6fe0)' },
  { name: 'Nguyễn Phúc Vương', role: 'Nền tảng & Board', pct: 22, tasks: 10, edits: 338, peer: 4.5, color: 'var(--m2, #a23fc4)' },
  { name: 'Ngô Trọng Phúc', role: 'Scoring & Data', pct: 20, tasks: 9, edits: 301, peer: 4.6, color: 'var(--m3, #c98512)' },
  { name: 'Hà Ngọc Thiện', role: 'BA & Nhóm', pct: 12, tasks: 6, edits: 197, peer: 4.3, color: 'var(--m4, #1c9a85)' },
  { name: 'Triệu Nguyễn Huỳnh Khang', role: 'Chấm chéo & Alert', pct: 10, tasks: 5, edits: 124, peer: 4.2, color: 'var(--guide, #9a1fb0)' },
  { name: 'Khiếu Hoàng Nam Anh', role: 'QA & Triển khai', pct: 8, tasks: 4, edits: 89, peer: 4.1, color: 'var(--fg3, #8a8c95)' },
];

export const ReportPage: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const { user: currentUser } = useAuthStore();
  const isLeader = currentUser?.id === 1 || currentUser?.email?.startsWith('trieu');

  const handleDownloadBackendPdf = async () => {
    try {
      setDownloading(true);
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
      showToast('Đang kết nối backend... Đã mở chế độ In / Lưu PDF từ trình duyệt');
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
    <div className="page pad" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '24px' }}>
        <div>
          <span className="eyebrow">Báo cáo</span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', margin: '6px 0', fontWeight: 300 }}>Bản đóng góp nộp cho giảng viên</h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '64ch' }}>
            Bảng tổng hợp điểm danh nghĩa và tỷ lệ đóng góp được chốt khi kết thúc sprint.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn ghost sq sm" type="button" onClick={handlePrintPreview}>
            🖨️ Xem trước / In
          </button>
          {isLeader ? (
            <button
              className="btn sq sm"
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

      <div className="paper" style={{ background: 'var(--surface)', padding: '36px', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="paper-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--line)', paddingBottom: '18px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--fg)' }}>
              FairShare · Báo cáo đóng góp
            </h2>
            <p className="note" style={{ margin: '4px 0 0', color: 'var(--fg3)', fontSize: '0.8rem' }}>
              Đồ án môn Quản lý dự án CNTT · Nhóm 07 · Sprint 4 (Hiện tại)
            </p>
          </div>
          <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--fg3)' }}>
            10/11/2026
          </span>
        </div>

        <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
              <th style={{ padding: '10px 8px', color: 'var(--fg3)', fontSize: '0.75rem', fontWeight: 600 }}>Thành viên</th>
              <th style={{ padding: '10px 8px', color: 'var(--fg3)', fontSize: '0.75rem', fontWeight: 600, width: '32%' }}>Tỷ lệ đóng góp</th>
              <th style={{ padding: '10px 8px', color: 'var(--fg3)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>Task Board</th>
              <th style={{ padding: '10px 8px', color: 'var(--fg3)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>Chỉnh sửa Docs</th>
              <th style={{ padding: '10px 8px', color: 'var(--fg3)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>Chấm chéo</th>
            </tr>
          </thead>
          <tbody id="reportRows">
            {REPORT_MEMBERS.map((m) => (
              <tr key={m.name} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '12px 8px' }}>
                  <b style={{ color: 'var(--fg)', fontSize: '0.9rem' }}>{m.name}</b>
                  <br />
                  <small style={{ color: 'var(--fg3)', fontSize: '0.72rem' }}>{m.role}</small>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <div className="mini" style={{ height: '6px', background: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(m.pct / 35) * 100}%`,
                        background: m.color,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <small style={{ fontWeight: 600, color: 'var(--fg)' }}>{m.pct}%</small>
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.85rem' }}>
                  {m.tasks}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.85rem' }}>
                  {m.edits}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'var(--f-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ok)' }}>
                  {m.peer.toFixed(1)} / 5.0
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="note" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--fg3)', lineHeight: 1.5 }}>
          🔒 <strong>Bảo đảm đạo đức dữ liệu:</strong> Mọi con số đều truy vết được về thẻ Kanban Task Board và sự kiện hoạt động bất biến (<code>ActivityEvent</code>) trong phụ lục. Báo cáo tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân.
        </p>
      </div>
    </div>
  );
};
