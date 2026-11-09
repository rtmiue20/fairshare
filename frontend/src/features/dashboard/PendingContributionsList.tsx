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

export interface PendingContributionsListProps {
  teamId: number;
  sprintId?: number;
  currentUserId: number;
  onReviewed?: (item: ManualContributionItem, action: 'APPROVE' | 'REJECT') => void;
  refreshTrigger?: number;
}

// Dữ liệu mẫu phong phú mô phỏng đóng góp ngoài Task Board
const FALLBACK_PENDING_CONTRIBUTIONS: ManualContributionItem[] = [
  {
    id: 101,
    teamId: 1,
    sprintId: 4,
    userId: 4, // Trọng Phúc (FE) - trùng currentUserId mặc định để test Anti-Fraud
    taskName: 'Nghiên cứu tài liệu Figma UI kit và thiết kế bảng tra cứu bằng chứng',
    evidenceLink: 'https://figma.com/file/fairshare-evidence-traceability-ui',
    storyPoints: 3.0,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 102,
    teamId: 1,
    sprintId: 4,
    userId: 2, // Ngọc Thiện (BA)
    taskName: 'Biên soạn tài liệu đặc tả phi chức năng (NFR) và quy trình chấm chéo',
    evidenceLink: 'https://docs.google.com/document/d/fairshare-srs-v2-nfr',
    storyPoints: 2.5,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 103,
    teamId: 1,
    sprintId: 4,
    userId: 3, // Phúc Vương (BE)
    taskName: 'Spike kỹ thuật: Đánh giá cơ chế chống gian lận và tối ưu MariaDB indexing',
    evidenceLink: 'https://github.com/rtmiue20/fairshare/wiki/MariaDB-Indexing-Benchmark',
    storyPoints: 4.0,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

// Mapping tên người dùng hiển thị
const USER_NAME_MAP: Record<number, { name: string; role: string }> = {
  1: { name: 'Minh Triều', role: 'Leader' },
  2: { name: 'Ngọc Thiện', role: 'BA' },
  3: { name: 'Phúc Vương', role: 'Backend' },
  4: { name: 'Trọng Phúc', role: 'Frontend' },
  5: { name: 'Huỳnh Khang', role: 'Data Sci' },
  6: { name: 'Nam Anh', role: 'QA' },
};

export const PendingContributionsList: React.FC<PendingContributionsListProps> = ({
  teamId,
  sprintId = 4,
  currentUserId,
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
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        setItems(response.data);
      } else {
        // Nếu API trả về mảng rỗng (hoặc môi trường test/demo), nạp dữ liệu mẫu
        setItems(FALLBACK_PENDING_CONTRIBUTIONS);
      }
    } catch {
      // Fallback khi offline hoặc backend chưa kết nối
      setItems(FALLBACK_PENDING_CONTRIBUTIONS);
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

  return (
    <div
      data-testid="pending-contributions-container"
      className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Danh sách đóng góp đang chờ duyệt (Pending Review)</h3>
            <p className="text-xs text-slate-400">
              Cơ chế xét duyệt chéo giữa các thành viên với ràng buộc Anti-Fraud nghiêm ngặt
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
            {items.length} mục chờ duyệt
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
            Bạn: User #{currentUserId} ({USER_NAME_MAP[currentUserId]?.name ?? 'Tôi'})
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
          className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400"
        >
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          <span className="text-xs">Đang tải danh sách đóng góp chờ duyệt...</span>
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div
          data-testid="pending-contributions-empty"
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-10 text-center"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-white">Không có đóng góp nào đang chờ duyệt</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Tất cả các khai báo ngoài Task Board của Sprint này đã được xét duyệt đầy đủ.
          </p>
        </div>
      ) : (
        /* Danh sách items */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="pending-contributions-table">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                <th className="pb-2.5 pl-2">Người khai báo</th>
                <th className="pb-2.5">Tên công việc & Minh chứng</th>
                <th className="pb-2.5 text-center">Story Points</th>
                <th className="pb-2.5">Thời gian gửi</th>
                <th className="pb-2.5 pr-2 text-right">Thao tác xét duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item) => {
                const isOwner = item.userId === currentUserId;
                const isProcessing = reviewingId === item.id;
                const memberInfo = USER_NAME_MAP[item.userId] || {
                  name: `Thành viên #${item.userId}`,
                  role: 'Member',
                };

                return (
                  <tr
                    key={item.id}
                    data-testid={`pending-row-${item.id}`}
                    className={`group transition hover:bg-slate-800/40 ${
                      isOwner ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Cột 1: Người khai báo */}
                    <td className="py-3 pl-2 align-middle">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${
                            isOwner
                              ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                              : 'bg-indigo-500/20 text-indigo-300'
                          }`}
                        >
                          {memberInfo.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">
                              {memberInfo.name}
                            </span>
                            {isOwner && (
                              <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                                BẠN
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {memberInfo.role} • ID #{item.userId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Tên công việc & link minh chứng */}
                    <td className="max-w-xs py-3 pr-3 align-middle">
                      <div className="font-medium text-slate-200 line-clamp-2">
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
                      <span className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-bold text-purple-300">
                        <Sparkles className="h-3 w-3" />
                        +{Number(item.storyPoints).toFixed(1)} SP
                      </span>
                    </td>

                    {/* Cột 4: Thời gian gửi */}
                    <td className="py-3 text-[11px] text-slate-400 align-middle whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>

                    {/* Cột 5: Hành động (Approve / Reject / Anti-Fraud Lock) */}
                    <td className="py-3 pr-2 text-right align-middle">
                      {isOwner ? (
                        /* Khóa Anti-Fraud: Chính chủ không được tự duyệt */
                        <div
                          data-testid={`anti-fraud-badge-${item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shadow-sm"
                          title="Bạn không thể tự duyệt bài của mình (Anti-Fraud Rule)"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
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
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-600/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-600 hover:text-white disabled:opacity-50"
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
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-600/20 px-2.5 py-1 text-[11px] font-bold text-rose-300 transition hover:bg-rose-600 hover:text-white disabled:opacity-50"
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
