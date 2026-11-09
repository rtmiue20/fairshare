import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  peerReviewApi,
  ReviewCriterion,
  REVIEW_CRITERIA,
} from '../../api/peerReview.api';

export interface ReviewFormProps {
  roundId: number;
  revieweeId: number;
  revieweeName: string;
  onSuccess: () => void;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof error.response === 'object'
    && error.response !== null
    && 'data' in error.response
    && typeof error.response.data === 'object'
    && error.response.data !== null
    && 'message' in error.response.data
    && typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }
  return 'Không thể gửi đánh giá. Vui lòng thử lại.';
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  roundId,
  revieweeId,
  revieweeName,
  onSuccess,
}) => {
  const [scores, setScores] = useState<Partial<Record<ReviewCriterion, string>>>({});
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleScoreChange = (criterion: ReviewCriterion, score: string) => {
    setScores((previous) => ({ ...previous, [criterion]: score }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const invalidScore = REVIEW_CRITERIA.some(({ value }) => {
      const score = Number(scores[value]);
      return !scores[value] || !Number.isInteger(score) || score < 1 || score > 5;
    });
    if (invalidScore) {
      setErrorMessage('Vui lòng nhập điểm từ 1 đến 5 cho tất cả tiêu chí.');
      return;
    }

    setLoading(true);
    try {
      await peerReviewApi.submitReview(roundId, {
        revieweeId,
        scores: REVIEW_CRITERIA.map(({ value }) => ({
          criterion: value,
          score: Number(scores[value]),
        })),
        feedback: feedback.trim() || undefined,
      });
      setSuccessMessage('Đã gửi đánh giá thành công.');
      setScores({});
      setFeedback('');
      onSuccess();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={`Đánh giá thành viên: ${revieweeName}`}>
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
        Chấm điểm từ 1 đến 5. Đánh giá được lưu ẩn danh và chỉ hiển thị kết quả khi đủ số lượt tối thiểu.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {REVIEW_CRITERIA.map(({ value, label }) => (
          <div key={value}>
            <label
              htmlFor={`score-${value}`}
              style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#e2e8f0', marginBottom: '6px' }}
            >
              {label}
            </label>
            <input
              id={`score-${value}`}
              aria-label={label}
              type="number"
              min="1"
              max="5"
              step="1"
              value={scores[value] ?? ''}
              onChange={(event) => handleScoreChange(value, event.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: '#0c0d12',
                color: '#f8fafc',
                fontSize: '14px',
              }}
            />
          </div>
        ))}

        <div>
          <label
            htmlFor="review-feedback"
            style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#e2e8f0', marginBottom: '6px' }}
          >
            Nhận xét (không bắt buộc)
          </label>
          <textarea
            id="review-feedback"
            value={feedback}
            maxLength={2000}
            onChange={(event) => setFeedback(event.target.value)}
            rows={3}
            placeholder="Ghi nhận xét ngắn gọn, mang tính xây dựng..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: '#0c0d12',
              color: '#f8fafc',
              fontSize: '13px',
              resize: 'vertical',
            }}
          />
        </div>

        {errorMessage && <p role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{errorMessage}</p>}
        {successMessage && <p role="status" style={{ color: '#34d399', fontSize: '13px' }}>{successMessage}</p>}

        <Button type="submit" isLoading={loading}>
          Gửi đánh giá
        </Button>
      </form>
    </Card>
  );
};
