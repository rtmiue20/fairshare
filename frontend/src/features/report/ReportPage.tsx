import React from 'react';
import { showToast } from '../../components/ui/Toast';

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
  { name: 'Minh Triều', role: 'Leader', pct: 34, tasks: 31, edits: 412, peer: 4.3, color: 'var(--m1)' },
  { name: 'Lan Anh', role: 'Backend', pct: 27, tasks: 26, edits: 338, peer: 4.1, color: 'var(--m2)' },
  { name: 'Quốc Bảo', role: 'Frontend', pct: 24, tasks: 22, edits: 301, peer: 3.9, color: 'var(--m3)' },
  { name: 'Thu Hà', role: 'Tài liệu', pct: 15, tasks: 9, edits: 197, peer: 3.2, color: 'var(--m4)' },
];

export const ReportPage: React.FC = () => {
  const handleExportPDF = () => {
    window.print();
    showToast('Đã chuẩn bị bản in / PDF báo cáo');
  };

  return (
    <div className="page pad">
      <div className="page-head">
        <div>
          <span className="eyebrow">Xuất báo cáo</span>
          <h1>Bản đóng góp nộp cho giảng viên</h1>
        </div>
        <button
          className="btn sq"
          id="pdfBtn"
          type="button"
          onClick={handleExportPDF}
        >
          Xuất PDF
        </button>
      </div>

      <div className="paper">
        <h3>FAIRSHARE · BÁO CÁO ĐÓNG GÓP</h3>
        <small>
          Môn Quản lý dự án CNTT · Giảng viên: TS. Nguyễn Mạnh Tuấn · Đến hết Sprint 3 · Dữ liệu mẫu
        </small>

        <table>
          <thead>
            <tr>
              <th>Thành viên</th>
              <th>Tỷ lệ</th>
              <th className="r">Task</th>
              <th className="r">Chỉnh sửa</th>
              <th className="r">Chấm chéo</th>
            </tr>
          </thead>
          <tbody id="reportRows">
            {REPORT_MEMBERS.map((m) => (
              <tr key={m.name}>
                <td>
                  <b>{m.name}</b>
                  <br />
                  <small>{m.role}</small>
                </td>
                <td style={{ width: '30%' }}>
                  <div className="mini">
                    <i
                      style={{
                        width: `${(m.pct / 40) * 100}%`,
                        background: m.color,
                      }}
                    />
                  </div>
                  <small>{m.pct}%</small>
                </td>
                <td className="r">{m.tasks}</td>
                <td className="r">{m.edits}</td>
                <td className="r">{m.peer.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <small>
          Mọi con số đều truy vết được về thẻ Trello hoặc lịch sử chỉnh sửa Google Docs trong phụ lục.
        </small>
      </div>
    </div>
  );
};
