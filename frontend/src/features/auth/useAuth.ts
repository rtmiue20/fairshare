import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi, LoginPayload, RegisterPayload } from '../../api/auth.api';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, logout, user, isAuthenticated } = useAuthStore();

  const handleLogin = async (payload: LoginPayload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.login(payload);
      if (res.data) {
        login(res.data.accessToken, res.data.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
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
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout,
  };
}
