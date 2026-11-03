import React, { useState } from 'react';
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
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
        Đánh giá của bạn là ẩn danh hoàn toàn theo Nghị định 13/2023/NĐ-CP và chỉ được công bố khi đạt đủ số lượng đánh giá tối thiểu theo quy chế đồ án.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {criteria.map((c) => (
          <div key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>
                {c.name}
              </label>
              <span style={{ fontSize: '11px', color: '#71717a' }}>Thang điểm 1.0 - 5.0</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={scores[c.id] || ''}
                onChange={(e) => handleScoreChange(c.id, Number(e.target.value))}
                required
                placeholder="5.0"
                style={{
                  width: '90px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: '#0c0d12',
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {[3, 4, 4.5, 5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleScoreChange(c.id, preset)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: scores[c.id] === preset ? '#27272a' : 'transparent',
                      color: scores[c.id] === preset ? '#f8fafc' : '#71717a',
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#e2e8f0', marginBottom: '6px' }}>
            Nhận xét đóng góp (tùy chọn)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Ghi chú tích cực hoặc góp ý tinh thần phối hợp..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: '#0c0d12',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'none',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#ffffff',
            color: '#090a0f',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          {loading ? 'Đang gửi đánh giá...' : 'Gửi đánh giá ẩn danh'}
        </button>
      </form>
    </Card>
  );
};
