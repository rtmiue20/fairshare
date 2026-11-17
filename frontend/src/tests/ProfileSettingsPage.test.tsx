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
    getConsentStatus: vi.fn(),
    submitConsent: vi.fn(),
    revokeConsent: vi.fn(),
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProfileSettingsPage />
    </MemoryRouter>
  );

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

    vi.mocked(teamApi.getConsentStatus).mockResolvedValue({
      data: { consented: true },
      message: 'OK',
      success: true,
    });
  });

  it('renders page without hardcoded UEH text and initializes blank fields for new user', async () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thiết lập dự án & Thông tin cá nhân');
    expect(screen.queryByText(/Định danh UEH/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/UEH SSO/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Chỉnh sửa hồ sơ$/i }));

    const phoneInput = screen.getByPlaceholderText(/0901 234 567/i) as HTMLInputElement;
    expect(phoneInput.value).toBe('');

    const majorInput = screen.getByPlaceholderText(/Công nghệ Thông tin/i) as HTMLInputElement;
    expect(majorInput.value).toBe('');

    const mssvInput = screen.getByPlaceholderText(/mã số sinh viên hoặc mã định danh/i) as HTMLInputElement;
    expect(mssvInput.value).toBe('');
  });

  it('allows user to enter custom MSSV and save profile updates to backend', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /^Chỉnh sửa hồ sơ$/i }));

    fireEvent.change(screen.getByPlaceholderText(/mã số sinh viên hoặc mã định danh/i), {
      target: { value: '2026999999' },
    });
    fireEvent.change(screen.getByPlaceholderText(/0901 234 567/i), { target: { value: '0988776655' } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu cập nhật hồ sơ/i }));

    await waitFor(() => {
      expect(screen.getByText(/Đã cập nhật thông tin hồ sơ/i)).toBeInTheDocument();
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      '/users/me',
      expect.objectContaining({ studentId: '2026999999', phone: '0988776655' })
    );

    const saved = JSON.parse(localStorage.getItem('fairshare_user_profile_99') || '{}');
    expect(saved.studentId).toBe('2026999999');
    expect(saved.phone).toBe('0988776655');

    // Back to view mode showing persisted values
    expect(screen.getByText('0988776655')).toBeInTheDocument();
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

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Chỉnh sửa dự án/i }));

    const projectNameInput = screen.getByDisplayValue('Đồ án Phát triển AI');
    fireEvent.change(projectNameInput, { target: { value: 'Đồ án Phát triển AI Đổi Tên' } });
    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), { target: { value: 'TS. Trần B' } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(teamApi.updateTeam).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          name: 'Đồ án Phát triển AI Đổi Tên',
          lecturer: 'TS. Trần B',
          sprintCount: 4,
        })
      );
      expect(screen.getByText(/Đã lưu thiết lập dự án/i)).toBeInTheDocument();
    });
  });

  it('loads consent status from backend and allows revoking it', async () => {
    useProjectStore.setState({
      teams: [{ id: 10, name: 'Đồ án', createdAt: '2026-11-10T00:00:00Z' }],
      activeTeamId: 10,
      loading: false,
      initialized: true,
    });
    vi.mocked(teamApi.revokeConsent).mockResolvedValue({ data: undefined, message: 'OK', success: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();

    await waitFor(() => expect(screen.getByText(/NĐ 13\/2023 Hợp lệ/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: /Nghị định 13/i }));
    fireEvent.click(screen.getByRole('button', { name: /Rút đồng thuận/i }));

    await waitFor(() => {
      expect(teamApi.revokeConsent).toHaveBeenCalledWith(10);
      expect(screen.getByRole('button', { name: /Ký đồng thuận/i })).toBeInTheDocument();
    });
  });
});
