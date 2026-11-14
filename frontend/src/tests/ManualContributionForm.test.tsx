import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManualContributionForm } from '../features/dashboard/ManualContributionForm';
import { contributionApi } from '../api/contribution.api';

vi.mock('../api/contribution.api', () => ({
  contributionApi: {
    submitManualContribution: vi.fn(),
  },
}));

vi.mock('../api/board.api', () => ({
  boardApi: {
    getBoardsByTeam: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          teamId: 1,
          name: 'Sprint Board',
          columns: [
            {
              id: 10,
              boardId: 1,
              name: 'In Progress',
              position: 1,
              cards: [
                {
                  id: 1,
                  boardId: 1,
                  columnId: 10,
                  title: 'Update UI',
                  storyPoints: 3,
                  position: 1,
                },
              ],
            },
          ],
        },
      ],
    }),
    uploadFile: vi.fn(),
  },
}));

describe('ManualContributionForm Component - Step Wizard (Card 9 - M3)', () => {
  const defaultProps = {
    teamId: 1,
    sprintId: 4,
    userId: 4,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required form inputs and step elements', () => {
    render(<ManualContributionForm {...defaultProps} />);

    expect(screen.getByTestId('manual-contribution-form-container')).toBeInTheDocument();
    expect(screen.getByTestId('input-task-name')).toBeInTheDocument();
    expect(screen.getByTestId('input-evidence-link')).toBeInTheDocument();
    expect(screen.getByTestId('input-story-points')).toBeInTheDocument();
    expect(screen.getByTestId('btn-submit-manual-contribution')).toBeInTheDocument();
    expect(screen.getByText(/Sprint 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Bước 1\/3/i)).toBeInTheDocument();
  });

  it('validates empty card code on step 1 when attempting to proceed', async () => {
    render(<ManualContributionForm {...defaultProps} />);

    // Clear task name
    const taskInput = screen.getByTestId('input-task-name');
    fireEvent.change(taskInput, { target: { value: '' } });

    const submitBtn = screen.getByTestId('btn-submit-manual-contribution');
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Vui lòng chọn hoặc nhập mã thẻ đóng góp.')
    ).toBeInTheDocument();
    expect(contributionApi.submitManualContribution).not.toHaveBeenCalled();
  });

  it('validates missing evidence link on step 2', async () => {
    render(<ManualContributionForm {...defaultProps} />);

    const taskInput = screen.getByTestId('input-task-name');
    fireEvent.change(taskInput, { target: { value: 'Card #1: Update UI' } });

    // Click Tiếp tục -> Go to Step 2
    const nextBtn = screen.getByTestId('btn-submit-manual-contribution');
    fireEvent.click(nextBtn);

    expect(await screen.findByText(/Bước 2\/3/i)).toBeInTheDocument();

    // On Step 2 with empty evidence link, click Tiếp tục -> validation error
    const nextBtnStep2 = screen.getByTestId('btn-submit-manual-contribution');
    fireEvent.click(nextBtnStep2);

    expect(
      await screen.findByText('Vui lòng cung cấp link minh chứng (Docs, Figma, v.v.).')
    ).toBeInTheDocument();
    expect(contributionApi.submitManualContribution).not.toHaveBeenCalled();
  });

  it('successfully transitions through all 3 steps and submits manual contribution', async () => {
    const mockCreated = {
      id: 99,
      teamId: 1,
      sprintId: 4,
      userId: 4,
      taskName: 'Card #1: Update UI',
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

    // ── STEP 1: Mã thẻ ──
    const taskInput = screen.getByTestId('input-task-name');
    fireEvent.change(taskInput, {
      target: { value: 'Card #1: Update UI' },
    });
    fireEvent.click(screen.getByTestId('btn-submit-manual-contribution'));

    // ── STEP 2: Minh chứng ──
    expect(await screen.findByText(/Bước 2\/3/i)).toBeInTheDocument();
    const linkInput = screen.getByTestId('input-evidence-link');
    fireEvent.change(linkInput, {
      target: { value: 'https://figma.com/design-dark-mode' },
    });
    fireEvent.click(screen.getByTestId('btn-submit-manual-contribution'));

    // ── STEP 3: Điểm tự chấm ──
    expect(await screen.findByText(/Bước 3\/3/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Điểm tự chấm/i).length).toBeGreaterThan(0);
    const spInput = screen.getByTestId('input-story-points');
    fireEvent.change(spInput, {
      target: { value: '5.0' },
    });

    // Submit form on Step 3
    fireEvent.click(screen.getByTestId('btn-submit-manual-contribution'));

    await waitFor(() => {
      expect(contributionApi.submitManualContribution).toHaveBeenCalledWith(
        1,
        4,
        4,
        {
          taskName: 'Card #1: Update UI',
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
