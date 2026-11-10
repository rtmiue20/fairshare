import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { useAuthStore } from '../store/authStore';

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
});
