import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EvidenceTable } from '../features/dashboard/EvidenceTable';
import { EvidenceItemDto } from '../types/contribution';

describe('EvidenceTable Component - Card 7 (M3 - Sprint 4)', () => {
  const sampleItems: EvidenceItemDto[] = [
    {
      sourceType: 'BOARD',
      sourceId: 101,
      taskName: 'Xây dựng REST API /api/boards và /api/cards',
      storyPoints: 5,
      earnedScore: 12.5,
      eventTime: '2026-11-04T10:00:00Z',
      status: 'DONE',
    },
    {
      sourceType: 'MANUAL',
      sourceId: 501,
      taskName: 'Họp điều phối kỹ thuật với Giảng viên hướng dẫn',
      storyPoints: 2,
      earnedScore: 5.0,
      eventTime: '2026-11-05T16:00:00Z',
      status: 'APPROVED',
    },
  ];

  it('renders all table headers correctly', () => {
    render(<EvidenceTable items={sampleItems} />);

    expect(screen.getByText('Nguồn')).toBeInTheDocument();
    expect(screen.getByText('Tên công việc')).toBeInTheDocument();
    expect(screen.getByText('Story Points')).toBeInTheDocument();
    expect(screen.getByText('Điểm thực nhận')).toBeInTheDocument();
    expect(screen.getByText('Thời gian ghi nhận')).toBeInTheDocument();
    expect(screen.getByText('Trạng thái')).toBeInTheDocument();
  });

  it('renders correct task details, scores, and story points', () => {
    render(<EvidenceTable items={sampleItems} />);

    // Kiểm tra task name
    expect(screen.getByText('Xây dựng REST API /api/boards và /api/cards')).toBeInTheDocument();
    expect(screen.getByText('Họp điều phối kỹ thuật với Giảng viên hướng dẫn')).toBeInTheDocument();

    // Kiểm tra Story Points
    expect(screen.getByText('5 SP')).toBeInTheDocument();
    expect(screen.getByText('2 SP')).toBeInTheDocument();

    // Kiểm tra Earned Score
    expect(screen.getByText('+12.5')).toBeInTheDocument();
    expect(screen.getByText('+5.0')).toBeInTheDocument();
  });

  it('renders color-coded badges for BOARD (blue) and MANUAL (purple)', () => {
    render(<EvidenceTable items={sampleItems} />);

    // Badge BOARD
    const boardBadge = screen.getByTestId('badge-source-board');
    expect(boardBadge).toBeInTheDocument();
    expect(boardBadge).toHaveTextContent('Task Board nội bộ');

    // Badge MANUAL
    const manualBadge = screen.getByTestId('badge-source-manual');
    expect(manualBadge).toBeInTheDocument();
    expect(manualBadge).toHaveTextContent('Khai báo thủ công');
  });

  it('renders status badges correctly', () => {
    render(<EvidenceTable items={sampleItems} />);

    expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
    expect(screen.getByText('Đã phê duyệt')).toBeInTheDocument();
  });

  it('renders empty fallback when items array is empty', () => {
    render(<EvidenceTable items={[]} />);

    expect(screen.getByText('Không có dữ liệu bằng chứng')).toBeInTheDocument();
  });
});