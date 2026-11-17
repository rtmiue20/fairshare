import { create } from 'zustand';
import { showToast } from '../components/ui/Toast';
import { activityApi } from '../api/activity.api';
import apiClient from '../api/client';

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
}

interface NotificationState {
  notifications: NotificationItem[];
  hasUnseenBadge: boolean;
  unreadCount: () => number;
  markBellAsSeen: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  addNotification: (
    item: Omit<NotificationItem, 'id' | 'read' | 'timeAgo'> & { timeAgo?: string; triggerToast?: boolean; link?: string }
  ) => void;
  syncWithBackend: (teamId: number) => Promise<void>;
  resetToDefault: () => void;
}

const STORAGE_KEY_NOTIFS = 'fs_notifications_v3';
const STORAGE_KEY_BADGE = 'fs_notif_has_unseen_v3';

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'success',
    title: 'Hoàn thành task Sprint 1',
    message: 'Quốc Bảo đã hoàn thành task "Tích hợp Trello Webhook" & ghi nhận đóng góp.',
    timeAgo: '15 phút trước',
    read: false,
    authorName: 'Quốc Bảo',
    authorRole: 'Frontend Dev',
    avatarBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    avatarText: 'QB',
    actionPrimary: {
      label: 'Xem task',
      link: '/teams',
    },
    targetLink: '/teams',
    createdAt: Date.now() - 15 * 60 * 1000,
  },
  {
    id: 'notif-2',
    type: 'info',
    title: 'Mời chấm chéo ẩn danh',
    message: 'Minh Triều đã mở đợt chấm chéo Sprint 1. Hãy đánh giá đóng góp của đồng đội.',
    timeAgo: '1 giờ trước',
    read: false,
    authorName: 'Minh Triều',
    authorRole: 'Trưởng nhóm',
    avatarBg: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    avatarText: 'MT',
    actionPrimary: {
      label: 'Chấp nhận',
      link: '/peer-review',
    },
    actionSecondary: {
      label: 'Để sau',
    },
    targetLink: '/peer-review',
    createdAt: Date.now() - 60 * 60 * 1000,
  },
  {
    id: 'notif-3',
    type: 'warning',
    title: 'Cảnh báo sớm Inactivity',
    message: 'Thu Hà chưa có hoạt động commit hoặc task mới trong 3 ngày qua.',
    timeAgo: '3 giờ trước',
    read: false,
    authorName: 'Hệ thống FairShare',
    authorRole: 'Audit Bot',
    avatarBg: 'linear-gradient(135deg, #d97706, #b45309)',
    avatarText: 'FS',
    actionPrimary: {
      label: 'Nhắc nhở',
      link: '/alerts',
    },
    targetLink: '/alerts',
    createdAt: Date.now() - 3 * 3600 * 1000,
  },
  {
    id: 'notif-4',
    type: 'info',
    title: 'Tài liệu Google Docs kết nối',
    message: 'Lan Anh đã liên kết tài liệu "Đặc tả kiến trúc hệ thống" vào dự án.',
    timeAgo: '1 ngày trước',
    read: true,
    authorName: 'Lan Anh',
    authorRole: 'Backend Dev',
    avatarBg: 'linear-gradient(135deg, #10b981, #059669)',
    avatarText: 'LA',
    actionPrimary: {
      label: 'Xem tài liệu',
      link: '/integration',
    },
    targetLink: '/integration',
    createdAt: Date.now() - 24 * 3600 * 1000,
  },
];

function loadStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore error
  }
  return INITIAL_NOTIFICATIONS;
}

function loadStoredBadge(defaultHasUnseen: boolean): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BADGE);
    if (raw !== null) {
      return raw === 'true';
    }
  } catch {
    // Ignore error
  }
  return defaultHasUnseen;
}

function saveState(notifs: NotificationItem[], hasBadge: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifs));
    localStorage.setItem(STORAGE_KEY_BADGE, String(hasBadge));
  } catch {
    // Ignore error
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  const initialNotifs = loadStoredNotifications();
  const initialUnreadCount = initialNotifs.filter((n) => !n.read).length;
  const initialBadge = loadStoredBadge(initialUnreadCount > 0);

  return {
    notifications: initialNotifs,
    hasUnseenBadge: initialBadge,

    unreadCount: () => {
      return get().notifications.filter((n) => !n.read).length;
    },

    // Khi người dùng bấm vào chuông để xem -> Số đếm trên chuông biến mất!
    markBellAsSeen: () => {
      set({ hasUnseenBadge: false });
      saveState(get().notifications, false);
    },

    // Đánh dấu 1 thông báo là đã đọc
    markAsRead: (id: string) => {
      const updated = get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const remainingUnread = updated.filter((n) => !n.read).length;
      const nextBadge = remainingUnread > 0 ? get().hasUnseenBadge : false;
      set({ notifications: updated, hasUnseenBadge: nextBadge });
      saveState(updated, nextBadge);
    },

    // Đánh dấu tất cả là đã đọc (bấm nút check check trong popover)
    markAllAsRead: () => {
      const updated = get().notifications.map((n) => ({ ...n, read: true }));
      set({ notifications: updated, hasUnseenBadge: false });
      saveState(updated, false);
      showToast('Đã đánh dấu tất cả thông báo là đã đọc');
    },

    // Xóa một thông báo
    removeNotification: (id: string) => {
      const updated = get().notifications.filter((n) => n.id !== id);
      const remainingUnread = updated.filter((n) => !n.read).length;
      const nextBadge = remainingUnread > 0 ? get().hasUnseenBadge : false;
      set({ notifications: updated, hasUnseenBadge: nextBadge });
      saveState(updated, nextBadge);
    },

    // Thêm thông báo mới (khi có sự kiện thay đổi: task xong, alert mới, review...)
    addNotification: (item) => {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        read: false,
        timeAgo: item.timeAgo || 'Vừa xong',
        type: item.type,
        title: item.title,
        message: item.message,
        authorName: item.authorName || 'Hệ thống',
        authorRole: item.authorRole || 'Hệ thống',
        avatarBg: item.avatarBg || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        avatarText: item.avatarText || (item.authorName ? item.authorName.substring(0, 2).toUpperCase() : 'FS'),
        actionPrimary: item.actionPrimary,
        actionSecondary: item.actionSecondary,
        targetLink: item.link || item.actionPrimary?.link,
        createdAt: Date.now(),
      };

      const updated = [newNotif, ...get().notifications];
      // Khi có thông báo mới, bật lại số đếm trên chuông
      set({ notifications: updated, hasUnseenBadge: true });
      saveState(updated, true);

      // Tự động kích hoạt Toast message tương ứng
      if (item.triggerToast !== false) {
        showToast({
          type: item.type,
          title: item.title,
          message: item.message,
          buttonLabel: item.actionPrimary?.label || (item.type === 'success' ? 'Xem ngay' : item.type === 'error' ? 'Thử lại' : 'Chi tiết'),
          onButtonClick: item.actionPrimary?.onClick,
        });
      }
    },

    // Đồng bộ các sự kiện thực tế từ Backend (activity_events & alerts)
    syncWithBackend: async (teamId: number) => {
      if (!teamId) return;
      try {
        const [actRes, alertRes] = await Promise.allSettled([
          activityApi.getByTeam(teamId),
          apiClient.get(`/alerts/team/${teamId}?includeResolved=false`),
        ]);

        const currentNotifs = get().notifications;
        const newNotifs: NotificationItem[] = [];

        // 1. Đồng bộ các Activity Events mới
        if (actRes.status === 'fulfilled' && actRes.value?.data) {
          const events = actRes.value.data.slice(0, 5); // 5 sự kiện gần nhất
          for (const ev of events) {
            const notifId = `act-${ev.id}`;
            const exists = currentNotifs.some((n) => n.id === notifId);
            if (!exists && ev.details) {
              const isDone = ev.eventType === 'CARD_COMPLETED';
              newNotifs.push({
                id: notifId,
                type: isDone ? 'success' : 'info',
                title: isDone ? 'Hoàn thành nhiệm vụ' : 'Cập nhật hoạt động',
                message: ev.details,
                timeAgo: 'Gần đây',
                read: false,
                authorName: `Thành viên #${ev.userId || 'N'}`,
                avatarBg: isDone ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                avatarText: 'EV',
                actionPrimary: {
                  label: 'Xem bảng task',
                  link: '/teams',
                },
                targetLink: '/teams',
                createdAt: ev.occurredAt ? new Date(ev.occurredAt).getTime() : Date.now(),
              });
            }
          }
        }

        // 2. Đồng bộ các Cảnh báo mới
        if (alertRes.status === 'fulfilled' && alertRes.value?.data?.data) {
          const alerts = alertRes.value.data.data;
          for (const a of alerts) {
            const notifId = `alert-${a.id}`;
            const exists = currentNotifs.some((n) => n.id === notifId);
            if (!exists) {
              newNotifs.push({
                id: notifId,
                type: 'warning',
                title: a.title || 'Cảnh báo Inactivity',
                message: a.message || `Thành viên ${a.userName || ''} đang có nguy cơ chậm tiến độ.`,
                timeAgo: 'Cần xử lý',
                read: false,
                authorName: 'Hệ thống FairShare',
                avatarBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                avatarText: 'FS',
                actionPrimary: {
                  label: 'Nhắc nhở',
                  link: '/alerts',
                },
                targetLink: '/alerts',
                createdAt: Date.now(),
              });
            }
          }
        }

        if (newNotifs.length > 0) {
          const merged = [...newNotifs, ...currentNotifs];
          set({ notifications: merged, hasUnseenBadge: true });
          saveState(merged, true);
        }
      } catch {
        // Silently catch background sync errors
      }
    },

    resetToDefault: () => {
      set({ notifications: INITIAL_NOTIFICATIONS, hasUnseenBadge: true });
      saveState(INITIAL_NOTIFICATIONS, true);
    },
  };
});
