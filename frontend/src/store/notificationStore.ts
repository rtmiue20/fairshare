import { create } from 'zustand';
import { showToast } from '../components/ui/Toast';

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
  };
  actionSecondary?: {
    label: string;
    onClick?: () => void;
  };
}

interface NotificationState {
  notifications: NotificationItem[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  addNotification: (
    item: Omit<NotificationItem, 'id' | 'read' | 'timeAgo'> & { timeAgo?: string; triggerToast?: boolean }
  ) => void;
  unreadCount: () => number;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'success',
    title: 'Hoàn thành task Sprint 1',
    message: 'Quốc Bảo đã hoàn thành task "Tích hợp Trello Webhook" & ghi nhận đóng góp.',
    timeAgo: '15 phút trước',
    read: false,
    authorName: 'Quốc Bảo',
    authorRole: 'Frontend',
    avatarBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    avatarText: 'QB',
    actionPrimary: {
      label: 'Xem task',
    },
  },
  {
    id: 'notif-2',
    type: 'info',
    title: 'Mời chấm chéo ẩn danh',
    message: 'Minh Triều đã mở đợt chấm chéo Sprint 1. Hãy đánh giá đóng góp của đồng đội.',
    timeAgo: '1 giờ trước',
    read: false,
    authorName: 'Minh Triều',
    authorRole: 'Leader',
    avatarBg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    avatarText: 'MT',
    actionPrimary: {
      label: 'Chấp nhận',
    },
    actionSecondary: {
      label: 'Để sau',
    },
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
    avatarBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    avatarText: 'FS',
    actionPrimary: {
      label: 'Nhắc nhở',
    },
  },
  {
    id: 'notif-4',
    type: 'info',
    title: 'Tài liệu Google Docs kết nối',
    message: 'Lan Anh đã liên kết tài liệu "Đặc tả kiến trúc hệ thống" vào dự án.',
    timeAgo: '1 ngày trước',
    read: true,
    authorName: 'Lan Anh',
    authorRole: 'Backend',
    avatarBg: 'linear-gradient(135deg, #10b981, #059669)',
    avatarText: 'LA',
  },
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: INITIAL_NOTIFICATIONS,

  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },

  markAsRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  addNotification: (item) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      read: false,
      timeAgo: item.timeAgo || 'Vừa xong',
      type: item.type,
      title: item.title,
      message: item.message,
      authorName: item.authorName,
      authorRole: item.authorRole,
      avatarBg: item.avatarBg,
      avatarText: item.avatarText,
      actionPrimary: item.actionPrimary,
      actionSecondary: item.actionSecondary,
    };

    set((state) => ({
      notifications: [newNotif, ...state.notifications],
    }));

    // Tự động kích hoạt Toast message tương ứng
    if (item.triggerToast !== false) {
      showToast({
        type: item.type,
        title: item.title,
        message: item.message,
        buttonLabel: item.actionPrimary?.label || (item.type === 'success' ? 'Got It' : item.type === 'error' ? 'Try again' : 'Super'),
        onButtonClick: item.actionPrimary?.onClick,
      });
    }
  },
}));
