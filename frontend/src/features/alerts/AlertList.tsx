import React, { useState } from 'react';
import { showToast } from '../../components/ui/Toast';

export interface AlertItem {
  id: number;
  level: 'warn' | 'acc' | 'ok';
  title: string;
  desc: string;
  timeAgo: string;
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 1,
    level: 'warn',
    title: 'Thu Hà chưa có hoạt động 6 ngày',
    desc: 'Vượt ngưỡng 5 ngày theo quy định Agile. Cần nhóm trưởng kiểm tra và nhắc nhở.',
    timeAgo: '10 phút trước',
  },
  {
    id: 2,
    level: 'acc',
    title: 'Sprint 3 còn 4 ngày',
    desc: 'Hiện còn 12 thẻ công việc chưa hoàn thành, 5 thẻ chưa có người nhận phụ trách.',
    timeAgo: '1 giờ trước',
  },
  {
    id: 3,
    level: 'ok',
    title: 'Chấm chéo Sprint 2 đã đủ phiếu',
    desc: 'Đã nhận đủ 4/4 phiếu đánh giá ẩn danh từ các thành viên, điểm trung bình đã chốt.',
    timeAgo: 'Hôm qua',
  },
];

export const AlertList: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);

  const handleResolve = (id: number, title: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    showToast(`Đã xử lý cảnh báo: ${title}`);
  };

  const warnCount = alerts.filter((a) => a.level === 'warn').length;

  return (
    <div className="page pad" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '24px' }}>
        <div>
          <span className="eyebrow">Cảnh báo sớm</span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', margin: '6px 0', fontWeight: 300 }}>Dấu hiệu cần can thiệp trước khi quá muộn</h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '64ch' }}>
            Hệ thống tự động phát hiện thành viên không hoạt động nhiều ngày, trễ hạn thẻ hoặc chưa được giao việc.
          </p>
        </div>
        {warnCount > 0 ? (
          <span className="chip warn" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>{warnCount} cần xử lý</span>
        ) : (
          <span className="chip ok" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Tất cả đều ổn</span>
        )}
      </div>

      <div className="panel">
        <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Cảnh báo hiện tại</h2>
          <span className="note">Cập nhật 5 phút trước · Tự động phát hiện theo rule-based CR-04</span>
        </div>

        <div className="rows" id="alertsAll" style={{ display: 'flex', flexDirection: 'column' }}>
          {alerts.map((a) => (
            <div
              key={a.id}
              className="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '16px 0',
                borderBottom: '1px solid var(--line)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: 260 }}>
                <span className={`chip ${a.level}`} style={{ marginTop: 2, flexShrink: 0 }}>
                  {a.level === 'warn' ? 'Cần xử lý' : a.level === 'ok' ? 'Ổn' : 'Lưu ý'}
                </span>
                <div>
                  <b style={{ color: 'var(--fg)', fontSize: '0.95rem', display: 'block' }}>{a.title}</b>
                  <p style={{ margin: '4px 0 0', color: 'var(--fg2)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    {a.desc}
                  </p>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--fg3)', marginTop: 4, display: 'inline-block' }}>
                    {a.timeAgo}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => showToast(`Đã gửi thông báo nhắc nhở đến thành viên`)}
                  style={{ fontSize: '0.75rem' }}
                >
                  Nhắc nhở
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => handleResolve(a.id, a.title)}
                  style={{ fontSize: '0.75rem' }}
                >
                  Đánh dấu đã giải quyết
                </button>
              </div>
            </div>
          ))}

          {alerts.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--fg3)' }}>
              <p style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>🎉</p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Tuyệt vời! Hiện tại không có cảnh báo nào tồn đọng. Nhóm đang vận hành trơn tru.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
