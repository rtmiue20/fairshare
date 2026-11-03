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
          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#0c0d12' }}>
            <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: '13px' }}>Nguồn</th>
            <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: '13px' }}>Nội dung hoạt động</th>
            <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: '13px' }}>Thời gian ghi nhận</th>
            <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: '13px' }}>Trọng số điểm</th>
            <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: '13px' }}>Bằng chứng</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <td style={{ padding: '12px 16px' }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    backgroundColor:
                      item.source === 'TRELLO'
                        ? 'rgba(37, 99, 235, 0.15)'
                        : item.source === 'GOOGLE_DOCS'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color:
                      item.source === 'TRELLO'
                        ? '#60a5fa'
                        : item.source === 'GOOGLE_DOCS'
                        ? '#34d399'
                        : '#fbbf24',
                    border:
                      item.source === 'TRELLO'
                        ? '1px solid rgba(37, 99, 235, 0.3)'
                        : item.source === 'GOOGLE_DOCS'
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  {item.source}
                </span>
              </td>
              <td style={{ padding: '12px 16px', fontWeight: 500, color: '#f8fafc' }}>{item.title}</td>
              <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>
                {formatDateTime(item.timestamp)}
              </td>
              <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: 600 }}>+{item.weight}</td>
              <td style={{ padding: '12px 16px' }}>
                {item.externalUrl ? (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#818cf8', textDecoration: 'none' }}
                  >
                    Xem gốc ↗
                  </a>
                ) : (
                  <span style={{ color: '#71717a' }}>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
