import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

  it('opens 3-step send alert modal, selects template, enters description, and submits alert', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 99,
          teamId: 1,
          userId: 111,
          userName: 'Lê Quốc Bảo (Backend & Database)',
          alertType: 'CUSTOM_ERROR',
          severity: 'CRITICAL',
          message: '[Cảnh báo khẩn: Công việc đã quá hạn] Cần cập nhật task Redis ngay hôm nay | Người báo: Nhóm trưởng (Minh Triều)',
          resolved: false,
        },
      },
    });

    render(
      <MemoryRouter>
        <AlertList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Gửi cảnh báo' })).toBeInTheDocument();
    });

    // Step 1: Open modal and select Error template
    fireEvent.click(screen.getByRole('button', { name: 'Gửi cảnh báo' }));
    const dialog = screen.getByRole('dialog', { name: 'Gửi cảnh báo theo mẫu' });
    expect(within(dialog).getByText('Chọn mẫu cảnh báo gửi đi')).toBeInTheDocument();
    expect(within(dialog).getByText('Bước 1/3')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Quá hạn · Cần xử lý gấp/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Tiếp tục/i }));

    // Step 2: Select member and enter description
    expect(within(dialog).getByText('Bước 2/3')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Lê Quốc Bảo/i }));

    const textarea = within(dialog).getByPlaceholderText(/Nhập nội dung nhắc nhở/i);
    fireEvent.change(textarea, { target: { value: 'Cần cập nhật task Redis ngay hôm nay' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Tiếp tục/i }));

    // Step 3: Preview and confirm submit
    expect(within(dialog).getByText('Bước 3/3')).toBeInTheDocument();
    expect(within(dialog).getByText('Xem trước hộp cảnh báo sẽ hiển thị')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Xác nhận gửi/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/alerts/team/1',
        expect.objectContaining({
          userId: 111,
          templateType: 'ERROR',
          alertType: 'CUSTOM_ERROR',
          message: 'Cần cập nhật task Redis ngay hôm nay',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cần cập nhật task Redis ngay hôm nay')).toBeInTheDocument();
    });
  });

  it('auto-detects due soon and todo tasks from Kanban board and displays auto-alert banner', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/inactivity')) {
        return Promise.resolve({ data: { success: true, data: mockInactivity } });
      }
      if (url.includes('/boards/team/')) {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: 1,
                teamId: 1,
                name: 'Board 1',
                columns: [
                  {
                    id: 1,
                    boardId: 1,
                    name: 'In Progress',
                    position: 1,
                    cards: [
                      {
                        id: 501,
                        boardId: 1,
                        columnId: 1,
                        title: 'Hoàn thiện API Gateway',
                        assigneeId: 111,
                        assigneeName: 'Lê Quốc Bảo (Backend & Database)',
                        dueDate: tomorrow,
                        position: 0,
                      },
                    ],
                  },
                  {
                    id: 2,
                    boardId: 1,
                    name: 'To Do',
                    position: 0,
                    cards: [
                      {
                        id: 502,
                        boardId: 1,
                        columnId: 2,
                        title: 'Viết tài liệu hướng dẫn',
                        assigneeId: 110,
                        assigneeName: 'Trần Thu Trang (Frontend & UI/UX)',
                        dueDate: nextWeek,
                        position: 0,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(
      <MemoryRouter>
        <AlertList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Công việc sắp đến hạn chót (nguy cơ trễ)')).toBeInTheDocument();
      expect(screen.getByText('Công việc cần bắt đầu thực hiện')).toBeInTheDocument();
      expect(screen.getByText('Auto-Alert Active')).toBeInTheDocument();
    });
  });

  it('does not fetch sample alerts or show sticky data for newly created account without project', async () => {
    useProjectStore.setState({
      initialized: true,
      teams: [],
      activeTeamId: null,
    });

    render(
      <MemoryRouter>
        <AlertList />
      </MemoryRouter>
    );

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(screen.queryByText(/Cấu hình Redis Cache/i)).not.toBeInTheDocument();
  });

  it('renders clean empty state with real data when a new project has no tasks or alerts', async () => {
    useProjectStore.setState({
      initialized: true,
      teams: [{ id: 10, name: 'NewProject', createdAt: '2026-11-20T10:00:00' }],
      activeTeamId: 10,
    });

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/inactivity')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                userId: 500,
                userName: 'Tài Khoản Mới',
                daysInactive: 0,
                lastActivity: '2026-11-20T10:00:00',
                exceeded: false,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(
      <MemoryRouter>
        <AlertList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Không có cảnh báo tồn đọng')).toBeInTheDocument();
      expect(screen.getByText('Tài Khoản Mới')).toBeInTheDocument();
      expect(screen.getByText(/0 ngày \(Ổn\)/i)).toBeInTheDocument();
    });
  });
});
