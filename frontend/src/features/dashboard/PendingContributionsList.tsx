import React, { useEffect, useState, useCallback } from 'react';
import { contributionApi } from '../../api/contribution.api';
import { ManualContributionItem } from '../../types/contribution';
import {
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export interface MemberInfo {
  id: number;
  name: string;
  role?: string;
  fullName?: string;
}

export interface PendingContributionsListProps {
  teamId: number;
  sprintId?: number;
  currentUserId: number;
  members?: MemberInfo[];
  onReviewed?: (item: ManualContributionItem, action: 'APPROVE' | 'REJECT') => void;
  refreshTrigger?: number;
}

export const PendingContributionsList: React.FC<PendingContributionsListProps> = ({
  teamId,
  sprintId = 1,
  currentUserId,
  members = [],
  onReviewed,
  refreshTrigger = 0,
}) => {
  const [items, setItems] = useState<ManualContributionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [statusNotification, setStatusNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchPendingItems = useCallback(async () => {
    setIsLoading(true);
    setStatusNotification(null);
    try {
      const response = await contributionApi.getPendingManualContributions(teamId, sprintId);
      if (response && response.data && Array.isArray(response.data)) {
        setItems(response.data);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, sprintId]);

  useEffect(() => {
    fetchPendingItems();
  }, [fetchPendingItems, refreshTrigger]);

  const handleReview = async (item: ManualContributionItem, action: 'APPROVE' | 'REJECT') => {
    // Client-side Anti-Fraud guard
    if (item.userId === currentUserId) {
      setStatusNotification({
        type: 'error',
        text: 'Quy tắc Anti-Fraud: Bạn không được phép tự duyệt bài đóng góp của chính mình!',
      });
      return;
    }

    setReviewingId(item.id);
    setStatusNotification(null);

    try {
      await contributionApi.reviewManualContribution(item.id, currentUserId, action);

      // Cập nhật danh sách sau khi review
      setItems((prev) => prev.filter((i) => i.id !== item.id));

      const actionText = action === 'APPROVE' ? 'đã được DUYỆT thành công' : 'đã bị TỪ CHỐI';
      setStatusNotification({
        type: 'success',
        text: `Đóng góp "${item.taskName}" ${actionText}! Hệ thống đã cập nhật vào Audit Trail.`,
      });

      if (onReviewed) {
        onReviewed(item, action);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi xét duyệt đóng góp. Vui lòng thử lại.';
      setStatusNotification({
        type: 'error',
        text: msg,
      });
    } finally {
      setReviewingId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Gần đây';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'TV';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const currentUserMember = members.find((m) => m.id === currentUserId);
  const currentUserName = currentUserMember?.name || currentUserMember?.fullName || (currentUserId ? `User #${currentUserId}` : 'Tôi');

  return (
    <div
      data-testid="pending-contributions-container"
      className="flex flex-col gap-4 rounded-xl border border-zinc-800/80 bg-[#121318] p-5 sm:p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Danh sách đóng góp đang chờ duyệt (Pending Review)
            </h3>
            <p className="text-xs text-zinc-400">
              Xét duyệt chéo giữa các thành viên đảm bảo tính khách quan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 font-mono">
            {items.length} mục chờ duyệt
          </span>
          <span className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300 font-mono">
            Tài khoản: <strong className="text-zinc-100">{currentUserName}</strong>
          </span>
        </div>
      </div>

      {/* Thông báo trạng thái xét duyệt */}
      {statusNotification && (
        <div
          data-testid="review-status-notification"
          className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-medium ${
            statusNotification.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {statusNotification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{statusNotification.text}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div
          data-testid="pending-contributions-loading"
          className="flex flex-col items-center justify-center gap-2 py-12 text-zinc-500"
        >
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          <span className="text-xs font-mono">Đang tải danh sách đóng góp chờ duyệt...</span>
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div
          data-testid="pending-contributions-empty"
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-12 text-center"
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-850 text-zinc-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-zinc-200">Không có đóng góp nào đang chờ duyệt</p>
          <p className="mt-1 text-[11px] text-zinc-500 max-w-sm">
            Tất cả các minh chứng ngoài Task Board của Sprint này đã được xét duyệt đầy đủ.
          </p>
        </div>
      ) : (
        /* Danh sách items */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="pending-contributions-table">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-400">
                <th className="pb-2.5 pl-2">Người khai báo</th>
                <th className="pb-2.5">Tên công việc & Minh chứng</th>
                <th className="pb-2.5 text-center">Story Points</th>
                <th className="pb-2.5">Thời gian gửi</th>
                <th className="pb-2.5 pr-2 text-right">Thao tác xét duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {items.map((item) => {
                const isOwner = item.userId === currentUserId;
                const isProcessing = reviewingId === item.id;
                const member = members.find((m) => m.id === item.userId);
                const memberName = member?.name || member?.fullName || `Thành viên #${item.userId}`;
                const memberRole = member?.role || 'Thành viên';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isOwner ? 'bg-indigo-950/10' : 'hover:bg-zinc-850/40'
                    }`}
                  >
                    {/* Cột 1: Người khai báo */}
                    <td className="py-3 pl-2 align-middle">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-md font-bold text-[10px] shrink-0 ${
                            isOwner
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                          }`}
                        >
                          {getInitials(memberName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-100 text-xs">
                              {memberName}
                            </span>
                            {isOwner && (
                              <span className="rounded bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.2 text-[9px] font-bold text-indigo-300 font-mono">
                                BẠN
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {memberRole}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Tên công việc & link minh chứng */}
                    <td className="max-w-xs py-3 pr-3 align-middle">
                      <div className="font-medium text-zinc-200 line-clamp-2">
                        {item.taskName}
                      </div>
                      {item.evidenceLink && (
                        <a
                          href={item.evidenceLink}
                          target="_blank"
                          rel="noreferrer"
                          data-testid={`evidence-link-${item.id}`}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-400 transition hover:text-sky-300 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {item.evidenceLink.replace(/^https?:\/\//, '')}
                          </span>
                        </a>
                      )}
                    </td>

                    {/* Cột 3: Story Points */}
                    <td className="py-3 text-center align-middle">
                      <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-300 font-mono">
                        <Sparkles className="h-3 w-3" />
                        +{Number(item.storyPoints).toFixed(1)} SP
                      </span>
                    </td>

                    {/* Cột 4: Thời gian gửi */}
                    <td className="py-3 text-[11px] text-zinc-500 font-mono align-middle whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>

                    {/* Cột 5: Hành động (Approve / Reject / Anti-Fraud Lock) */}
                    <td className="py-3 pr-2 text-right align-middle">
                      {isOwner ? (
                        /* Khóa Anti-Fraud: Chính chủ không được tự duyệt */
                        <div
                          data-testid={`anti-fraud-badge-${item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shadow-xs"
                          title="Bạn không thể tự duyệt bài của mình"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>Bạn không thể tự duyệt bài của mình</span>
                        </div>
                      ) : (
                        /* Nút Duyệt và Từ chối cho thành viên khác */
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleReview(item, 'APPROVE')}
                            disabled={isProcessing}
                            data-testid={`btn-approve-${item.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Duyệt</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReview(item, 'REJECT')}
                            disabled={isProcessing}
                            data-testid={`btn-reject-${item.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-600 hover:text-white disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span>Từ chối</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
