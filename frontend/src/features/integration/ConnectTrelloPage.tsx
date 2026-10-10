import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SyncStatusCard } from './SyncStatusCard';
import { integrationApi, SyncStatus } from '../../api/integration.api';

export const ConnectTrelloPage: React.FC = () => {
  const [boardId, setBoardId] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'IDLE',
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await integrationApi.connectTrello(1, { boardId, token });
      alert('Kết nối Trello thành công!');
    } catch {
      alert('Kết nối Trello thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const res = await integrationApi.syncTrello(1);
      if (res.data) setSyncStatus(res.data);
    } catch {
      alert('Đồng bộ thất bại');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title="Tích hợp Trello">
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
          Kết nối Trello Board của nhóm để FairShare tự động thu thập và ghi nhận các task đã hoàn thành làm minh chứng.
        </p>

        <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Board ID</label>
            <input
              type="text"
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              placeholder="VD: 60d21b4667d0d8992e610c85"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Trello User Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Nhập API Token Trello"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <Button type="submit" isLoading={loading}>
            Lưu và Kết nối
          </Button>
        </form>
      </Card>

      <Card title="Đồng bộ thủ công">
        <SyncStatusCard status={syncStatus} onSync={handleManualSync} isLoading={syncing} />
      </Card>
    </div>
  );
};
