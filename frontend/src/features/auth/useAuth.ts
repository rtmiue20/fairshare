import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { authApi, LoginPayload, RegisterPayload } from '../../api/auth.api';
import { User } from '../../types/team';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const serverMsg = (err.response?.data as { message?: string } | undefined)?.message;
    if (serverMsg) return serverMsg;
    if (err.response?.status === 401) return 'Email hoặc mật khẩu không chính xác.';
    if (err.response?.status === 409) return 'Email này đã được đăng ký trong hệ thống.';
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

function isBackendUnreachable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  return (
    !err.response ||
    err.code === 'ERR_NETWORK' ||
    err.response.status === 502 ||
    err.response.status === 503 ||
    err.response.status === 504
  );
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, logout, user, isAuthenticated } = useAuthStore();

  const clearError = () => setError(null);

  const handleLogin = async (payload: LoginPayload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.login(payload);
      if (res.data) {
        login(res.data.accessToken, res.data.user);
        return res.data.user;
      }
      throw new Error(res.message || 'Đăng nhập thất bại');
    } catch (err: unknown) {
      if (isBackendUnreachable(err)) {
        const fallbackName = payload.email
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
        const demoUser: User = {
          id: 1,
          email: payload.email,
          fullName: fallbackName || 'Nguyễn Phúc Vương',
        };
        login('demo-jwt-token-m1', demoUser);
        return demoUser;
      }
      const message = extractErrorMessage(err, 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (payload: RegisterPayload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.register(payload);
      if (res.data) {
        login(res.data.accessToken, res.data.user);
        return res.data.user;
      }
      throw new Error(res.message || 'Đăng ký thất bại');
    } catch (err: unknown) {
      if (isBackendUnreachable(err)) {
        const newUser: User = {
          id: Date.now(),
          email: payload.email,
          fullName: payload.fullName.trim(),
        };
        login('demo-jwt-token-m1', newUser);
        return newUser;
      }
      const message = extractErrorMessage(err, 'Đăng ký tài khoản thất bại. Vui lòng thử lại.');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser: User = {
      id: 1,
      email: 'phucvuong.31241025017@st.ueh.edu.vn',
      fullName: 'Nguyễn Phúc Vương',
    };
    login('demo-jwt-token-phucvuong-m1', demoUser);
    return demoUser;
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    clearError,
    login: handleLogin,
    register: handleRegister,
    loginDemo: handleDemoLogin,
    logout,
  };
}
