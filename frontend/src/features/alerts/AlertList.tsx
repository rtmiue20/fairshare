import React from 'react';
import { Card } from '../../components/ui/Card';

export interface AlertItem {
  id: number;
  userId: number;
  userName: string;
  type: 'INACTIVITY' | 'NO_CONSENT' | 'LOW_CONTRIBUTION';
  message: string;
  createdAt: string;
  resolved: boolean;
}

export const AlertList: React.FC = () => {
  const alerts: AlertItem[] = [
    {
      id: 1,
      userId: 4,
      userName: 'Ngô Trọng Phúc',
      type: 'INACTIVITY',
      message: 'Không có hoạt động cập nhật thẻ Trello hoặc tài liệu trong 4 ngày qua.',
      createdAt: '2026-11-01T08:30:00Z',
      resolved: false,
    },
    {
      id: 2,
      userId: 6,
      userName: 'Khiếu Hoàng Nam Anh',
      type: 'NO_CONSENT',
      message: 'Chưa hoàn tất xác nhận chia sẻ dữ liệu minh chứng theo chính sách NĐ 13/2023.',
      createdAt: '2026-11-01T10:00:00Z',
      resolved: false,
    },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f8fafc' }}>Cảnh báo sớm thành viên</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map((alert) => (
          <Card key={alert.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    marginBottom: '8px',
                  }}
                >
                  {alert.type}
                </span>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#f8fafc' }}>{alert.userName}</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>{alert.message}</p>
              </div>
              <button
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: '#ffffff',
                  color: '#090a0f',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Nhắc nhở
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
