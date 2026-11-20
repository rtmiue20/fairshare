import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

    // DEF-03: Không redirect reload trang khi 401 bắt nguồn từ /auth/login hoặc /auth/register để giữ thông báo lỗi
    if (error.response?.status === 401 && !isAuthEndpoint) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('fairshare_user');
        localStorage.removeItem('user');
        localStorage.removeItem('fairshare_active_team_id');
        const legacyNotifKeys = [
          'fs_notifications',
          'fs_notifications_v1',
          'fs_notifications_v2',
          'fs_notifications_v3',
          'fs_notifications_v4',
          'fs_notif_has_unseen',
          'fs_notif_has_unseen_v1',
          'fs_notif_has_unseen_v2',
          'fs_notif_has_unseen_v3',
          'fs_notif_has_unseen_v4',
        ];
        for (const k of legacyNotifKeys) {
          localStorage.removeItem(k);
        }
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('fairshare:unauthorized'));
        }
      } catch {
        // Ignore storage / dispatch errors in restricted environments
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
