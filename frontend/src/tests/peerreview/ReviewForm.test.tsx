import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { peerReviewApi } from '../../api/peerReview.api';
import { ReviewForm } from '../../features/peerreview/ReviewForm';

vi.mock('../../api/peerReview.api', () => ({
  REVIEW_CRITERIA: [
    { value: 'QUALITY', label: 'Chất lượng công việc' },
    { value: 'PUNCTUALITY', label: 'Tiến độ và đúng hạn' },
    { value: 'COOPERATION', label: 'Hợp tác với thành viên' },
  ],
  peerReviewApi: {
    submitReview: vi.fn(),
  },
}));

describe('ReviewForm', () => {
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires a valid score for every criterion before submitting', async () => {
    render(
      <ReviewForm
        roundId={9}
        revieweeId={4}
        revieweeName="Thành viên B"
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText('Chất lượng công việc'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('cho tất cả tiêu chí');
    expect(peerReviewApi.submitReview).not.toHaveBeenCalled();
  });

  it('sends scores matching the backend criteria and reports success', async () => {
    vi.mocked(peerReviewApi.submitReview).mockResolvedValue({
      success: true,
      message: 'Gửi đánh giá thành công',
      data: 3,
    });
    render(
      <ReviewForm
        roundId={9}
        revieweeId={4}
        revieweeName="Thành viên B"
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText('Chất lượng công việc'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Tiến độ và đúng hạn'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Hợp tác với thành viên'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Nhận xét (không bắt buộc)'), {
      target: { value: 'Hợp tác tốt' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));

    await waitFor(() => {
      expect(peerReviewApi.submitReview).toHaveBeenCalledWith(9, {
        revieweeId: 4,
        scores: [
          { criterion: 'QUALITY', score: 5 },
          { criterion: 'PUNCTUALITY', score: 4 },
          { criterion: 'COOPERATION', score: 3 },
        ],
        feedback: 'Hợp tác tốt',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Đã gửi đánh giá thành công');
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('shows the server validation message when submission fails', async () => {
    vi.mocked(peerReviewApi.submitReview).mockRejectedValue({
      response: { data: { message: 'Đợt chấm đã đóng' } },
    });
    render(
      <ReviewForm
        roundId={9}
        revieweeId={4}
        revieweeName="Thành viên B"
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText('Chất lượng công việc'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Tiến độ và đúng hạn'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Hợp tác với thành viên'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Đợt chấm đã đóng');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
