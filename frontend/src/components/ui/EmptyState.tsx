import React from 'react';
import { FolderOpen } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Chưa có dữ liệu',
  description = 'Hiện tại không có thông tin nào để hiển thị.',
  action,
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px dashed #cbd5e1',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#94a3b8' }}>
        <FolderOpen size={36} strokeWidth={1.5} />
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#1e293b' }}>{title}</h3>
      <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b' }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
