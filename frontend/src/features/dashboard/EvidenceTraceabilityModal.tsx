import React, { useEffect } from 'react';
import { EvidenceItemDto } from '../../types/contribution';
import { EvidenceTable } from './EvidenceTable';
import { X, ShieldCheck, Loader2, FileQuestion, Layers, Award, Sparkles } from 'lucide-react';

export interface EvidenceTraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  evidenceData: EvidenceItemDto[];
  selectedUserName: string;
  selectedUserId?: number;
  sprintId?: number;
  finalPct?: number;
}

export const EvidenceTraceabilityModal: React.FC<EvidenceTraceabilityModalProps> = ({
  isOpen,
  onClose,
  loading,
  evidenceData,
  selectedUserName,
  selectedUserId,
  sprintId,
  finalPct,
}) => {
  // Lắng nghe phím Esc để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Tính toán nhanh tổng Story Points và tổng điểm thực nhận
  const totalSP = evidenceData.reduce((acc, item) => acc + Number(item.storyPoints || 0), 0);
  const totalEarnedScore = evidenceData.reduce((acc, item) => acc + Number(item.earnedScore || 0), 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="evidence-traceability-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop mờ tối */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Khung Modal chính */}
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl transition-all">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Bằng chứng truy vết đóng góp (Audit Trail)
                </h3>
                {typeof sprintId === 'number' && (
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                    Sprint {sprintId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Thành viên:{' '}
                <strong className="text-sky-400">{selectedUserName}</strong>
                {typeof selectedUserId === 'number' && (
                  <span className="text-slate-500"> (ID: #{selectedUserId})</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {finalPct != null && (
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Tỷ lệ đóng góp</span>
                <span className="text-sm font-extrabold text-sky-400">{Number(finalPct).toFixed(1)}%</span>
              </div>
            )}
            <button
              onClick={onClose}
              data-testid="modal-close-button"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Thống kê nhanh chỉ số khi có dữ liệu */}
        {!loading && evidenceData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 border-b border-slate-800/80 bg-slate-950/40 px-6 py-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">Số sự kiện:</span>
              <span className="text-xs font-bold text-white">{evidenceData.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400">Tổng Story Points:</span>
              <span className="text-xs font-bold text-amber-300">{totalSP} SP</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Tổng điểm thực nhận:</span>
              <span className="text-xs font-bold text-emerald-400">+{totalEarnedScore.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Nội dung Modal (Body) */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Trạng thái 1: Đang tải dữ liệu (Loading Skeleton & Spinner) */}
          {loading && (
            <div
              data-testid="modal-loading"
              className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <div>
                <p className="text-sm font-semibold text-white">Đang truy xuất bằng chứng gốc...</p>
                <p className="mt-1 text-xs text-slate-400">
                  Truy vấn dữ liệu thời gian thực từ cơ sở dữ liệu nội bộ
                </p>
              </div>

              {/* Skeleton Table Placeholder */}
              <div className="mt-4 w-full space-y-2">
                <div className="h-8 w-full animate-pulse rounded-lg bg-slate-800/60" />
                <div className="h-8 w-full animate-pulse rounded-lg bg-slate-800/40" />
                <div className="h-8 w-full animate-pulse rounded-lg bg-slate-800/30" />
              </div>
            </div>
          )}

          {/* Trạng thái 2: Không có dữ liệu (Empty State) */}
          {!loading && evidenceData.length === 0 && (
            <div
              data-testid="modal-empty-state"
              className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
                <FileQuestion className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="text-base font-semibold text-white">
                Không có sự kiện gốc nào được ghi nhận
              </h4>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                Thành viên <span className="text-slate-300 font-medium">{selectedUserName}</span> chưa có thẻ công việc nào trên Task Board nội bộ hoặc bản khai báo thủ công nào trong Sprint này.
              </p>
            </div>
          )}

          {/* Trạng thái 3: Hiển thị bảng EvidenceTable */}
          {!loading && evidenceData.length > 0 && (
            <EvidenceTable items={evidenceData} />
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/60 px-6 py-3.5">
          <p className="text-[11px] text-slate-500">
            * Dữ liệu được ghi nhận tự động từ Task Board nội bộ (ActivityEvent nguồn BOARD) – Chống chỉnh sửa lịch sử (CR-02).
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};