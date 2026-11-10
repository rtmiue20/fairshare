import React from 'react';
import { Link } from 'react-router-dom';

interface SprintItem {
  n: string;
  t: string;
  d: string;
  p: number;
  st: string;
  c: 'ok' | 'acc' | '';
  cur?: boolean;
}

const SPRINTS: SprintItem[] = [
  {
    n: 'S1',
    t: 'Khảo sát và yêu cầu',
    d: 'Phỏng vấn stakeholder, chốt phạm vi MVP, chính sách bảo vệ dữ liệu NĐ 13/2023.',
    p: 100,
    st: 'Xong',
    c: 'ok',
  },
  {
    n: 'S2',
    t: 'Thiết kế và prototype',
    d: 'Luồng người dùng, wireframe, kiến trúc tích hợp và cơ sở dữ liệu MariaDB.',
    p: 100,
    st: 'Xong',
    c: 'ok',
  },
  {
    n: 'S3',
    t: 'Tích hợp Board và Thu thập sự kiện',
    d: 'Đồng bộ thẻ hoàn thành và ghi nhận sự kiện hoạt động bất biến (ActivityEvent).',
    p: 100,
    st: 'Xong',
    c: 'ok',
  },
  {
    n: 'S4',
    t: 'Bảng đóng góp & Chấm chéo đa chiều',
    d: 'Mô hình ScoringEngine v1.1, Biểu đồ Radar 4 chiều, Truy vết bằng chứng và Chấm chéo ẩn danh.',
    p: 85,
    st: 'Đang chạy',
    c: 'acc',
    cur: true,
  },
  {
    n: 'S5',
    t: 'Cảnh báo sớm, Báo cáo PDF & Demo',
    d: 'Nhắc nhở thành viên trễ hạn, xuất PDF chính thức nộp giảng viên, bảo vệ đồ án kết thúc môn.',
    p: 30,
    st: 'Đang thực hiện',
    c: '',
  },
];

export const TeamListPage: React.FC = () => {
  return (
    <div className="page pad" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '24px' }}>
        <div>
          <span className="eyebrow">Dự án</span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', margin: '6px 0', fontWeight: 300 }}>FairShare · 5 sprint trong học kỳ</h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '64ch' }}>
            Nền tảng đo lường và minh bạch hóa mức đóng góp trong đồ án nhóm sinh viên UEH.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/board" className="btn sm">
            Mở Kanban Board →
          </Link>
          <Link to="/dashboard" className="btn ghost sm">
            Xem Dashboard
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Lộ trình thực hiện các Sprint</h2>
          <span className="chip acc" style={{ fontSize: '0.72rem' }}>
            Học kỳ 1 • 2026-2027
          </span>
        </div>

        <div className="rows" id="sprints" style={{ display: 'flex', flexDirection: 'column' }}>
          {SPRINTS.map((s) => (
            <div
              key={s.n}
              className={`row sprint ${s.cur ? 'cur' : ''}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 180px auto',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span
                className="n"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: s.cur ? 'var(--accent)' : 'var(--fg2)',
                }}
              >
                {s.n}
              </span>

              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: 'var(--fg)' }}>
                  {s.t}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--fg2)' }}>
                  {s.d}
                </p>
              </div>

              <div className="bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '4px',
                    background: 'var(--surface2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${s.p}%`,
                      background: s.c === 'ok' ? 'var(--ok)' : 'var(--accent)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <span className="mono" style={{ fontSize: '0.75rem', minWidth: '36px', color: 'var(--fg3)' }}>
                  {s.p}%
                </span>
              </div>

              <span className={`chip ${s.c}`} style={{ fontSize: '0.72rem' }}>
                {s.st}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
