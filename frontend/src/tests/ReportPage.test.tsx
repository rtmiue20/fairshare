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
    getOverviewReport: vi.fn(),
    getIndividualReport: vi.fn(),
    sendIndividualEmail: vi.fn(),
    sendAllEmails: vi.fn(),
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

vi.mock('../utils/pdfExport', () => ({
  exportElementToPdf: vi.fn().mockResolvedValue(undefined),
  exportOverviewReportPdf: vi.fn().mockResolvedValue(undefined),
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
    expect(screen.getAllByText('Trần Thu Trang (Frontend & UI/UX)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đạt chuẩn').length).toBeGreaterThan(0);
  });

  it('opens electronic signature modal and exports PDF when clicking Xuất PDF chính thức', async () => {
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
      expect(screen.getByText('Ký điện tử báo cáo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Áp chữ ký & Xuất PDF/));

    await waitFor(() => {
      expect(screen.queryByText('Ký điện tử báo cáo')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(window.print).toHaveBeenCalledTimes(1);
    }, { timeout: 1500 });
    expect(reportApi.downloadPdfReport).not.toHaveBeenCalled();
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

  it('switches to individual tab and displays 4D radar metrics', async () => {
    vi.mocked(reportApi.getIndividualReport).mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        userId: 109,
        userName: 'Nguyễn Hoàng Nam (Trưởng nhóm Demo)',
        email: 'nam@fairshare.io',
        role: 'LEADER',
        teamId: 1,
        teamName: 'EduConnect',
        sprintId: 2,
        sprintName: 'Sprint 2',
        startDate: '2026-10-29',
        endDate: '2026-11-12',
        finalPct: 22.9,
        d1Output: 0.92,
        d2Reliability: 0.88,
        d3Collaboration: 0.85,
        d4Peer: 0.90,
        compositeScore: 22.9,
        availabilityFactor: 1.0,
        confidenceIntervalLow: 20.4,
        confidenceIntervalHigh: 25.4,
        isSuspicious: false,
        hasSufficientEvidence: true,
        evidenceList: [
          { taskName: 'Thiết kế kiến trúc hệ thống', storyPoints: 5, earnedScore: 5, eventTime: '2026-11-05T10:00:00', status: 'Hoàn thành' }
        ],
      },
    });

    render(
      <MemoryRouter>
        <ReportPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Báo cáo cá nhân & Email/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Báo cáo cá nhân & Email/));

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ Vector 4 Chiều (Radar Profile)')).toBeInTheDocument();
      expect(screen.getAllByText(/D1 Output/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/D2 Reliability/).length).toBeGreaterThan(0);
    });
  });

  it('handles sending personal email report via reportApi', async () => {
    vi.mocked(reportApi.sendIndividualEmail).mockResolvedValue({
      success: true,
      message: 'OK',
      data: 'Sent successfully',
    });

    render(
      <MemoryRouter>
        <ReportPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Báo cáo cá nhân & Email/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Báo cáo cá nhân & Email/));

    await waitFor(() => {
      expect(screen.getByText(/Gửi báo cáo qua email/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Gửi báo cáo qua email/));

    await waitFor(() => {
      expect(reportApi.sendIndividualEmail).toHaveBeenCalledWith(1, 2, 109);
    });
  });
});
