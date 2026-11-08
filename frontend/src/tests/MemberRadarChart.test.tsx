import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemberRadarChart } from '../features/dashboard/MemberRadarChart';
import { ContributionSummaryItem } from '../types/contribution';

// Mock ResponsiveContainer của Recharts để render ổn định trong môi trường jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mock-responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe('MemberRadarChart Component - Card 5 (M3 - Sprint 4)', () => {
  const validMember: ContributionSummaryItem = {
    userId: 1,
    userName: 'Nguyễn Văn Minh Triều',
    finalPct: 18.5,
    d1Output: 1.25,
    d2Reliability: 1.1,
    d3Collaboration: 0.95,
    d4Peer: 1.05,
    compositeScore: 1.15,
    confidenceIntervalLow: 16.2,
    confidenceIntervalHigh: 20.8,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: false,
    suspicionFlag: false,
  };

  const suspiciousMember: ContributionSummaryItem = {
    userId: 5,
    userName: 'Huỳnh Khang',
    finalPct: 15.8,
    d1Output: 2.1,
    d2Reliability: -0.8,
    d3Collaboration: -0.6,
    d4Peer: -1.2,
    compositeScore: 0.65,
    hasSufficientEvidence: true,
    isEnoughEvidence: true,
    isSuspicious: true,
    suspicionFlag: true,
  };

  const insufficientEvidenceMember: ContributionSummaryItem = {
    userId: 6,
    userName: 'Nam Anh',
    finalPct: 15.2,
    d1Output: -0.5,
    d2Reliability: 0.1,
    d3Collaboration: 0.2,
    d4Peer: 0.0,
    compositeScore: 0.1,
    hasSufficientEvidence: false,
    isEnoughEvidence: false,
    isSuspicious: false,
    suspicionFlag: false,
  };

  it('renders Radar Chart correctly with 4 dimensions for a valid member', () => {
    render(<MemberRadarChart member={validMember} />);

    // Tên thành viên và tỷ lệ đóng góp
    expect(screen.getByText('Nguyễn Văn Minh Triều')).toBeInTheDocument();
    expect(screen.getByText('18.5%')).toBeInTheDocument();

    // Huy hiệu dữ liệu hợp lệ
    expect(screen.getByText('Dữ liệu hợp lệ')).toBeInTheDocument();

    // 4 chiều năng lực hiển thị ở các cards chi tiết
    expect(screen.getByText('D1: Sản lượng')).toBeInTheDocument();
    expect(screen.getByText('D2: Tin cậy')).toBeInTheDocument();
    expect(screen.getByText('D3: Phối hợp')).toBeInTheDocument();
    expect(screen.getByText('D4: Chấm chéo')).toBeInTheDocument();

    // Giá trị Z-scores
    expect(screen.getByText('1.25')).toBeInTheDocument();
    expect(screen.getByText('1.10')).toBeInTheDocument();
    expect(screen.getByText('0.95')).toBeInTheDocument();
    expect(screen.getByText('1.05')).toBeInTheDocument();

    // Khoảng tin cậy 95% Bootstrap
    expect(screen.getByText(/95% CI: \[16.2% - 20.8%\]/)).toBeInTheDocument();
  });

  it('renders fallback UI "Chưa đủ bằng chứng" when isEnoughEvidence is false', () => {
    render(<MemberRadarChart member={insufficientEvidenceMember} />);

    // Kiểm tra UI Fallback
    const fallbackBox = screen.getByTestId('insufficient-evidence-box');
    expect(fallbackBox).toBeInTheDocument();
    expect(screen.getByText('Chưa đủ bằng chứng')).toBeInTheDocument();
    expect(screen.getByText(/Nam Anh/)).toBeInTheDocument();
    expect(screen.getByText(/Số lượng sự kiện < 5/)).toBeInTheDocument();

    // Đảm bảo không render radar container
    expect(screen.queryByTestId('radar-chart-container')).not.toBeInTheDocument();
  });

  it('renders suspicion badge "⚠️ Cần rà soát thủ công" when suspicionFlag is true', () => {
    render(<MemberRadarChart member={suspiciousMember} />);

    // Kiểm tra Huy hiệu cảnh báo ngờ vực
    const badge = screen.getByTestId('suspicion-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('⚠️ Cần rà soát thủ công');

    // Kiểm tra đoạn text giải thích cảnh báo
    expect(screen.getByText(/Lưu ý kiểm tra:/)).toBeInTheDocument();
    expect(screen.queryByText('Dữ liệu hợp lệ')).not.toBeInTheDocument();
  });

  it('renders empty prompt when member is null', () => {
    render(<MemberRadarChart member={null} />);

    expect(
      screen.getByText('Chọn một thành viên trong danh sách để xem biểu đồ năng lực 4 chiều.'),
    ).toBeInTheDocument();
  });
});
