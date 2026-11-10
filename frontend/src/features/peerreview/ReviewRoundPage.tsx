import React, { useState } from 'react';
import { showToast } from '../../components/ui/Toast';

interface PeerMember {
  id: string;
  name: string;
  ini: string;
  role: string;
  color: string;
}

const PEER_MEMBERS: PeerMember[] = [
  { id: 'm1', name: 'Nguyễn Văn Minh Triều', ini: 'MT', role: 'Leader / PM', color: 'var(--m1)' },
  { id: 'm2', name: 'Nguyễn Phúc Vương', ini: 'PV', role: 'Nền tảng & Board', color: 'var(--m2)' },
  { id: 'm4', name: 'Hà Ngọc Thiện', ini: 'NT', role: 'BA & Nhóm', color: 'var(--m4)' },
  { id: 'm5', name: 'Triệu Nguyễn Huỳnh Khang', ini: 'HK', role: 'Chấm chéo & Alert', color: 'var(--m3)' },
  { id: 'm6', name: 'Khiếu Hoàng Nam Anh', ini: 'NA', role: 'QA & Triển khai', color: 'var(--guide)' },
];

export const ReviewRoundPage: React.FC = () => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(PEER_MEMBERS[0].id);
  const [q1, setQ1] = useState<number>(4);
  const [q2, setQ2] = useState<number>(4);
  const [q3, setQ3] = useState<number>(4);
  const [comment, setComment] = useState<string>('');
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = PEER_MEMBERS.find((m) => m.id === selectedMemberId);
    if (!target) return;

    setCompletedSet((prev) => new Set([...prev, selectedMemberId]));
    showToast(`Đã gửi đánh giá ẩn danh cho ${target.name} (Điểm TB: ${((q1 + q2 + q3) / 3).toFixed(1)}/5.0)`);
    setComment('');

    // Chuyển sang thành viên tiếp theo chưa chấm nếu có
    const nextUnrated = PEER_MEMBERS.find((m) => m.id !== selectedMemberId && !completedSet.has(m.id));
    if (nextUnrated) {
      setSelectedMemberId(nextUnrated.id);
    }
  };

  const doneCount = completedSet.size;
  const totalCount = PEER_MEMBERS.length;

  return (
    <div className="page pad" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '24px' }}>
        <div>
          <span className="eyebrow">Chấm chéo ẩn danh · Sprint 4 (Hiện tại)</span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', margin: '6px 0', fontWeight: 300 }}>Đánh giá đồng đội cuối sprint</h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '64ch' }}>
            Người được chấm không thể thấy ai đã chấm mình. Điểm tổng hợp chỉ hiển thị khi đạt ngưỡng bảo vệ danh tính ≥ 3 lượt đánh giá.
          </p>
        </div>
        <span
          className={`chip ${doneCount >= totalCount ? 'ok' : ''}`}
          style={{ fontSize: '0.85rem', padding: '6px 14px', fontWeight: 600 }}
        >
          Đã chấm {doneCount} / {totalCount} thành viên
        </span>
      </div>

      <div className="grid2">
        {/* Rating Form */}
        <form className="panel" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="panel-h" style={{ marginBottom: 4 }}>
            <h2>Phiếu đánh giá đồng đội</h2>
            <span className="chip" style={{ fontSize: '0.7rem' }}>Bảo mật 100%</span>
          </div>

          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="rateWho" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg2)' }}>
              Chấm cho thành viên
            </label>
            <select
              id="rateWho"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--surface2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                outline: 'none',
              }}
            >
              {PEER_MEMBERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.role} {completedSet.has(m.id) ? '✓ (Đã gửi)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Slider 1: Quality */}
          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="r1" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--fg)' }}>
              <span>Chất lượng công việc (Output Quality)</span>
              <span className="rate-val chip acc" style={{ fontSize: '0.8rem', padding: '1px 8px' }}>{q1} / 5</span>
            </label>
            <input
              type="range"
              id="r1"
              min="1"
              max="5"
              step="1"
              value={q1}
              onChange={(e) => setQ1(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Slider 2: On-time */}
          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="r2" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--fg)' }}>
              <span>Đúng hạn & Tiến độ cam kết (Timeliness)</span>
              <span className="rate-val chip acc" style={{ fontSize: '0.8rem', padding: '1px 8px' }}>{q2} / 5</span>
            </label>
            <input
              type="range"
              id="r2"
              min="1"
              max="5"
              step="1"
              value={q2}
              onChange={(e) => setQ2(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Slider 3: Collaboration */}
          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="r3" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--fg)' }}>
              <span>Tinh thần hợp tác & Phản hồi (Collaboration)</span>
              <span className="rate-val chip acc" style={{ fontSize: '0.8rem', padding: '1px 8px' }}>{q3} / 5</span>
            </label>
            <input
              type="range"
              id="r3"
              min="1"
              max="5"
              step="1"
              value={q3}
              onChange={(e) => setQ3(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Comment */}
          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="rc" style={{ fontSize: '0.85rem', color: 'var(--fg2)' }}>
              Nhận xét định tính (Ẩn danh, không bắt buộc)
            </label>
            <textarea
              id="rc"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ví dụ: Hoàn thành task đúng hạn, giải quyết bug tích cực, hỗ trợ đồng đội tốt..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--surface2)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <button className="btn sq" type="submit" style={{ justifyContent: 'center', marginTop: 4 }}>
            Gửi đánh giá ẩn danh
          </button>
        </form>

        {/* Progress List */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Tiến độ đánh giá của bạn</h2>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--fg3)' }}>
              Sprint 4
            </span>
          </div>

          <div className="rows" id="rateList" style={{ display: 'flex', flexDirection: 'column' }}>
            {PEER_MEMBERS.map((m) => {
              const isDone = completedSet.has(m.id);
              const isSelected = m.id === selectedMemberId;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMemberId(m.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr auto',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                    background: isSelected ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <span
                    className="avatar"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: `color-mix(in srgb, ${m.color} 20%, var(--surface2))`,
                      color: m.color,
                      border: `1px solid ${m.color}`,
                    }}
                  >
                    {m.ini}
                  </span>

                  <div>
                    <b style={{ fontSize: '0.88rem', color: 'var(--fg)', display: 'block' }}>{m.name}</b>
                    <small style={{ color: 'var(--fg3)', fontSize: '0.72rem' }}>{m.role}</small>
                  </div>

                  <span className={`chip ${isDone ? 'ok' : ''}`} style={{ fontSize: '0.7rem' }}>
                    {isDone ? '✓ Đã chấm' : 'Chưa chấm'}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'var(--surface2)', padding: '12px 14px', borderRadius: '8px', marginTop: 10 }}>
            <p className="note" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--fg3)', lineHeight: 1.5 }}>
              🔒 <strong>Đạo đức dữ liệu & Ẩn danh:</strong> Điểm đánh giá được mã hóa một chiều. Thuật toán <code>AnonymityAggregator</code> chỉ tổng hợp và hiển thị kết quả lên Dashboard khi nhận đủ tối thiểu ≥ 3 lượt đánh giá từ các thành viên khác nhau.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
