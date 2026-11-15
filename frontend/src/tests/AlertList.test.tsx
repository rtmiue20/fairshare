import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertList } from '../features/alerts/AlertList';
import apiClient from '../api/client';
import { useProjectStore } from '../store/projectStore';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../components/ui/Toast', () => ({
  showToast: vi.fn(),
}));

describe('AlertList Component (CR-04 Rule-Based Alerts & Inactivity)', () => {
  const mockAlerts = [
    {
      id: 1,
      teamId: 1,
      userId: 112,
      userName: 'Phạm Minh Đức (DevOps & Cloud)',
      alertType: 'OVERDUE_TASK',
      severity: 'CRITICAL',
      message: 'Công việc "Cấu hình Redis Cache" đã quá hạn 2 ngày.',
      resolved: false,
      createdAt: '2026-11-15T20:00:00',
    },
    {
      id: 2,
      teamId: 1,
      userId: 111,
      userName: 'Lê Quốc Bảo (Backend & Database)',
      alertType: 'INACTIVITY_WARNING',
      severity: 'WARNING',
      message: 'Thành viên Lê Quốc Bảo không có hoạt động trong 6 ngày liên tiếp.',
      resolved: false,
      createdAt: '2026-11-15T19:00:00',
    },
    {
      id: 3,
      teamId: 1,
      userId: 109,
      userName: 'Nguyễn Hoàng Nam (Trưởng nhóm Demo)',
      alertType: 'PEER_REVIEW_SUFFICIENT',
      severity: 'INFO',
      message: 'Đủ lượt chấm chéo (≥ 3). D4 sẽ được tính trong pipeline tiếp theo.',
      resolved: false,
      createdAt: '2026-11-15T18:00:00',
    },
  ];

  const mockInactivity = [
    {
      userId: 111,
      userName: 'Lê Quốc Bảo (Backend & Database)',
      daysInactive: 6,
      lastActivity: '2026-11-09T09:30:00',
      exceeded: true,
    },
    {
      userId: 110,
      userName: 'Trần Thu Trang (Frontend & UI/UX)',
      daysInactive: 5,
      lastActivity: '2026-11-10T11:00:00',
      exceeded: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({
      initialized: true,
      teams: [{ id: 1, name: 'EduConnect', createdAt: '2026-10-15T08:00:00' }],
      activeTeamId: 1,
    });

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/inactivity')) {
        return Promise.resolve({ data: { success: true, data: mockInactivity } });
      }
      return Promise.resolve({ data: { success: true, data: mockAlerts } });
    });
  });

  it('renders alerts without duplicated title and description', async () => {
    render(
      <MemoryRouter>
        <AlertList />
      </MemoryRouter>
    );

    // Title should be formatted based on alertType
    await waitFor(() => {
      expect(screen.getByText('Công việc In Progress đã quá hạn chót')).toBeInTheDocument();
      expect(screen.getByText('Cảnh báo thành viên im lặng quá lâu (CR-04)')).toBeInTheDocument();
      expect(screen.getByText('Đủ điều kiện giải mã điểm chéo 360° (Nghị định 13)')).toBeInTheDocument();
    });

    // Description is the separate detailed message
    expect(screen.getByText('Công việc "Cấu hình Redis Cache" đã quá hạn 2 ngày.')).toBeInTheDocument();
    expect(screen.getByText('Thành viên Lê Quốc Bảo không có hoạt động trong 6 ngày liên tiếp.')).toBeInTheDocument();
  });

  it('renders inactivity threshold slider and updates dynamic feedback', async () => {
    render(
      <MemoryRouter>
        <AlertList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/5 ngày/).length).toBeGreaterThan(0);
      expect(screen.getByText(/1 thành viên/i)).toBeInTheDocument();
    });

    // Find slider
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('5');

    // Drag slider to 7 days
    fireEvent.change(slider, { target: { value: '7' } });
    expect(slider).toHaveValue('7');
  });

  it('filters alerts when clicking filter tabs', async () => {
    render(
      <MemoryRouter>
        <AlertList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tất cả (3)')).toBeInTheDocument();
    });

    // Click Red (critical) filter
    fireEvent.click(screen.getByText(/Đỏ \(1\)/i));

    // Overdue task should be visible, others hidden
    expect(screen.getByText('Công việc In Progress đã quá hạn chót')).toBeInTheDocument();
    expect(screen.queryByText('Đủ điều kiện giải mã điểm chéo 360° (Nghị định 13)')).not.toBeInTheDocument();
  });

  it('calls resolve endpoint when clicking Đánh dấu đã giải quyết', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter>
        <AlertList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Đánh dấu đã giải quyết').length).toBeGreaterThan(0);
    });

    const resolveButtons = screen.getAllByText('Đánh dấu đã giải quyết');
    fireEvent.click(resolveButtons[0]);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/alerts/1/resolve');
    });
  });

  it('calls remind endpoint when clicking Nhắc nhở', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, data: 'Đã gửi nhắc nhở thành công' },
    });

    render(
      <MemoryRouter>
        <AlertList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Nhắc nhở').length).toBeGreaterThan(0);
    });

    const remindButtons = screen.getAllByText('Nhắc nhở');
    fireEvent.click(remindButtons[0]);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/alerts/1/remind');
    });
  });
});
