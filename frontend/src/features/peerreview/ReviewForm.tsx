import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { peerReviewApi, ReviewCriterion } from '../../api/peerReview.api';

export interface ReviewFormProps {
  roundId: number;
  revieweeId: number;
  revieweeName: string;
  criteria: ReviewCriterion[];
  onSuccess: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  roundId,
  revieweeId,
  revieweeName,
  criteria,
  onSuccess,
}) => {
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScoreChange = (criterionId: number, score: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: score }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const formattedScores = Object.entries(scores).map(([criterionId, score]) => ({
        criterionId: Number(criterionId),
        score,
      }));

      await peerReviewApi.submitReview(roundId, {
        revieweeId,
        scores: formattedScores,
        comment,
      });

      alert('Đã gửi đánh giá thành công!');
      onSuccess();
    } catch {
      alert('Không thể gửi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={`Đánh giá thành viên: ${revieweeName}`}>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
        Đánh giá của bạn là ẩn danh và chỉ được công bố khi đạt đủ số lượng đánh giá tối thiểu theo quy định.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {criteria.map((c) => (
          <div key={c.id}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
              {c.name} (Điểm 1 - 5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.5"
              value={scores[c.id] || ''}
              onChange={(e) => handleScoreChange(c.id, Number(e.target.value))}
              required
              style={{ width: '100px', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
        ))}

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
            Nhận xét đóng góp (tùy chọn)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <Button type="submit" isLoading={loading}>
          Gửi đánh giá ẩn danh
        </Button>
      </form>
    </Card>
  );
};
