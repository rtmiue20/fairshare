// TC-FE-AUTH-11..12 – docs/qa/test-cases-sprint3.md
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../app/ProtectedRoute';
import { useAuthStore } from '../../store/authStore';

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Trang đăng nhập</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Trang dashboard</div>} />
          <Route path="/teams" element={<div>Danh sách nhóm</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it.each(['/dashboard', '/teams'])(
    'TC-FE-AUTH-11: chưa đăng nhập vào %s -> bị chuyển về /login',
    (path) => {
      renderAt(path);
      expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument();
    },
  );

  it('TC-FE-AUTH-12: đã đăng nhập -> xem được trang được bảo vệ', () => {
    useAuthStore.setState({
      token: 'jwt-abc',
      isAuthenticated: true,
      user: { id: 1, email: 'an@st.ueh.edu.vn', fullName: 'An' },
    });
    renderAt('/teams');
    expect(screen.getByText('Danh sách nhóm')).toBeInTheDocument();
  });
});
