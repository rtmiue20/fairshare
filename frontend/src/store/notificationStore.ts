import { create } from 'zustand';
import { showToast } from '../components/ui/Toast';
import { activityApi, ActivityEventDto } from '../api/activity.api';
import apiClient from '../api/client';

export type NotificationSource = 'backend_alert' | 'backend_activity' | 'auto_monitor' | 'manual';

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timeAgo: string;
  read: boolean;
  authorName?: string;
  authorRole?: string;
  avatarBg?: string;
  avatarText?: string;
  actionPrimary?: {
    label: string;
    onClick?: () => void;
    link?: string;
  };
  actionSecondary?: {
    label: string;
    onClick?: () => void;
    link?: string;
  };
  targetLink?: string;
  createdAt?: number;
  teamId?: number;
  userScope?: string;
  source?: NotificationSource;
}

export interface AddNotificationInput
  extends Omit<NotificationItem, 'id' | 'read' | 'timeAgo'> {
  id?: string;
  timeAgo?: string;
  triggerToast?: boolean;
  link?: string;
}

export interface SyncWithBackendOptions {
  userScope?: string | null;
  memberNameMap?: Map<number, string>;
}

interface ScopedNotificationSnapshot {
  notifications: NotificationItem[];
  hasUnseenBadge: boolean;
  seenIds: string[];
  dismissedIds: string[];
}

interface BackendAlertItem {
  id: number;
  teamId?: number;
  userId?: number;
  userName?: string;
  alertType?: string;
  severity?: string;
  message?: string;
  resolved?: boolean;
  createdAt?: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  hasUnseenBadge: boolean;
  activeUserScope: string | null;
  activeTeamId: number | null;
  activeScopeKey: string | null;
  seenIds: string[];
  dismissedIds: string[];
  unreadCount: () => number;
  setUserScope: (userScope: string | null) => void;
  setScope: (userScope: string | null, teamId: number | null) => void;
  markBellAsSeen: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  addNotification: (item: AddNotificationInput) => void;
  syncWithBackend: (teamId: number, options?: SyncWithBackendOptions) => Promise<void>;
  resetToDefault: () => void;
}

const STORAGE_PREFIX = 'fs_notif_v5::';

const LEGACY_KEYS = [
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

const LEGACY_SAMPLE_IDS = new Set(['notif-1', 'notif-2', 'notif-3', 'notif-4']);

const LEGACY_SAMPLE_TEXT_SIGNATURES = [
  'tích hợp trello webhook',
  'minh triều đã mở đợt chấm chéo sprint 1',
  'thu hà chưa có hoạt động commit hoặc task mới trong 3 ngày qua',
  'đặc tả kiến trúc hệ thống',
];

const LEGACY_SAMPLE_ALERT_TYPES = new Set([
  'MILESTONE_PROGRESS',
  'ON_TIME_COMPLETION',
  'AVAILABILITY_ADJUSTED',
  'OVERDUE_WARNING',
  'SPRINT_CLOSED',
  'PEER_REVIEW_SUFFICIENT',
]);

let syncRequestSeq = 0;

export function buildUserScopeKey(
  user?: { id?: number | null; email?: string | null } | null
): string | null {
  if (!user) return null;
  const hasId = user.id != null;
  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
  if (hasId && email) return `u${user.id}_${email}`;
  if (hasId) return `u${user.id}`;
  if (email) return `e_${email}`;
  return null;
}

export function buildScopeKey(
  userScope: string | null | undefined,
  teamId: number | null | undefined
): string | null {
  if (!userScope || !teamId || teamId <= 0) return null;
  return `${userScope}::team_${teamId}`;
}

export function purgeLegacyNotificationStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    for (const key of LEGACY_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

function getStoredUserScopeKey(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw =
      window.localStorage.getItem('fairshare_user') || window.localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number | null; email?: string | null };
    return buildUserScopeKey(parsed);
  } catch {
    return null;
  }
}

function getStoredActiveTeamId(): number | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem('fairshare_active_team_id');
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch {
    return null;
  }
}

function isSampleNotification(item: {
  id?: string;
  title?: string;
  message?: string;
}): boolean {
  if (item.id && LEGACY_SAMPLE_IDS.has(item.id)) {
    return true;
  }
  const combined = `${item.title || ''} ${item.message || ''}`.toLowerCase();
  return LEGACY_SAMPLE_TEXT_SIGNATURES.some((sig) => combined.includes(sig));
}

function emptySnapshot(): ScopedNotificationSnapshot {
  return {
    notifications: [],
    hasUnseenBadge: false,
    seenIds: [],
    dismissedIds: [],
  };
}

function parseTeamIdFromScopeKey(scopeKey: string): number | null {
  const match = scopeKey.match(/::team_(\d+)$/);
  return match ? Number(match[1]) : null;
}

function loadScopedSnapshot(scopeKey: string | null): ScopedNotificationSnapshot {
  if (!scopeKey) return emptySnapshot();
  try {
    if (typeof window === 'undefined' || !window.localStorage) return emptySnapshot();
    const raw = window.localStorage.getItem(STORAGE_PREFIX + scopeKey);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as Partial<ScopedNotificationSnapshot>;
    if (!parsed || typeof parsed !== 'object') return emptySnapshot();

    const seenIds = Array.isArray(parsed.seenIds)
      ? Array.from(new Set(parsed.seenIds.filter((id): id is string => typeof id === 'string')))
      : [];
    const dismissedIds = Array.isArray(parsed.dismissedIds)
      ? Array.from(
          new Set(parsed.dismissedIds.filter((id): id is string => typeof id === 'string'))
        )
      : [];
    const dismissedSet = new Set(dismissedIds);
    const scopeTeamId = parseTeamIdFromScopeKey(scopeKey);
    const [userScope] = scopeKey.split('::');

    const rawNotifs = Array.isArray(parsed.notifications) ? parsed.notifications : [];
    const notifications: NotificationItem[] = [];
    for (const candidate of rawNotifs) {
      if (!candidate || typeof candidate !== 'object') continue;
      if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') continue;
      if (isSampleNotification(candidate)) continue;
      if (dismissedSet.has(candidate.id)) continue;
      if (scopeTeamId != null && candidate.teamId != null && Number(candidate.teamId) !== scopeTeamId) {
        continue;
      }
      if (candidate.userScope && userScope && candidate.userScope !== userScope) {
        continue;
      }
      notifications.push({
        ...candidate,
        teamId: scopeTeamId ?? candidate.teamId,
        userScope: userScope || candidate.userScope,
      });
    }

    const hasUnread = notifications.some((n) => !n.read);
    return {
      notifications,
      hasUnseenBadge: hasUnread && Boolean(parsed.hasUnseenBadge),
      seenIds,
      dismissedIds,
    };
  } catch {
    return emptySnapshot();
  }
}

function saveScopedSnapshot(
  scopeKey: string | null,
  snapshot: ScopedNotificationSnapshot
): void {
  if (!scopeKey) return;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_PREFIX + scopeKey, JSON.stringify(snapshot));
  } catch {
    // Ignore storage errors
  }
}

function formatBackendAlertNotifTitle(alertType?: string): string {
  switch ((alertType || '').toUpperCase()) {
    case 'OVERDUE_TASK':
      return 'Công việc In Progress đã quá hạn chót';
    case 'DUE_SOON_TASK':
      return 'Công việc sắp đến hạn chót';
    case 'TASK_TODO':
      return 'Công việc cần bắt đầu thực hiện';
    case 'INACTIVITY_WARNING':
      return 'Cảnh báo thành viên im lặng quá lâu';
    case 'CUSTOM_ERROR':
      return 'Cảnh báo khẩn cấp / Quá hạn';
    case 'CUSTOM_WARNING':
      return 'Cảnh báo nguy cơ tiến độ';
    case 'CUSTOM_SUCCESS':
      return 'Xác nhận hoàn thành tốt';
    case 'CUSTOM_INFO':
      return 'Thông báo thông tin';
    default:
      return 'Cảnh báo tiến độ dự án';
  }
}

function parseFormattedAlertMessage(rawMessage: string): {
  customTitle?: string;
  body: string;
  taskTitle?: string;
  senderLabel?: string;
} {
  let text = (rawMessage || '').trim();
  let customTitle: string | undefined;
  let taskTitle: string | undefined;
  let senderLabel: string | undefined;

  const titleMatch = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (titleMatch) {
    customTitle = titleMatch[1].trim();
    text = titleMatch[2].trim();
  }

  const parts = text.split(' | ');
  const bodyParts: string[] = [];
  for (const part of parts) {
    if (part.startsWith('Công việc: ')) {
      taskTitle = part.replace('Công việc: ', '').trim();
    } else if (part.startsWith('Người báo: ')) {
      senderLabel = part.replace('Người báo: ', '').trim();
    } else if (part.trim()) {
      bodyParts.push(part.trim());
    }
  }

  return {
    customTitle,
    body: bodyParts.join(' | ').trim() || rawMessage,
    taskTitle,
    senderLabel,
  };
}

function getInitials(name?: string | null, fallback = 'FS'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

function inferNotificationSource(item: {
  id: string;
  source?: NotificationSource;
  authorRole?: string;
}): NotificationSource {
  if (item.source) return item.source;
  if (item.authorRole === 'Auto Monitor' || item.id.startsWith('auto-alert-')) {
    return 'auto_monitor';
  }
  if (item.id.startsWith('alert-')) return 'backend_alert';
  if (item.id.startsWith('act-')) return 'backend_activity';
  return 'manual';
}

function formatViDateTime(value?: string): string | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function parseTimestampMs(value?: string): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

purgeLegacyNotificationStorage();

export const useNotificationStore = create<NotificationState>((set, get) => {
  const persistCurrent = (
    notifications: NotificationItem[],
    hasUnseenBadge: boolean,
    seenIds: string[],
    dismissedIds: string[]
  ) => {
    saveScopedSnapshot(get().activeScopeKey, {
      notifications,
      hasUnseenBadge,
      seenIds,
      dismissedIds,
    });
  };

  return {
    notifications: [],
    hasUnseenBadge: false,
    activeUserScope: null,
    activeTeamId: null,
    activeScopeKey: null,
    seenIds: [],
    dismissedIds: [],

    unreadCount: () => {
      return get().notifications.filter((n) => !n.read).length;
    },

    setUserScope: (userScope) => {
      if (!userScope) {
        get().clearNotifications();
        return;
      }
      if (get().activeUserScope === userScope) {
        return;
      }
      syncRequestSeq++;
      set({
        notifications: [],
        hasUnseenBadge: false,
        activeUserScope: userScope,
        activeTeamId: null,
        activeScopeKey: null,
        seenIds: [],
        dismissedIds: [],
      });
    },

    setScope: (userScope, teamId) => {
      if (!userScope) {
        get().clearNotifications();
        return;
      }
      const normalizedTeamId = teamId && teamId > 0 ? teamId : null;
      const nextScopeKey = buildScopeKey(userScope, normalizedTeamId);
      const state = get();
      if (
        state.activeUserScope === userScope &&
        state.activeTeamId === normalizedTeamId &&
        state.activeScopeKey === nextScopeKey
      ) {
        return;
      }

      syncRequestSeq++;
      if (!nextScopeKey) {
        set({
          notifications: [],
          hasUnseenBadge: false,
          activeUserScope: userScope,
          activeTeamId: null,
          activeScopeKey: null,
          seenIds: [],
          dismissedIds: [],
        });
        return;
      }

      const snap = loadScopedSnapshot(nextScopeKey);
      set({
        notifications: snap.notifications,
        hasUnseenBadge: snap.hasUnseenBadge,
        activeUserScope: userScope,
        activeTeamId: normalizedTeamId,
        activeScopeKey: nextScopeKey,
        seenIds: snap.seenIds,
        dismissedIds: snap.dismissedIds,
      });
    },

    markBellAsSeen: () => {
      const state = get();
      const nextSeenIds = Array.from(
        new Set([...state.seenIds, ...state.notifications.map((n) => n.id)])
      );
      set({ hasUnseenBadge: false, seenIds: nextSeenIds });
      persistCurrent(state.notifications, false, nextSeenIds, state.dismissedIds);
    },

    markAsRead: (id: string) => {
      const state = get();
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const remainingUnread = updated.filter((n) => !n.read).length;
      const nextBadge = remainingUnread > 0 ? state.hasUnseenBadge : false;
      const nextSeenIds = state.seenIds.includes(id)
        ? state.seenIds
        : [...state.seenIds, id];
      set({ notifications: updated, hasUnseenBadge: nextBadge, seenIds: nextSeenIds });
      persistCurrent(updated, nextBadge, nextSeenIds, state.dismissedIds);
    },

    markAllAsRead: () => {
      const state = get();
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      const nextSeenIds = Array.from(
        new Set([...state.seenIds, ...updated.map((n) => n.id)])
      );
      set({ notifications: updated, hasUnseenBadge: false, seenIds: nextSeenIds });
      persistCurrent(updated, false, nextSeenIds, state.dismissedIds);
      showToast('Đã đánh dấu tất cả thông báo là đã đọc');
    },

    removeNotification: (id: string) => {
      const state = get();
      const updated = state.notifications.filter((n) => n.id !== id);
      const remainingUnread = updated.filter((n) => !n.read).length;
      const nextBadge = remainingUnread > 0 ? state.hasUnseenBadge : false;
      const nextDismissedIds = state.dismissedIds.includes(id)
        ? state.dismissedIds
        : [...state.dismissedIds, id];
      set({
        notifications: updated,
        hasUnseenBadge: nextBadge,
        dismissedIds: nextDismissedIds,
      });
      persistCurrent(updated, nextBadge, state.seenIds, nextDismissedIds);
    },

    clearNotifications: () => {
      syncRequestSeq++;
      set({
        notifications: [],
        hasUnseenBadge: false,
        activeUserScope: null,
        activeTeamId: null,
        activeScopeKey: null,
        seenIds: [],
        dismissedIds: [],
      });
      purgeLegacyNotificationStorage();
    },

    addNotification: (item) => {
      if (isSampleNotification(item)) {
        return;
      }

      const showItemToast = () => {
        if (item.triggerToast !== false) {
          showToast({
            type: item.type,
            title: item.title,
            message: item.message,
            buttonLabel:
              item.actionPrimary?.label ||
              (item.type === 'success'
                ? 'Xem ngay'
                : item.type === 'error'
                ? 'Thử lại'
                : 'Chi tiết'),
            onButtonClick: item.actionPrimary?.onClick,
          });
        }
      };

      const currentState = get();
      const targetUserScope =
        item.userScope ?? currentState.activeUserScope ?? getStoredUserScopeKey();
      const fallbackStoredTeamId =
        currentState.activeUserScope == null && currentState.activeTeamId == null
          ? getStoredActiveTeamId()
          : null;
      const targetTeamId =
        item.teamId ?? currentState.activeTeamId ?? fallbackStoredTeamId;

      if (
        item.teamId != null &&
        currentState.activeTeamId != null &&
        item.teamId !== currentState.activeTeamId
      ) {
        return;
      }

      const targetScopeKey = buildScopeKey(targetUserScope, targetTeamId);
      if (!targetUserScope || !targetScopeKey || !targetTeamId) {
        showItemToast();
        return;
      }

      if (currentState.activeScopeKey === null) {
        get().setScope(targetUserScope, targetTeamId);
      }

      const state = get();
      if (state.activeScopeKey !== targetScopeKey) {
        return;
      }

      const id =
        item.id ||
        `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const source = inferNotificationSource({
        id,
        source: item.source,
        authorRole: item.authorRole,
      });

      if (source === 'auto_monitor' && state.dismissedIds.includes(id)) {
        return;
      }

      const existing = state.notifications.find((n) => n.id === id);
      const isAlreadySeen = state.seenIds.includes(id);

      const newNotif: NotificationItem = {
        id,
        read: source === 'auto_monitor' && existing ? existing.read : false,
        timeAgo: item.timeAgo || 'Vừa xong',
        type: item.type,
        title: item.title,
        message: item.message,
        authorName: item.authorName || 'Hệ thống',
        authorRole: item.authorRole || 'Hệ thống',
        avatarBg: item.avatarBg || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        avatarText: item.avatarText || getInitials(item.authorName, 'FS'),
        actionPrimary: item.actionPrimary,
        actionSecondary: item.actionSecondary,
        targetLink: item.link || item.actionPrimary?.link,
        createdAt: item.createdAt ?? existing?.createdAt ?? Date.now(),
        teamId: targetTeamId,
        userScope: targetUserScope,
        source,
      };

      const existingWithoutDup = state.notifications.filter((n) => n.id !== id);
      const updated = [newNotif, ...existingWithoutDup];

      let nextDismissedIds = state.dismissedIds;
      let nextBadge = state.hasUnseenBadge;

      if (source === 'auto_monitor') {
        if (!existing && !isAlreadySeen) {
          nextBadge = true;
        }
      } else {
        nextDismissedIds = state.dismissedIds.filter((d) => d !== id);
        nextBadge = true;
      }

      set({
        notifications: updated,
        hasUnseenBadge: nextBadge,
        dismissedIds: nextDismissedIds,
      });
      persistCurrent(updated, nextBadge, state.seenIds, nextDismissedIds);

      showItemToast();
    },

    syncWithBackend: async (teamId: number, options?: SyncWithBackendOptions) => {
      const userScope =
        options?.userScope ?? get().activeUserScope ?? getStoredUserScopeKey();

      if (!userScope) {
        get().clearNotifications();
        return;
      }
      if (!teamId || teamId <= 0) {
        get().setScope(userScope, null);
        return;
      }

      get().setScope(userScope, teamId);
      const reqSeq = ++syncRequestSeq;
      const targetScopeKey = buildScopeKey(userScope, teamId)!;

      try {
        const [actRes, alertRes] = await Promise.allSettled([
          activityApi.getByTeam(teamId),
          apiClient.get(`/alerts/team/${teamId}?includeResolved=false`),
        ]);

        if (reqSeq !== syncRequestSeq || get().activeScopeKey !== targetScopeKey) {
          return;
        }

        const freshState = get();
        const readMap = new Map<string, boolean>();
        for (const n of freshState.notifications) {
          readMap.set(n.id, n.read);
        }
        const seenSet = new Set(freshState.seenIds);
        const dismissedSet = new Set(freshState.dismissedIds);

        const alertSyncOk =
          alertRes.status === 'fulfilled' &&
          Array.isArray(alertRes.value?.data?.data);
        const actSyncOk =
          actRes.status === 'fulfilled' && Array.isArray(actRes.value?.data);

        const syncedNotifs: NotificationItem[] = [];

        if (alertSyncOk) {
          const alerts = alertRes.value.data.data as BackendAlertItem[];
          for (const a of alerts) {
            if (!a || a.id == null) continue;
            if (a.resolved === true) continue;
            if (a.teamId != null && Number(a.teamId) !== teamId) continue;

            const typeUpper = (a.alertType || '').trim().toUpperCase();
            if (LEGACY_SAMPLE_ALERT_TYPES.has(typeUpper)) continue;

            const notifId = `alert-${teamId}-${a.id}`;
            if (dismissedSet.has(notifId)) continue;

            const sevUpper = (a.severity || '').trim().toUpperCase();
            const notifType: NotificationItem['type'] =
              sevUpper === 'CRITICAL' ||
              typeUpper === 'OVERDUE_TASK' ||
              typeUpper === 'CUSTOM_ERROR'
                ? 'error'
                : sevUpper === 'WARNING' ||
                  typeUpper.includes('INACTIVITY') ||
                  typeUpper.includes('DUE_SOON') ||
                  typeUpper === 'CUSTOM_WARNING'
                ? 'warning'
                : typeUpper === 'CUSTOM_SUCCESS'
                ? 'success'
                : 'info';

            const parsed = parseFormattedAlertMessage(a.message || '');
            const baseTitle =
              typeUpper.startsWith('CUSTOM_') && parsed.customTitle
                ? parsed.customTitle
                : formatBackendAlertNotifTitle(a.alertType);
            const displayTitle = a.userName ? `${baseTitle} · ${a.userName}` : baseTitle;
            const cleanMessage =
              parsed.body ||
              (a.userName
                ? `Thành viên ${a.userName} đang có nguy cơ chậm tiến độ.`
                : 'Cần kiểm tra tiến độ công việc.');

            const notifCandidate: NotificationItem = {
              id: notifId,
              type: notifType,
              title: displayTitle,
              message: cleanMessage,
              timeAgo: formatViDateTime(a.createdAt) || 'Cần xử lý',
              read: readMap.get(notifId) ?? false,
              authorName:
                (typeUpper.startsWith('CUSTOM_') && parsed.senderLabel) ||
                a.userName ||
                'Hệ thống FairShare',
              authorRole: 'Giám sát tiến độ',
              avatarBg:
                notifType === 'error'
                  ? 'linear-gradient(135deg, #ef4444, #be123c)'
                  : notifType === 'warning'
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : notifType === 'success'
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              avatarText: getInitials(a.userName, 'CR'),
              actionPrimary: {
                label: 'Xem cảnh báo',
                link: '/alerts',
              },
              targetLink: '/alerts',
              createdAt: parseTimestampMs(a.createdAt) || Date.now(),
              teamId,
              userScope,
              source: 'backend_alert',
            };

            if (!isSampleNotification(notifCandidate)) {
              syncedNotifs.push(notifCandidate);
            }
          }
        }

        if (actSyncOk) {
          const rawEvents = actRes.value.data as Array<
            ActivityEventDto & { userName?: string }
          >;
          const sortedEvents = [...rawEvents].sort((a, b) => {
            const diff =
              parseTimestampMs(b.occurredAt) - parseTimestampMs(a.occurredAt);
            return diff !== 0 ? diff : Number(b.id || 0) - Number(a.id || 0);
          });

          const latestEvents = sortedEvents.slice(0, 8);
          for (const ev of latestEvents) {
            if (!ev || ev.id == null) continue;
            if (ev.teamId != null && Number(ev.teamId) !== teamId) continue;
            if (!ev.details || !ev.details.trim()) continue;

            const notifId = `act-${teamId}-${ev.id}`;
            if (dismissedSet.has(notifId)) continue;

            const isDone = ev.eventType === 'CARD_COMPLETED';
            const mappedMemberName =
              (ev.userId != null ? options?.memberNameMap?.get(ev.userId) : undefined) ||
              ev.userName ||
              'Thành viên nhóm';

            const actCandidate: NotificationItem = {
              id: notifId,
              type: isDone ? 'success' : 'info',
              title: isDone ? 'Hoàn thành nhiệm vụ' : 'Cập nhật hoạt động',
              message: ev.details,
              timeAgo: formatViDateTime(ev.occurredAt) || 'Gần đây',
              read: readMap.get(notifId) ?? false,
              authorName: mappedMemberName,
              avatarBg: isDone
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              avatarText: getInitials(mappedMemberName, 'EV'),
              actionPrimary: {
                label: 'Xem bảng task',
                link: '/teams',
              },
              targetLink: '/teams',
              createdAt: parseTimestampMs(ev.occurredAt) || Date.now(),
              teamId,
              userScope,
              source: 'backend_activity',
            };

            if (!isSampleNotification(actCandidate)) {
              syncedNotifs.push(actCandidate);
            }
          }
        }

        const syncedIdSet = new Set(syncedNotifs.map((n) => n.id));
        const alertSyncFailed = alertRes.status === 'rejected' || !alertSyncOk;
        const actSyncFailed = actRes.status === 'rejected' || !actSyncOk;

        const preservedNotifs = freshState.notifications.filter((n) => {
          if (isSampleNotification(n)) return false;
          if (dismissedSet.has(n.id)) return false;
          if (n.teamId !== teamId) return false;
          if (n.userScope && n.userScope !== userScope) return false;
          if (syncedIdSet.has(n.id)) return false;

          const source = inferNotificationSource(n);
          if (source === 'backend_alert') {
            return alertSyncFailed;
          }
          if (source === 'backend_activity') {
            return actSyncFailed;
          }
          if (source === 'auto_monitor') {
            return false;
          }
          return true;
        });

        const dedupMap = new Map<string, NotificationItem>();
        for (const item of [...preservedNotifs, ...syncedNotifs]) {
          if (!dedupMap.has(item.id)) {
            dedupMap.set(item.id, item);
          }
        }

        const merged = Array.from(dedupMap.values()).sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        );

        const hasNewUnseen = merged.some((n) => !n.read && !seenSet.has(n.id));
        const hasAnyUnread = merged.some((n) => !n.read);
        const nextHasUnseenBadge =
          hasAnyUnread && (freshState.hasUnseenBadge || hasNewUnseen);

        set({ notifications: merged, hasUnseenBadge: nextHasUnseenBadge });
        persistCurrent(
          merged,
          nextHasUnseenBadge,
          freshState.seenIds,
          freshState.dismissedIds
        );
      } catch {
        // Silently catch background sync errors
      }
    },

    resetToDefault: () => {
      const state = get();
      set({
        notifications: [],
        hasUnseenBadge: false,
        seenIds: [],
        dismissedIds: [],
      });
      if (state.activeScopeKey) {
        saveScopedSnapshot(state.activeScopeKey, emptySnapshot());
      }
    },
  };
});
