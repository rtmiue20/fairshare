import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildScopeKey,
  buildUserScopeKey,
  purgeLegacyNotificationStorage,
  useNotificationStore,
} from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { activityApi } from '../api/activity.api';
import apiClient from '../api/client';

vi.mock('../api/activity.api', () => ({
  activityApi: {
    getByTeam: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../components/ui/Toast', () => ({
  showToast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const USER_A = { id: 101, email: 'userA@ueh.edu.vn', fullName: 'Nguyễn Minh Triều' };
const USER_B = { id: 202, email: 'userB@ueh.edu.vn', fullName: 'Trần Quốc Bảo' };
const USER_DEMO_SAME_ID = { id: 101, email: 'otherA@ueh.edu.vn', fullName: 'Khác Email' };

describe('useNotificationStore — Isolation, Sample Purge & Accurate Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useNotificationStore.getState().clearNotifications();
    useProjectStore.getState().resetProjects();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('starts empty with zero sample notifications and purges legacy localStorage keys', () => {
    localStorage.setItem(
      'fs_notifications_v3',
      JSON.stringify([{ id: 'notif-2', title: 'Mời chấm chéo ẩn danh', message: 'Minh Triều đã mở đợt chấm chéo Sprint 1.' }])
    );
    localStorage.setItem('fs_notif_has_unseen_v3', 'true');
    localStorage.setItem(
      'fs_notifications_v4',
      JSON.stringify([{ id: 'notif-3', title: 'Cảnh báo sớm Inactivity', message: 'Thu Hà chưa có hoạt động commit hoặc task mới trong 3 ngày qua.' }])
    );
    localStorage.setItem('fs_notif_has_unseen_v4', 'true');

    purgeLegacyNotificationStorage();

    expect(localStorage.getItem('fs_notifications_v3')).toBeNull();
    expect(localStorage.getItem('fs_notif_has_unseen_v3')).toBeNull();
    expect(localStorage.getItem('fs_notifications_v4')).toBeNull();
    expect(localStorage.getItem('fs_notif_has_unseen_v4')).toBeNull();

    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.hasUnseenBadge).toBe(false);
  });

  it('rejects hardcoded sample notifications passed directly to addNotification or present in scoped storage', () => {
    useAuthStore.getState().login('token-a', USER_A);
    const scopeA = buildUserScopeKey(USER_A)!;
    const scopeKey = buildScopeKey(scopeA, 1)!;

    localStorage.setItem(
      `fs_notif_v5::${scopeKey}`,
      JSON.stringify({
        notifications: [
          {
            id: 'notif-1',
            type: 'success',
            title: 'Hoàn thành task Sprint 1',
            message: 'Quốc Bảo đã hoàn thành task "Tích hợp Trello Webhook" & ghi nhận đóng góp.',
            timeAgo: '15 phút trước',
            read: false,
          },
          {
            id: 'real-manual-1',
            type: 'info',
            title: 'Thông báo thật',
            message: 'Nội dung công việc thật của dự án.',
            timeAgo: 'Vừa xong',
            read: false,
            teamId: 1,
            userScope: scopeA,
            source: 'manual',
          },
        ],
        hasUnseenBadge: true,
        seenIds: [],
        dismissedIds: [],
      })
    );

    useNotificationStore.getState().setScope(scopeA, 1);
    expect(useNotificationStore.getState().notifications.map((n) => n.id)).toEqual([
      'real-manual-1',
    ]);

    useNotificationStore.getState().addNotification({
      id: 'notif-4',
      teamId: 1,
      type: 'info',
      title: 'Tài liệu Google Docs kết nối',
      message: 'Lan Anh đã liên kết tài liệu "Đặc tả kiến trúc hệ thống" vào dự án.',
      triggerToast: false,
    });
    useNotificationStore.getState().addNotification({
      teamId: 1,
      type: 'warning',
      title: 'Cảnh báo giả',
      message: 'Thu Hà chưa có hoạt động commit hoặc task mới trong 3 ngày qua.',
      triggerToast: false,
    });

    expect(useNotificationStore.getState().notifications.map((n) => n.id)).toEqual([
      'real-manual-1',
    ]);
  });

  it('strictly isolates notifications across different accounts (including same numeric ID) on logout and direct login switch', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 11,
            teamId: 10,
            userId: 101,
            userName: 'Nguyễn Minh Triều',
            alertType: 'OVERDUE_TASK',
            severity: 'CRITICAL',
            message: 'Công việc "Thiết kế API" đã quá hạn 2 ngày.',
            resolved: false,
            createdAt: '2026-11-20T08:00:00',
          },
        ],
      },
    });
    vi.mocked(activityApi.getByTeam).mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    useAuthStore.getState().login('token-a', USER_A);
    useProjectStore.setState({ teams: [{ id: 10, name: 'Team A', createdAt: '' }], activeTeamId: 10, initialized: true });
    await useNotificationStore.getState().syncWithBackend(10);

    useNotificationStore.getState().addNotification({
      id: 'manual-a-10',
      teamId: 10,
      source: 'manual',
      type: 'info',
      title: 'Thao tác riêng của User A',
      message: 'Chỉ thuộc về tài khoản A',
      triggerToast: false,
    });

    expect(useNotificationStore.getState().notifications.map((n) => n.id)).toEqual([
      'manual-a-10',
      'alert-10-11',
    ]);

    // Logout phải dọn sạch toàn bộ thông báo đang hiển thị
    useAuthStore.getState().logout();
    expect(useNotificationStore.getState().notifications).toEqual([]);
    expect(useNotificationStore.getState().hasUnseenBadge).toBe(false);
    expect(useNotificationStore.getState().activeUserScope).toBeNull();

    // User B (khác id) đăng nhập và đồng bộ nhóm rỗng -> tuyệt đối không thấy data của A
    vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [] } });
    useAuthStore.getState().login('token-b', USER_B);
    await useNotificationStore.getState().syncWithBackend(20);
    expect(useNotificationStore.getState().notifications).toEqual([]);

    // Login trực tiếp sang tài khoản khác email dù trùng numeric id (fallback offline demo mode)
    useAuthStore.getState().login('token-other', USER_DEMO_SAME_ID);
    await useNotificationStore.getState().syncWithBackend(10);
    expect(useNotificationStore.getState().notifications).toEqual([]);

    // Quay lại đúng User A trên Team 10 -> chỉ khôi phục lại snapshot của A (bao gồm manual-a-10)
    useAuthStore.getState().login('token-a-2', USER_A);
    useNotificationStore.getState().setScope(buildUserScopeKey(USER_A), 10);
    expect(useNotificationStore.getState().notifications.map((n) => n.id)).toContain(
      'manual-a-10'
    );
  });

  it('isolates notifications across teams and discards stale async sync responses', async () => {
    useAuthStore.getState().login('token-a', USER_A);
    const scopeA = buildUserScopeKey(USER_A)!;

    // Thiết lập sẵn manual notification cho Team 1
    useNotificationStore.getState().setScope(scopeA, 1);
    useNotificationStore.getState().addNotification({
      id: 'manual-team-1',
      teamId: 1,
      source: 'manual',
      type: 'success',
      title: 'Tạo task Team 1',
      message: 'Task thuộc Team 1',
      triggerToast: false,
    });

    // Chuẩn bị response chậm cho Team 1 và response nhanh cho Team 2
    let resolveTeam1Alerts!: (val: unknown) => void;
    const team1AlertsPromise = new Promise((res) => {
      resolveTeam1Alerts = res;
    });

    vi.mocked(activityApi.getByTeam).mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    });

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes('/alerts/team/1')) {
        return team1AlertsPromise as Promise<never>;
      }
      return Promise.resolve({
        data: {
          success: true,
          data: [
            {
              id: 77,
              teamId: 2,
              userId: 101,
              userName: 'Nguyễn Minh Triều',
              alertType: 'DUE_SOON_TASK',
              severity: 'WARNING',
              message: 'Task Team 2 sắp đến hạn.',
              resolved: false,
              createdAt: '2026-11-20T09:00:00',
            },
          ],
        },
      });
    });

    const slowSyncTeam1 = useNotificationStore.getState().syncWithBackend(1, { userScope: scopeA });

    // Ngay trước khi Team 1 resolve, người dùng chuyển sang Team 2
    await useNotificationStore.getState().syncWithBackend(2, { userScope: scopeA });

    expect(useNotificationStore.getState().activeTeamId).toBe(2);
    expect(useNotificationStore.getState().notifications.map((n) => n.id)).toEqual([
      'alert-2-77',
    ]);

    // Ngăn ghi nhầm manual notification của Team 1 khi đang active Team 2
    useNotificationStore.getState().addNotification({
      id: 'late-manual-team-1',
      teamId: 1,
      source: 'manual',
      type: 'info',
      title: 'Không được lẫn vào Team 2',
      message: 'Thuộc Team 1',
      triggerToast: false,
    });
    expect(useNotificationStore.getState().notifications.map((n) => n.id)).toEqual([
      'alert-2-77',
    ]);

    // Lúc này response chậm của Team 1 mới trả về -> phải bị hủy bỏ hoàn toàn
    resolveTeam1Alerts({
      data: {
        success: true,
        data: [
          {
            id: 55,
            teamId: 1,
            userId: 101,
            userName: 'Nguyễn Minh Triều',
            alertType: 'OVERDUE_TASK',
            severity: 'CRITICAL',
            message: 'Response trễ của Team 1',
            resolved: false,
          },
        ],
      },
    });
    await slowSyncTeam1;

    expect(useNotificationStore.getState().activeTeamId).toBe(2);
    expect(useNotificationStore.getState().notifications.map((n) => n.id)).toEqual([
      'alert-2-77',
    ]);
  });

  it('syncs newest events with member names, filters legacy seed alert types, preserves badge seen state, and respects dismissals', async () => {
    useAuthStore.getState().login('token-a', USER_A);
    const scopeA = buildUserScopeKey(USER_A)!;

    const alertsPayload = [
      {
        id: 1,
        teamId: 5,
        userId: 101,
        userName: 'Nguyễn Minh Triều',
        alertType: 'MILESTONE_PROGRESS',
        severity: 'INFO',
        message: 'Sample seed milestone alert',
        resolved: false,
        createdAt: '2026-11-18T10:00:00',
      },
      {
        id: 2,
        teamId: 5,
        userId: 102,
        userName: 'Lê Quốc Bảo',
        alertType: 'CUSTOM_WARNING',
        severity: 'WARNING',
        message: '[Nhắc nhở tiến độ] Cần hoàn thành trong tối nay | Công việc: Auth JWT | Người báo: Nhóm trưởng (Nguyễn Minh Triều)',
        resolved: false,
        createdAt: '2026-11-20T10:00:00',
      },
      {
        id: 3,
        teamId: 999,
        userId: 103,
        userName: 'Nhóm khác',
        alertType: 'OVERDUE_TASK',
        severity: 'CRITICAL',
        message: 'Alert lạc nhóm khác',
        resolved: false,
        createdAt: '2026-11-20T11:00:00',
      },
    ];

    const activitiesPayload = Array.from({ length: 10 }, (_, idx) => ({
      id: idx + 1,
      teamId: 5,
      userId: idx === 9 ? 102 : 101,
      source: 'BOARD',
      eventType: idx === 9 ? 'CARD_COMPLETED' : 'CARD_MOVED',
      details: `Sự kiện #${idx + 1}`,
      occurredAt: `2026-11-${String(10 + idx).padStart(2, '0')}T12:00:00`,
    }));

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: alertsPayload },
    });
    vi.mocked(activityApi.getByTeam).mockResolvedValue({
      success: true,
      message: 'ok',
      data: activitiesPayload,
    });

    const memberNameMap = new Map<number, string>([
      [101, 'Nguyễn Minh Triều'],
      [102, 'Lê Quốc Bảo'],
    ]);

    await useNotificationStore.getState().syncWithBackend(5, {
      userScope: scopeA,
      memberNameMap,
    });

    const synced = useNotificationStore.getState().notifications;
    // Loại bỏ MILESTONE_PROGRESS & teamId 999 -> giữ 1 alert thật (#2) + 8 event mới nhất (#10..#3)
    expect(synced.some((n) => n.id === 'alert-5-1')).toBe(false);
    expect(synced.some((n) => n.id === 'alert-5-3')).toBe(false);

    const customAlert = synced.find((n) => n.id === 'alert-5-2');
    expect(customAlert).toBeDefined();
    expect(customAlert?.title).toBe('Nhắc nhở tiến độ · Lê Quốc Bảo');
    expect(customAlert?.message).toBe('Cần hoàn thành trong tối nay');
    expect(customAlert?.authorName).toBe('Nhóm trưởng (Nguyễn Minh Triều)');

    // Sự kiện mới nhất (#10) phải có mặt và dùng đúng tên thành viên thay vì "Thành viên #N"
    const latestEvent = synced.find((n) => n.id === 'act-5-10');
    expect(latestEvent).toBeDefined();
    expect(latestEvent?.authorName).toBe('Lê Quốc Bảo');
    expect(synced.some((n) => n.id === 'act-5-1')).toBe(false);
    expect(synced.every((n) => !n.authorName?.startsWith('Thành viên #'))).toBe(true);

    expect(useNotificationStore.getState().hasUnseenBadge).toBe(true);

    // Người dùng bấm chuông để xem -> badge biến mất, và sync lại dữ liệu y hệt KHÔNG bật lại badge
    useNotificationStore.getState().markBellAsSeen();
    expect(useNotificationStore.getState().hasUnseenBadge).toBe(false);

    await useNotificationStore.getState().syncWithBackend(5, {
      userScope: scopeA,
      memberNameMap,
    });
    expect(useNotificationStore.getState().hasUnseenBadge).toBe(false);

    // Xóa 1 thông báo -> sync lại cũng không bị hồi sinh
    useNotificationStore.getState().removeNotification('act-5-10');
    expect(useNotificationStore.getState().notifications.some((n) => n.id === 'act-5-10')).toBe(false);

    await useNotificationStore.getState().syncWithBackend(5, {
      userScope: scopeA,
      memberNameMap,
    });
    expect(useNotificationStore.getState().notifications.some((n) => n.id === 'act-5-10')).toBe(false);

    // Xuất hiện alert hoàn toàn mới (#99) -> badge sáng lại
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          ...alertsPayload,
          {
            id: 99,
            teamId: 5,
            userId: 102,
            userName: 'Lê Quốc Bảo',
            alertType: 'OVERDUE_TASK',
            severity: 'CRITICAL',
            message: 'Cảnh báo mới phát sinh.',
            resolved: false,
            createdAt: '2026-11-20T15:00:00',
          },
        ],
      },
    });

    await useNotificationStore.getState().syncWithBackend(5, {
      userScope: scopeA,
      memberNameMap,
    });
    expect(useNotificationStore.getState().notifications.some((n) => n.id === 'alert-5-99')).toBe(true);
    expect(useNotificationStore.getState().hasUnseenBadge).toBe(true);
  });
});
