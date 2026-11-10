import React, { useState } from 'react';
import { showToast } from '../../components/ui/Toast';

interface IntegrationItem {
  id: string;
  logo: string;
  name: string;
  desc: string;
  connected: boolean;
  syncTime: string;
}

const INITIAL_INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'trello',
    logo: 'Tr',
    name: 'Trello',
    desc: 'Bảng “FairShare Sprint Board” · 88 thẻ Done đã ghi nhận · đồng bộ 5 phút trước',
    connected: true,
    syncTime: '5 phút trước',
  },
  {
    id: 'gdocs',
    logo: 'Gd',
    name: 'Google Docs',
    desc: '3 tài liệu theo dõi · 1.248 lượt chỉnh sửa · đồng bộ 12 phút trước',
    connected: true,
    syncTime: '12 phút trước',
  },
  {
    id: 'internal_board',
    logo: 'Kb',
    name: 'Task Board nội bộ (CR-02)',
    desc: 'Bảng Kanban nội bộ FairShare · 92 thẻ hoạt động · kết nối trực tiếp cơ sở dữ liệu',
    connected: true,
    syncTime: 'Thời gian thực',
  },
  {
    id: 'github',
    logo: 'Gh',
    name: 'GitHub Repository',
    desc: 'rtmiue20/fairshare · 142 commit hợp lệ · webhook tự động ghi nhận',
    connected: false,
    syncTime: 'Chưa đồng bộ',
  },
];

export const ConnectTrelloPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const toggleConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.connected;
          showToast(nextState ? `Đã kết nối thành công với ${item.name}` : `Đã ngắt kết nối ${item.name}`);
          return { ...item, connected: nextState };
        }
        return item;
      })
    );
  };

  const handleSyncNow = (id: string, name: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      setIntegrations((prev) =>
        prev.map((item) => (item.id === id ? { ...item, syncTime: 'Vừa xong' } : item))
      );
      showToast(`Đã đồng bộ dữ liệu mới nhất từ ${name}!`);
    }, 700);
  };

  return (
    <div className="page pad" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-head" style={{ marginBottom: '24px' }}>
        <div>
          <span className="eyebrow">Tích hợp</span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', margin: '6px 0', fontWeight: 300 }}>Nguồn dữ liệu tự động</h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '64ch' }}>
            FairShare kết nối tới công cụ nhóm đang dùng và lắng nghe sự kiện hoạt động qua webhook hoặc cơ sở dữ liệu nội bộ.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Dịch vụ tích hợp</h2>
          <span className="chip ok" style={{ fontSize: '0.72rem' }}>
            {integrations.filter((i) => i.connected).length} đang hoạt động
          </span>
        </div>

        <div className="rows" id="integrations" style={{ display: 'flex', flexDirection: 'column' }}>
          {integrations.map((x) => (
            <div
              key={x.id}
              className="row int"
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr auto',
                alignItems: 'center',
                gap: '16px',
                padding: '18px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div
                className="logo"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color: x.connected ? 'var(--accent)' : 'var(--fg3)',
                }}
              >
                {x.logo}
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {x.name}
                  <span className={`chip ${x.connected ? 'ok' : ''}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                    {x.connected ? 'Đã kết nối' : 'Chưa kết nối'}
                  </span>
                </h3>
                <p className="note" style={{ margin: '4px 0 0', color: 'var(--fg2)', fontSize: '0.82rem' }}>
                  {x.connected ? x.desc : 'Kết nối để tự động ghi nhận hoạt động và bằng chứng vào hệ thống FairShare.'}
                </p>
                {x.connected && (
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--fg3)', marginTop: 3, display: 'inline-block' }}>
                    Lần đồng bộ cuối: {x.syncTime}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {x.connected && (
                  <button
                    type="button"
                    className="btn ghost sq sm"
                    onClick={() => handleSyncNow(x.id, x.name)}
                    disabled={syncingId === x.id}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {syncingId === x.id ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                  </button>
                )}
                <button
                  type="button"
                  className={`btn sq sm ${x.connected ? 'ghost' : ''}`}
                  onClick={() => toggleConnection(x.id)}
                  style={{ fontSize: '0.75rem' }}
                >
                  {x.connected ? 'Ngắt kết nối' : 'Kết nối'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="note" style={{ margin: '18px 0 0', fontSize: '0.75rem', color: 'var(--fg3)' }}>
          💡 Sau khi kết nối, mọi sự kiện hoàn thành thẻ hoặc chỉnh sửa tài liệu sẽ tự động được ghi nhận vào bảng bằng chứng truy vết (Audit Trail).
        </p>
      </div>
    </div>
  );
};
