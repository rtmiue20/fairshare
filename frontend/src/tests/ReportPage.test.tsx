import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReportPage } from '../features/report/ReportPage';
import { reportApi } from '../api/report.api';
import { contributionApi } from '../api/contribution.api';
import { teamApi } from '../api/team.api';
import { peerReviewApi } from '../api/peerReview.api';
import { boardApi } from '../api/board.api';
import { useProjectStore } from '../store/projectStore';

vi.mock('../api/report.api', () => ({
  reportApi: {
    downloadPdfReport: vi.fn(),
    getReportMetadata: vi.fn(),
  },
}));

vi.mock('../api/contribution.api', () => ({
  contributionApi: {
    getContributionSummary: vi.fn(),
  },
}));

vi.mock('../api/team.api', () => ({
  teamApi: {
    getTeamById: vi.fn(),
  },
}));

vi.mock('../api/peerReview.api', () => ({
  peerReviewApi: {
    getSprints: vi.fn(),
    getRoundsByTeam: vi.fn(),
    getRoundResults: vi.fn(),
  },
}));

vi.mock('../api/board.api', () => ({
  boardApi: {
    getBoardsByTeam: vi.fn(),
  },
}));

vi.mock('../components/ui/Toast', () => ({
  showToast: vi.fn(),
}));

describe('ReportPage Component (Official Academic PDF & Synchronized Theme)', () => {
  const mockSprints = [
    {
      id: 1,
      teamId: 1,
      name: 'Sprint 1 - Thiết kế Hệ thống',
      startDate: '2026-10-15',
      endDate: '2026-10-28',
      status: 'CLOSED' as const,
    },
    {
      id: 2,
      teamId: 1,
      name: 'Sprint 2 - Phát triển Tính năng & Tích hợp API',
      startDate: '2026-10-29',
      endDate: '2026-11-12',
      status: 'ACTIVE' as const,
    },
  ];

  const mockContributions = [
    {
      userId: 109,
      userName: 'Nguyễn Hoàng Nam (Trưởng nhóm Demo)',
      trelloScore: 10,
      manualScore: 0,
      activityPct: 22.9,
      peerPct: 0,
      finalPct: 22.9,
      hasSufficientEvidence: true,
      evidenceStatus: 'SUFFICIENT',
    },
    {
      userId: 110,
      userName: 'Trần Thu Trang (Frontend & UI/UX)',
      trelloScore: 9.8,
      manualScore: 0,
      activityPct: 22.5,
      peerPct: 0,
      finalPct: 22.5,
      hasSufficientEvidence: true,
      evidenceStatus: 'SUFFICIENT',
    },
  ];

  const mockTeamData = {
    id: 1,
    name: 'EduConnect — Nền tảng Học tập',
    inviteCode: 'FS-EDU-2026',
    members: [
      { userId: 109, role: 'LEADER', user: { id: 109, fullName: 'Nguyễn Hoàng Nam (Trưởng nhóm Demo)', email: 'nam@fairshare.io' } },
      { userId: 110, role: 'MEMBER', user: { id: 110, fullName: 'Trần Thu Trang (Frontend & UI/UX)', email: 'trang@fairshare.io' } },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();

    useProjectStore.setState({
      initialized: true,
      teams: [{ id: 1, name: 'EduConnect', createdAt: '2026-10-15T08:00:00' }],
      activeTeamId: 1,
    });

    vi.mocked(peerReviewApi.getSprints).mockResolvedValue({
      success: true,
      message: 'OK',
      data: mockSprints,
    });

    vi.mocked(contributionApi.getContributionSummary).mockResolvedValue(mockContributions as unknown as typeof mockContributions);

    vi.mocked(teamApi.getTeamById).mockResolvedValue({
      success: true,
      message: 'OK',
      data: mockTeamData as unknown as typeof mockTeamData,
    } as unknown as Awaited<ReturnType<typeof teamApi.getTeamById>>);

    vi.mocked(boardApi.getBoardsByTeam).mockResolvedValue({
      success: true,
      message: 'OK',
      data: [],
    });

    vi.mocked(peerReviewApi.getRoundsByTeam).mockResolvedValue({
      success: true,
      message: 'OK',
      data: [{ id: 2, sprintId: 2, name: 'Round 2', teamId: 1, status: 'OPEN', minSubmissionsRequired: 3, startDate: '2026-11-03', endDate: '2026-11-17' }],
    });

    vi.mocked(peerReviewApi.getRoundResults).mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        revieweeId: 109,
        anonymousSafe: true,
        averageScore: 4.9,
        submissionCount: 3,
        feedbackComments: [],
      },
    });
  });

  it('renders report header, KPI cards, and academic paper document', async () => {
    render(
      <MemoryRouter>
        <ReportPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bản đóng góp nộp cho giảng viên')).toBeInTheDocument();
      expect(screen.getByText('BÁO CÁO NGHIỆM THU ĐÓNG GÓP & MINH BẠCH NĂNG SUẤT')).toBeInTheDocument();
      expect(screen.getByText('Giai đoạn báo cáo')).toBeInTheDocument();
      expect(screen.getByText('Độ phân bổ đóng góp (Gini)')).toBeInTheDocument();
    });

    // Check member rows
    expect(screen.getAllByText('Nguyễn Hoàng Nam (Trưởng nhóm Demo)').length).toBeGreaterThan(0);
    expect(screen.getByText('Trần Thu Trang (Frontend & UI/UX)')).toBeInTheDocument();
    expect(screen.getAllByText('Đạt chuẩn').length).toBeGreaterThan(0);
  });

  it('handles official PDF download via reportApi', async () => {
    const mockBlob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    vi.mocked(reportApi.downloadPdfReport).mockResolvedValueOnce(mockBlob);
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-pdf');
    window.URL.revokeObjectURL = vi.fn();

    render(
      <MemoryRouter>
        <ReportPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Xuất PDF chính thức')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Xuất PDF chính thức'));

    await waitFor(() => {
      expect(reportApi.downloadPdfReport).toHaveBeenCalledWith(1, 2);
    });
  });

  it('triggers browser print when clicking Xem trước / In', async () => {
    render(
      <MemoryRouter>
        <ReportPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Xem trước \/ In/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Xem trước \/ In/));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('updates selected sprint when choosing another sprint in dropdown', async () => {
    render(
      <MemoryRouter>
        <ReportPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Chọn Sprint xuất báo cáo')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Chọn Sprint xuất báo cáo');
    fireEvent.change(select, { target: { value: '1' } });

    await waitFor(() => {
      expect(contributionApi.getContributionSummary).toHaveBeenCalledWith(1, 1);
    });
  });
});
