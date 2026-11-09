// TC-FE-AUTH-04..07 – docs/qa/test-cases-sprint3.md
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../../features/auth/LoginPage';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../api/auth.api', () => ({
  authApi: { login: vi.fn(), register: vi.fn() },
}));

const loginMock = vi.mocked(authApi.login);

function renderLogin() {
  const view = render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/" element={<div>Trang chủ FairShare</div>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>Trang đăng ký</div>} />
        <Route path="/dashboard" element={<div>Trang dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
  const email = view.container.querySelector('input[type="email"]') as HTMLInputElement;
  const password = view.container.querySelector('input[type="password"]') as HTMLInputElement;
  return { email, password };
}

function fillAndSubmit(email: HTMLInputElement, password: HTMLInputElement) {
  fireEvent.change(email, { target: { value: 'an@st.ueh.edu.vn' } });
  fireEvent.change(password, { target: { value: 'Matkhau@123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('TC-FE-AUTH-04: hiển thị form có email, mật khẩu (bắt buộc) và nút Đăng nhập', () => {
    const { email, password } = renderLogin();
    expect(email).toBeRequired();
    expect(password).toBeRequired();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('TC-FE-AUTH-05: đăng nhập thành công -> gọi API đúng payload, lưu token, chuyển sang / (Welcome/Landing)', async () => {
    loginMock.mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        accessToken: 'jwt-abc',
        tokenType: 'Bearer',
        user: { id: 1, email: 'an@st.ueh.edu.vn', fullName: 'An' },
      },
    });
    const { email, password } = renderLogin();

    fillAndSubmit(email, password);

    expect(await screen.findByText('Trang chủ FairShare')).toBeInTheDocument();
    expect(loginMock).toHaveBeenCalledWith({ email: 'an@st.ueh.edu.vn', password: 'Matkhau@123' });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('jwt-abc');
  });

  it('TC-FE-AUTH-06: đăng nhập thất bại -> hiện thông báo lỗi, ở lại trang, không lưu token', async () => {
    loginMock.mockRejectedValue(new Error('Email hoặc mật khẩu không đúng'));
    const { email, password } = renderLogin();

    fillAndSubmit(email, password);

    expect(await screen.findByText('Email hoặc mật khẩu không đúng')).toBeInTheDocument();
    expect(screen.queryByText('Trang chủ FairShare')).not.toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled());
  });

  it('TC-FE-AUTH-07: link "Đăng ký ngay" chuyển sang trang đăng ký', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('link', { name: 'Đăng ký ngay' }));
    expect(screen.getByText('Trang đăng ký')).toBeInTheDocument();
  });
});
