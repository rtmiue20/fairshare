import React from 'react';
import { PeerReviewResult } from '../../api/peerReview.api';
import { Card } from '../../components/ui/Card';

export interface ReviewResultCardProps {
  results: PeerReviewResult[];
}

export const ReviewResultCard: React.FC<ReviewResultCardProps> = ({ results }) => {
  return (
    <Card title="Kết quả đánh giá chéo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {results.map((res) => (
          <div
            key={res.userId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: '#0c0d12',
              borderRadius: '8px',
            }}
          >
            <div>
              <div style={{ fontWeight: 500, color: '#f8fafc', fontSize: '14px' }}>{res.userName}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Số lượt đánh giá: {res.submissionCount} phiếu hợp lệ
              </div>
            </div>
            <div>
              {res.isAnonymousValid ? (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#10b981', fontFamily: 'monospace' }}>
                    {res.averageScore.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#71717a' }}> / 5.0</span>
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: '#f59e0b' }}>
                  (Chưa đủ số lượt đánh giá tối thiểu)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
