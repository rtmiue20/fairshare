import React from 'react';
import { PeerReviewResult } from '../../api/peerReview.api';
import { Card } from '../../components/ui/Card';

export interface ReviewResultCardProps {
  results: PeerReviewResult[];
}

export const ReviewResultCard: React.FC<ReviewResultCardProps> = ({ results }) => {
  return (
    <Card title="Kết quả đánh giá chéo sprint">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {results.map((res) => (
          <div
            key={res.userId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{res.userName}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Số lượt đánh giá: {res.submissionCount}
              </div>
            </div>
            <div>
              {res.isAnonymousValid ? (
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#2563eb' }}>
                  {res.averageScore.toFixed(2)} / 5.0
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: '#eab308' }}>
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
