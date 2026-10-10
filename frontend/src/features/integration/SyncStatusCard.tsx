import React from 'react';
import { SyncStatus } from '../../api/integration.api';
import { formatDateTime } from '../../utils/date';

export interface SyncStatusCardProps {
  status: SyncStatus;
  onSync: () => void;
  isLoading: boolean;
}

export const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  status,
  onSync,
  isLoading,
}) => {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '6px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>
          Trạng thái đồng bộ: <strong>{status.status}</strong>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
          Đồng bộ lần cuối:{' '}
          {status.lastSyncAt ? formatDateTime(status.lastSyncAt) : 'Chưa có'}
        </div>
      </div>
      <button
        onClick={onSync}
        disabled={isLoading}
        style={{
          padding: '6px 12px',
          fontSize: '13px',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
      </button>
    </div>
  );
};
