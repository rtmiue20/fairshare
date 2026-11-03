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
        borderRadius: '8px',
        backgroundColor: '#0c0d12',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#f8fafc' }}>
          Trạng thái đồng bộ:{' '}
          <strong
            style={{
              color: status.status === 'FAILED' ? '#ef4444' : status.status === 'SYNCING' ? '#38bdf8' : '#10b981',
            }}
          >
            {status.status}
          </strong>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
          Đồng bộ lần cuối:{' '}
          {status.lastSyncAt ? formatDateTime(status.lastSyncAt) : 'Chưa có'}
        </div>
      </div>
      <button
        onClick={onSync}
        disabled={isLoading}
        style={{
          padding: '8px 14px',
          fontSize: '13px',
          fontWeight: 500,
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        {isLoading ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
      </button>
    </div>
  );
};
