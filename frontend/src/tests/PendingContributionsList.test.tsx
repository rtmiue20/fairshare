import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PendingContributionsList } from '../features/dashboard/PendingContributionsList';
import { contributionApi } from '../api/contribution.api';
import { ManualContributionItem } from '../types/contribution';

vi.mock('../api/contribution.api', () => ({
  contributionApi: {
    getPendingManualContributions: vi.fn(),
    reviewManualContribution: vi.fn(),
  },
}));

describe('PendingContributionsList Component - Card 9 (Anti-Fraud Gate & Review)', () => {
  const samplePendingList: ManualContributionItem[] = [
    {
      id: 101,
      teamId: 1,
      sprintId: 4,
      userId: 4, // Trọng Phúc
      taskName: 'Nghiên cứu tài liệu Figma UI kit và thiết kế bảng tra cứu bằng chứng',
      evidenceLink: 'https://figma.com/file/fairshare-evidence-traceability-ui',
      storyPoints: 3.0,
      status: 'PENDING',
      createdAt: '2026-11-09T06:00:00Z',
    },
    {
      id: 102,
      teamId: 1,
      sprintId: 4,
      userId: 2, // Ngọc Thiện
      taskName: 'Biên soạn tài liệu đặc tả phi chức năng (NFR) và quy trình chấm chéo',
      evidenceLink: 'https://docs.google.com/document/d/fairshare-srs-v2-nfr',
      storyPoints: 2.5,
      status: 'PENDING',
      createdAt: '2026-11-09T03:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending contributions list correctly', async () => {
    vi.mocked(contributionApi.getPendingManualContributions).mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: samplePendingList,
    });

    render(
      <PendingContributionsList
        teamId={1}
        sprintId={4}
        currentUserId={4}
      />
    );

    // Kiểm tra header và các row
    expect(await screen.findByText(/Danh sách đóng góp đang chờ duyệt/i)).toBeInTheDocument();
    expect(screen.getByText('Nghiên cứu tài liệu Figma UI kit và thiết kế bảng tra cứu bằng chứng')).toBeInTheDocument();
    expect(screen.getByText('Biên soạn tài liệu đặc tả phi chức năng (NFR) và quy trình chấm chéo')).toBeInTheDocument();
  });

  it('enforces Anti-Fraud Rule: User cannot approve their own contribution (currentUserId === item.userId)', async () => {
    vi.mocked(contributionApi.getPendingManualContributions).mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: samplePendingList,
    });

    render(
      <PendingContributionsList
        teamId={1}
        sprintId={4}
        currentUserId={4} // User 4 là chủ sở hữu item 101
      />
    );

    // Với item 101 (chính chủ):
    const antiFraudBadge = await screen.findByTestId('anti-fraud-badge-101');
    expect(antiFraudBadge).toBeInTheDocument();
    expect(antiFraudBadge).toHaveTextContent('Bạn không thể tự duyệt bài của mình');
    expect(screen.queryByTestId('btn-approve-101')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-reject-101')).not.toBeInTheDocument();

    // Với item 102 (của User 2): Nút Duyệt và Từ chối phải hiển thị
    expect(screen.getByTestId('btn-approve-102')).toBeInTheDocument();
    expect(screen.getByTestId('btn-reject-102')).toBeInTheDocument();
  });

  it('allows other members to APPROVE contributions and calls review API', async () => {
    vi.mocked(contributionApi.getPendingManualContributions).mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: samplePendingList,
    });

    vi.mocked(contributionApi.reviewManualContribution).mockResolvedValueOnce({
      success: true,
      message: 'Approved',
      data: {
        ...samplePendingList[1],
        status: 'APPROVED',
        reviewerId: 4,
      },
    });

    const onReviewedMock = vi.fn();

    render(
      <PendingContributionsList
        teamId={1}
        sprintId={4}
        currentUserId={4}
        onReviewed={onReviewedMock}
      />
    );

    const approveBtn = await screen.findByTestId('btn-approve-102');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(contributionApi.reviewManualContribution).toHaveBeenCalledWith(102, 4, 'APPROVE');
    });

    expect(onReviewedMock).toHaveBeenCalledWith(samplePendingList[1], 'APPROVE');
    expect(await screen.findByText(/đã được DUYỆT thành công/i)).toBeInTheDocument();
  });

  it('allows other members to REJECT contributions and calls review API', async () => {
    vi.mocked(contributionApi.getPendingManualContributions).mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: samplePendingList,
    });

    vi.mocked(contributionApi.reviewManualContribution).mockResolvedValueOnce({
      success: true,
      message: 'Rejected',
      data: {
        ...samplePendingList[1],
        status: 'REJECTED',
        reviewerId: 4,
      },
    });

    const onReviewedMock = vi.fn();

    render(
      <PendingContributionsList
        teamId={1}
        sprintId={4}
        currentUserId={4}
        onReviewed={onReviewedMock}
      />
    );

    const rejectBtn = await screen.findByTestId('btn-reject-102');
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(contributionApi.reviewManualContribution).toHaveBeenCalledWith(102, 4, 'REJECT');
    });

    expect(onReviewedMock).toHaveBeenCalledWith(samplePendingList[1], 'REJECT');
    expect(await screen.findByText(/đã bị TỪ CHỐI/i)).toBeInTheDocument();
  });
});
