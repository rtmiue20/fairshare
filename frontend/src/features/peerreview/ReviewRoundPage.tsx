import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ReviewForm } from './ReviewForm';
import { ReviewResultCard } from './ReviewResultCard';
import { PeerReviewResult, ReviewCriterion } from '../../api/peerReview.api';

export const ReviewRoundPage: React.FC = () => {
  const [selectedReviewee] = useState({ id: 2, name: 'Nguyễn Văn A' });

  const criteria: ReviewCriterion[] = [
    { id: 1, name: 'Chất lượng công việc hoàn thành', weight: 1.0 },
    { id: 2, name: 'Đúng hạn (On-time delivery)', weight: 1.0 },
    { id: 3, name: 'Tinh thần hợp tác & đóng góp nhóm', weight: 1.0 },
  ];

  const results: PeerReviewResult[] = [
    {
      userId: 1,
      userName: 'Trần Văn B (Bạn)',
      averageScore: 4.8,
      submissionCount: 4,
      isAnonymousValid: true,
    },
    {
      userId: 2,
      userName: 'Nguyễn Văn A',
      averageScore: 4.2,
      submissionCount: 4,
      isAnonymousValid: true,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600 }}>Chấm chéo Sprint 1</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Hạn chót: 23:59 15/10/2026</p>
        </div>
        <Button variant="outline">Mở đợt chấm mới</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <ReviewForm
          roundId={1}
          revieweeId={selectedReviewee.id}
          revieweeName={selectedReviewee.name}
          criteria={criteria}
          onSuccess={() => alert('Hoàn thành')}
        />
        <ReviewResultCard results={results} />
      </div>
    </div>
  );
};
