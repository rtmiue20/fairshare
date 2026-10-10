import React from 'react';
import { EvidenceItem } from '../../types/contribution';
import { formatDateTime } from '../../utils/date';

export interface EvidenceTableProps {
  items: EvidenceItem[];
}

export const EvidenceTable: React.FC<EvidenceTableProps> = ({ items }) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
            <th style={{ padding: '12px 16px' }}>Nguồn</th>
            <th style={{ padding: '12px 16px' }}>Nội dung hoạt động</th>
            <th style={{ padding: '12px 16px' }}>Thời gian ghi nhận</th>
            <th style={{ padding: '12px 16px' }}>Trọng số điểm</th>
            <th style={{ padding: '12px 16px' }}>Bằng chứng</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '12px 16px' }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor:
                      item.source === 'TRELLO'
                        ? '#dbeafe'
                        : item.source === 'GOOGLE_DOCS'
                        ? '#dcfce7'
                        : '#fef3c7',
                    color:
                      item.source === 'TRELLO'
                        ? '#1e40af'
                        : item.source === 'GOOGLE_DOCS'
                        ? '#166534'
                        : '#92400e',
                  }}
                >
                  {item.source}
                </span>
              </td>
              <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.title}</td>
              <td style={{ padding: '12px 16px', color: '#64748b' }}>
                {formatDateTime(item.timestamp)}
              </td>
              <td style={{ padding: '12px 16px' }}>+{item.weight}</td>
              <td style={{ padding: '12px 16px' }}>
                {item.externalUrl ? (
                  <a href={item.externalUrl} target="_blank" rel="noreferrer">
                    Xem gốc ↗
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
