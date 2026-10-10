import React from 'react';
import { TeamMember } from '../../types/team';

export interface MemberTableProps {
  members: TeamMember[];
}

export const MemberTable: React.FC<MemberTableProps> = ({ members }) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
            <th style={{ padding: '12px 16px' }}>Thành viên</th>
            <th style={{ padding: '12px 16px' }}>Email</th>
            <th style={{ padding: '12px 16px' }}>Vai trò</th>
            <th style={{ padding: '12px 16px' }}>Đồng ý dữ liệu (Consent)</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                {m.user.fullName || 'Chưa cập nhật'}
              </td>
              <td style={{ padding: '12px 16px', color: '#64748b' }}>{m.user.email}</td>
              <td style={{ padding: '12px 16px' }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: m.role === 'LEADER' ? '#dbeafe' : '#f1f5f9',
                    color: m.role === 'LEADER' ? '#1e40af' : '#475569',
                  }}
                >
                  {m.role}
                </span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                {m.hasConsented ? (
                  <span style={{ color: '#16a34a', fontWeight: 500 }}>✓ Đã đồng ý</span>
                ) : (
                  <span style={{ color: '#dc2626' }}>Chưa đồng ý</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
