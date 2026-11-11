import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileSettingsPage } from '../features/profile/ProfileSettingsPage';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import apiClient from '../api/client';
import { teamApi } from '../api/team.api';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../api/team.api', () => ({
  teamApi: {
    getTeams: vi.fn(),
    updateTeam: vi.fn(),
  },
}));

describe('ProfileSettingsPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAuthStore.setState({
      user: {
        id: 99,
        email: 'newuser@example.com',
        fullName: 'Nguyen User Mới',
      },
      token: 'mock-token',
      isAuthenticated: true,
    });

    useProjectStore.setState({
      teams: [],
      activeTeamId: null,
      loading: false,
      initialized: true,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        id: 99,
        email: 'newuser@example.com',
        fullName: 'Nguyen User Mới',
      },
    });

    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        id: 99,
        email: 'newuser@example.com',
        fullName: 'Nguyen User Mới Đã Sửa',
      },
    });

    vi.mocked(teamApi.getTeams).mockResolvedValue({
      data: [],
      message: 'OK',
      success: true,
    });
  });

  it('renders page without hardcoded UEH text and initializes blank fields for new user', async () => {
    render(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>
    );

    // Title should be neutral, not "Thiết lập dự án & Định danh UEH"
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thiết lập dự án & Thông tin cá nhân');
    expect(screen.queryByText(/Định danh UEH/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/UEH SSO/i)).not.toBeInTheDocument();

    // Verify phone, major, teamRole, bio are blank (not pre-filled with fake UEH values)
    const phoneInput = screen.getByPlaceholderText(/0901 234 567/i) as HTMLInputElement;
    expect(phoneInput.value).toBe('');

    const majorInput = screen.getByPlaceholderText(/Công nghệ Thông tin/i) as HTMLInputElement;
    expect(majorInput.value).toBe('');

    // Student ID should start empty since email has no digits
    const mssvInput = screen.getByPlaceholderText(/mã số sinh viên hoặc mã định danh/i) as HTMLInputElement;
    expect(mssvInput.value).toBe('');
  });

  it('allows user to enter custom MSSV and save profile updates', async () => {
    render(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>
    );

    const mssvInput = screen.getByPlaceholderText(/mã số sinh viên hoặc mã định danh/i);
    fireEvent.change(mssvInput, { target: { value: '2026999999' } });

    const phoneInput = screen.getByPlaceholderText(/0901 234 567/i);
    fireEvent.change(phoneInput, { target: { value: '0988776655' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu cập nhật hồ sơ/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã cập nhật thông tin hồ sơ/i)).toBeInTheDocument();
    });

    // Check localStorage saved
    const saved = JSON.parse(localStorage.getItem('fairshare_user_profile_99') || '{}');
    expect(saved.studentId).toBe('2026999999');
    expect(saved.phone).toBe('0988776655');
  });

  it('displays active project information when team exists and updates team on save', async () => {
    useProjectStore.setState({
      teams: [
        {
          id: 10,
          name: 'Đồ án Phát triển AI',
          courseName: 'CS401',
          description: 'Hệ thống AI',
          inviteCode: 'FS-CS401',
          createdAt: '2026-11-10T00:00:00Z',
        },
      ],
      activeTeamId: 10,
      loading: false,
      initialized: true,
    });

    vi.mocked(teamApi.updateTeam).mockResolvedValue({
      data: {
        id: 10,
        name: 'Đồ án Phát triển AI Đổi Tên',
        courseName: 'CS401-K26',
        createdAt: '2026-11-10T00:00:00Z',
      },
      message: 'OK',
      success: true,
    });

    render(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>
    );

    const projectNameInput = screen.getByDisplayValue('Đồ án Phát triển AI');
    fireEvent.change(projectNameInput, { target: { value: 'Đồ án Phát triển AI Đổi Tên' } });

    const saveProjectBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(saveProjectBtn);

    await waitFor(() => {
      expect(teamApi.updateTeam).toHaveBeenCalledWith(10, expect.objectContaining({
        name: 'Đồ án Phát triển AI Đổi Tên',
      }));
      expect(screen.getByText(/Đã lưu thiết lập dự án/i)).toBeInTheDocument();
    });
  });
});

