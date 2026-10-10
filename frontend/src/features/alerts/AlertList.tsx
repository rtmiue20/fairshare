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
      userId: 3,
      userName: 'Lê Văn C',
      type: 'INACTIVITY',
      message: 'Không có hoạt động nào trong vòng 5 ngày qua trên Trello/Docs.',
      createdAt: '2026-10-09T08:30:00Z',
      resolved: false,
    },
    {
      id: 2,
      userId: 4,
      userName: 'Phạm Thị D',
      type: 'NO_CONSENT',
      message: 'Chưa xác nhận đồng ý chia sẻ dữ liệu (Consent) cho Sprint 1.',
      createdAt: '2026-10-08T10:00:00Z',
      resolved: false,
    },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Cảnh báo sớm thành viên</h2>

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
                <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>{alert.userName}</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>{alert.message}</p>
              </div>
              <button
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
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
