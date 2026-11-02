// TC-FE-AUTH-01..03 – docs/qa/test-cases-sprint3.md
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../../store/authStore';

const user = { id: 1, email: 'an@st.ueh.edu.vn', fullName: 'Nguyen Van An' };

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('TC-FE-AUTH-01: login lưu token vào localStorage và bật isAuthenticated', () => {
    useAuthStore.getState().login('jwt-abc', user);

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.token).toBe('jwt-abc');
    expect(s.user).toEqual(user);
    expect(localStorage.getItem('token')).toBe('jwt-abc');
  });

  it('TC-FE-AUTH-02: logout xoá token và thông tin user', () => {
    useAuthStore.getState().login('jwt-abc', user);
    useAuthStore.getState().logout();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('TC-FE-AUTH-03: trạng thái ban đầu là chưa đăng nhập khi không có token', () => {
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
  });
});
