import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { useAuthStore } from '../store/authStore';
import { ContributionDashboard } from '../features/dashboard/ContributionDashboard';
import { contributionApi } from '../api/contribution.api';

vi.mock('../api/contribution.api', () => ({
  contributionApi: {
    getContributions: vi.fn().mockResolvedValue({ success: true, data: null }),
    getContributionSummary: vi.fn().mockResolvedValue([]),
    getEvidenceTraceability: vi.fn().mockResolvedValue([]),
    getPendingManualContributions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

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

if (typeof window !== 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

describe('M1 Frontend Core & Layout Tests', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('renders EmptyState correctly', () => {
    render(<EmptyState title="Bảng đóng góp trống" />);
    expect(screen.getByText('Bảng đóng góp trống')).toBeInTheDocument();
  });

  it('renders LoginPage with email, password inputs and demo login button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Đăng nhập FairShare')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('validates empty email on LoginPage submit', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập địa chỉ email của bạn.');
  });

  it('renders RegisterPage with required fields', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Đăng ký tài khoản FairShare')).toBeInTheDocument();
    expect(screen.getByLabelText('Họ và tên')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
  });

  it('renders Header and Sidebar navigation links correctly', () => {
    useAuthStore.getState().login('test-token', {
      id: 1,
      email: 'phucvuong.31241025017@st.ueh.edu.vn',
      fullName: 'Nguyễn Phúc Vương',
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Header />
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Nguyễn Phúc Vương')).toBeInTheDocument();
    expect(screen.getByText('Bảng đóng góp')).toBeInTheDocument();
    expect(screen.getByText('Danh sách nhóm')).toBeInTheDocument();
    expect(screen.getByText('Kanban Board')).toBeInTheDocument();
    expect(screen.getByText('Chấm chéo')).toBeInTheDocument();
  });

  describe('ContributionDashboard teamId handling (DEF-22)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('fetches contribution data using prop teamId when provided', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <ContributionDashboard teamId={5} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(contributionApi.getContributions).toHaveBeenCalledWith(5, expect.any(Number));
        expect(contributionApi.getContributionSummary).toHaveBeenCalledWith(5, expect.any(Number));
      });
    });

    it('fetches contribution data using URL search param teamId', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard?teamId=7']}>
          <ContributionDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(contributionApi.getContributions).toHaveBeenCalledWith(7, expect.any(Number));
        expect(contributionApi.getContributionSummary).toHaveBeenCalledWith(7, expect.any(Number));
      });
    });
  });
});
