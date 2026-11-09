import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EvidenceTraceabilityModal } from '../features/dashboard/EvidenceTraceabilityModal';
import { EvidenceItemDto } from '../types/contribution';

describe('EvidenceTraceabilityModal Component - Card 7 (M3 - Sprint 4)', () => {
  const sampleData: EvidenceItemDto[] = [
    {
      sourceType: 'BOARD',
      sourceId: 401,
      taskName: 'Xây dựng Radar Chart 4 chiều hiển thị chỉ số D1-D4',
      storyPoints: 8,
      earnedScore: 20.0,
      eventTime: '2026-11-03T17:30:00Z',
      status: 'DONE',
    },
    {
      sourceType: 'BOARD',
      sourceId: 402,
      taskName: 'Tích hợp bộ lọc Sprint & Thành viên linh hoạt',
      storyPoints: 5,
      earnedScore: 12.5,
      eventTime: '2026-11-04T13:45:00Z',
      status: 'DONE',
    },
  ];

  it('does not render modal when isOpen is false', () => {
    const handleClose = vi.fn();
    render(
      <EvidenceTraceabilityModal
        isOpen={false}
        onClose={handleClose}
        loading={false}
        evidenceData={sampleData}
        selectedUserName="Trọng Phúc (FE)"
      />,
    );

    expect(screen.queryByTestId('evidence-traceability-modal')).not.toBeInTheDocument();
  });

  it('renders modal header, user info, and statistics when open with data', () => {
    const handleClose = vi.fn();
    render(
      <EvidenceTraceabilityModal
        isOpen={true}
        onClose={handleClose}
        loading={false}
        evidenceData={sampleData}
        selectedUserName="Trọng Phúc (FE)"
        selectedUserId={4}
        sprintId={4}
        finalPct={16.2}
      />,
    );

    // Tiêu đề & thông tin thành viên
    expect(screen.getByText('Bằng chứng truy vết đóng góp (Audit Trail)')).toBeInTheDocument();
    expect(screen.getByText('Trọng Phúc (FE)')).toBeInTheDocument();
    expect(screen.getByText('(ID: #4)')).toBeInTheDocument();
    expect(screen.getByText('Sprint 4')).toBeInTheDocument();
    expect(screen.getByText('16.2%')).toBeInTheDocument();

    // Thống kê nhanh: 2 sự kiện, 13 SP, 32.5 điểm
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('13 SP')).toBeInTheDocument();
    expect(screen.getByText('+32.5')).toBeInTheDocument();

    // Bảng EvidenceTable được render
    expect(screen.getByTestId('evidence-table')).toBeInTheDocument();
    expect(screen.getByText('Xây dựng Radar Chart 4 chiều hiển thị chỉ số D1-D4')).toBeInTheDocument();
  });

  it('renders loading indicator when loading is true', () => {
    const handleClose = vi.fn();
    render(
      <EvidenceTraceabilityModal
        isOpen={true}
        onClose={handleClose}
        loading={true}
        evidenceData={[]}
        selectedUserName="Trọng Phúc (FE)"
      />,
    );

    expect(screen.getByTestId('modal-loading')).toBeInTheDocument();
    expect(screen.getByText('Đang truy xuất bằng chứng gốc...')).toBeInTheDocument();
  });

  it('renders empty state when evidenceData is empty and not loading', () => {
    const handleClose = vi.fn();
    render(
      <EvidenceTraceabilityModal
        isOpen={true}
        onClose={handleClose}
        loading={false}
        evidenceData={[]}
        selectedUserName="Nam Anh (QA)"
      />,
    );

    expect(screen.getByTestId('modal-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Không có sự kiện gốc nào được ghi nhận')).toBeInTheDocument();
  });

  it('calls onClose when close button or Esc key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <EvidenceTraceabilityModal
        isOpen={true}
        onClose={handleClose}
        loading={false}
        evidenceData={sampleData}
        selectedUserName="Trọng Phúc (FE)"
      />,
    );

    const closeButton = screen.getByTestId('modal-close-button');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Bấm phím Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});