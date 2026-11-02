import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <Header onToggleSidebar={handleToggleSidebar} isSidebarOpen={isSidebarOpen} />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar isOpen={isSidebarOpen} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <main style={{ flex: 1, padding: '28px 32px', maxWidth: '1360px', width: '100%', margin: '0 auto' }}>
            <Outlet />
          </main>

          <footer
            style={{
              padding: '14px 32px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            <span>© 2026 FairShare – Đồ án Quản lý dự án CNTT (UEH)</span>
            <span>Phân hệ M1 (Nguyễn Phúc Vương – 31241025017)</span>
          </footer>
        </div>
      </div>
    </div>
  );
};
