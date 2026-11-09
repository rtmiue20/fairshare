import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManualContributionForm } from '../features/dashboard/ManualContributionForm';
import { contributionApi } from '../api/contribution.api';

vi.mock('../api/contribution.api', () => ({
  contributionApi: {
    submitManualContribution: vi.fn(),
  },
}));

describe('ManualContributionForm Component - Card 9 (M3 - Sprint 4)', () => {
  const defaultProps = {
    teamId: 1,
    sprintId: 4,
    userId: 4,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required form inputs and elements', () => {
    render(<ManualContributionForm {...defaultProps} />);

    expect(screen.getByTestId('manual-contribution-form-container')).toBeInTheDocument();
    expect(screen.getByTestId('input-task-name')).toBeInTheDocument();
    expect(screen.getByTestId('input-evidence-link')).toBeInTheDocument();
    expect(screen.getByTestId('input-story-points')).toBeInTheDocument();
    expect(screen.getByTestId('btn-submit-manual-contribution')).toBeInTheDocument();
    expect(screen.getByText(/Sprint 4/i)).toBeInTheDocument();
  });

  it('validates empty inputs and displays error message', async () => {
    render(<ManualContributionForm {...defaultProps} />);

    const submitBtn = screen.getByTestId('btn-submit-manual-contribution');
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Vui lòng nhập tên công việc đóng góp.')
    ).toBeInTheDocument();
    expect(contributionApi.submitManualContribution).not.toHaveBeenCalled();
  });

  it('validates missing evidence link', async () => {
    render(<ManualContributionForm {...defaultProps} />);

    const taskInput = screen.getByTestId('input-task-name');
    fireEvent.change(taskInput, { target: { value: 'Nghiên cứu tài liệu SRS' } });

    const submitBtn = screen.getByTestId('btn-submit-manual-contribution');
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Vui lòng cung cấp link minh chứng (Docs, Figma, v.v.).')
    ).toBeInTheDocument();
    expect(contributionApi.submitManualContribution).not.toHaveBeenCalled();
  });

  it('successfully submits valid manual contribution form', async () => {
    const mockCreated = {
      id: 99,
      teamId: 1,
      sprintId: 4,
      userId: 4,
      taskName: 'Thiết kế giao diện Dark Mode Figma',
      evidenceLink: 'https://figma.com/design-dark-mode',
      storyPoints: 5.0,
      status: 'PENDING' as const,
      createdAt: '2026-11-09T08:00:00Z',
    };

    vi.mocked(contributionApi.submitManualContribution).mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: mockCreated,
    });

    render(<ManualContributionForm {...defaultProps} />);

    fireEvent.change(screen.getByTestId('input-task-name'), {
      target: { value: 'Thiết kế giao diện Dark Mode Figma' },
    });
    fireEvent.change(screen.getByTestId('input-evidence-link'), {
      target: { value: 'https://figma.com/design-dark-mode' },
    });
    fireEvent.change(screen.getByTestId('input-story-points'), {
      target: { value: '5.0' },
    });

    fireEvent.click(screen.getByTestId('btn-submit-manual-contribution'));

    await waitFor(() => {
      expect(contributionApi.submitManualContribution).toHaveBeenCalledWith(
        1,
        4,
        4,
        {
          taskName: 'Thiết kế giao diện Dark Mode Figma',
          evidenceLink: 'https://figma.com/design-dark-mode',
          storyPoints: 5.0,
        }
      );
    });

    expect(
      await screen.findByText(/Đã gửi khai báo đóng góp thành công!/i)
    ).toBeInTheDocument();
    expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockCreated);
  });
});
