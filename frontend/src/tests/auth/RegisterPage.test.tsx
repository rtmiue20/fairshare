// TC-FE-AUTH-08..10 – docs/qa/test-cases-sprint3.md
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RegisterPage } from '../../features/auth/RegisterPage';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../api/auth.api', () => ({
  authApi: { login: vi.fn(), register: vi.fn() },
}));

const registerMock = vi.mocked(authApi.register);

function renderRegister() {
  const view = render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Trang đăng nhập</div>} />
        <Route path="/dashboard" element={<div>Trang dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
  const q = (sel: string) => view.container.querySelector(sel) as HTMLInputElement;
  return { fullName: q('input[type="text"]'), email: q('input[type="email"]'), password: q('input[type="password"]') };
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('TC-FE-AUTH-08: đăng ký thành công -> gửi đủ họ tên/email/mật khẩu, đăng nhập luôn và vào /dashboard', async () => {
    registerMock.mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        accessToken: 'jwt-new',
        tokenType: 'Bearer',
        user: { id: 2, email: 'binh@st.ueh.edu.vn', fullName: 'Tran Binh' },
      },
    });
    const { fullName, email, password } = renderRegister();

    fireEvent.change(fullName, { target: { value: 'Tran Binh' } });
    fireEvent.change(email, { target: { value: 'binh@st.ueh.edu.vn' } });
    fireEvent.change(password, { target: { value: 'Matkhau@123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    expect(await screen.findByText('Trang dashboard')).toBeInTheDocument();
    expect(registerMock).toHaveBeenCalledWith({
      fullName: 'Tran Binh',
      email: 'binh@st.ueh.edu.vn',
      password: 'Matkhau@123',
    });
    expect(useAuthStore.getState().user?.email).toBe('binh@st.ueh.edu.vn');
  });

  it('TC-FE-AUTH-09: đăng ký thất bại -> hiện lỗi và không chuyển trang', async () => {
    registerMock.mockRejectedValue(new Error('Email đã được sử dụng'));
    const { fullName, email, password } = renderRegister();

    fireEvent.change(fullName, { target: { value: 'Tran Binh' } });
    fireEvent.change(email, { target: { value: 'binh@st.ueh.edu.vn' } });
    fireEvent.change(password, { target: { value: 'Matkhau@123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    expect(await screen.findByText('Email đã được sử dụng')).toBeInTheDocument();
    expect(screen.queryByText('Trang dashboard')).not.toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('TC-FE-AUTH-10: cả 3 trường đều bắt buộc', () => {
    const { fullName, email, password } = renderRegister();
    expect(fullName).toBeRequired();
    expect(email).toBeRequired();
    expect(password).toBeRequired();
  });
});
