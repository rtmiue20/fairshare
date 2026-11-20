import { create } from 'zustand';
import { User } from '../types/team';
import { useProjectStore } from './projectStore';
import { buildUserScopeKey, useNotificationStore } from './notificationStore';

const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'fairshare_user';

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem(key);
    }
    return null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

function getStoredUser(): User | null {
  try {
    const raw = safeGetItem(USER_STORAGE_KEY) || safeGetItem('user');
    if (raw) return JSON.parse(raw) as User;
    return null;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  const token = safeGetItem(TOKEN_STORAGE_KEY) || safeGetItem('token');
  return token || null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  isAuthenticated: true,
  login: (token, user) => {
    const prevScope =
      buildUserScopeKey(get().user) || buildUserScopeKey(getStoredUser());
    const nextScope = buildUserScopeKey(user);
    if (!prevScope || prevScope !== nextScope) {
      safeRemoveItem('fairshare_active_team_id');
      useProjectStore.getState().resetProjects();
      useNotificationStore.getState().clearNotifications();
    }
    safeSetItem(TOKEN_STORAGE_KEY, token);
    safeSetItem(USER_STORAGE_KEY, JSON.stringify(user));
    useNotificationStore.getState().setUserScope(nextScope);
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    safeRemoveItem(TOKEN_STORAGE_KEY);
    safeRemoveItem(USER_STORAGE_KEY);
    safeRemoveItem('token');
    safeRemoveItem('user');
    safeRemoveItem('fairshare_active_team_id');
    useProjectStore.getState().resetProjects();
    useNotificationStore.getState().clearNotifications();
    set({ token: null, user: null, isAuthenticated: false });
  },
  updateUser: (partial) =>
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...partial };
      safeSetItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      return { user: updatedUser };
    }),
}));

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  const win = window as Window & { __fsUnauthorizedListener?: () => void };
  if (win.__fsUnauthorizedListener) {
    window.removeEventListener('fairshare:unauthorized', win.__fsUnauthorizedListener);
  }
  const onUnauthorized = () => {
    useAuthStore.getState().logout();
  };
  win.__fsUnauthorizedListener = onUnauthorized;
  window.addEventListener('fairshare:unauthorized', onUnauthorized);
}
