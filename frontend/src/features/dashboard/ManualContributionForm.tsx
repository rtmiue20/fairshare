import React, { useState } from 'react';
import { contributionApi } from '../../api/contribution.api';
import { ManualContributionItem, ManualContributionRequest } from '../../types/contribution';
import { Send, Loader2, Sparkles, Link as LinkIcon, CheckCircle2, AlertCircle } from 'lucide-react';

export interface ManualContributionFormProps {
  teamId: number;
  sprintId: number;
  userId: number;
  onSuccess?: (newItem: ManualContributionItem) => void;
}

export const ManualContributionForm: React.FC<ManualContributionFormProps> = ({
  teamId,
  sprintId,
  userId,
  onSuccess,
}) => {
  const [taskName, setTaskName] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [storyPoints, setStoryPoints] = useState<number | string>(3.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const parsedSP = Number(storyPoints);
    if (!taskName.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập tên công việc đóng góp.' });
      return;
    }
    if (!evidenceLink.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng cung cấp link minh chứng (Docs, Figma, v.v.).' });
      return;
    }
    if (isNaN(parsedSP) || parsedSP <= 0) {
      setStatusMessage({ type: 'error', text: 'Story Points ước lượng phải là số dương lớn hơn 0.' });
      return;
    }

    const payload: ManualContributionRequest = {
      taskName: taskName.trim(),
      evidenceLink: evidenceLink.trim(),
      storyPoints: parsedSP,
    };

    setIsSubmitting(true);
    try {
      const response = await contributionApi.submitManualContribution(teamId, sprintId, userId, payload);
      const createdItem = response.data;

      setStatusMessage({
        type: 'success',
        text: 'Đã gửi khai báo đóng góp thành công! Bản ghi đang ở trạng thái chờ duyệt (PENDING).',
      });
      // Clear form
      setTaskName('');
      setEvidenceLink('');
      setStoryPoints(3.0);

      if (onSuccess && createdItem) {
        onSuccess(createdItem);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi khai báo. Vui lòng thử lại sau.';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="manual-contribution-form-container"
      className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Khai báo đóng góp ngoài Task Board</h3>
            <p className="text-xs text-slate-400">
              Ghi nhận công việc nghiên cứu, viết tài liệu SRS hoặc thiết kế Figma
            </p>
          </div>
        </div>
        <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
          Sprint {sprintId}
        </span>
      </div>

      {statusMessage && (
        <div
          data-testid="form-status-message"
          className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
        data-testid="manual-contribution-form"
      >
        {/* Tên công việc */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="manual-task-name" className="text-xs font-semibold text-slate-300">
            Tên công việc <span className="text-rose-400">*</span>
          </label>
          <input
            id="manual-task-name"
            data-testid="input-task-name"
            type="text"
            required
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Ví dụ: Thiết kế Prototype Figma và bộ màu Design System cho Dashboard"
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Link minh chứng */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="manual-evidence-link" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Link minh chứng (Figma / Docs / Drive) <span className="text-rose-400">*</span></span>
            <span className="text-[11px] text-slate-500 font-normal">URL công khai để nhóm đối chiếu</span>
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-500" />
            <input
              id="manual-evidence-link"
              data-testid="input-evidence-link"
              type="url"
              required
              value={evidenceLink}
              onChange={(e) => setEvidenceLink(e.target.value)}
              placeholder="https://docs.google.com/document/d/... hoặc https://figma.com/file/..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Story Points */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="manual-story-points" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Story Points / Điểm ước lượng <span className="text-rose-400">*</span></span>
            <span className="text-[11px] font-bold text-amber-300 font-mono">
              {Number(storyPoints) > 0 ? `+${Number(storyPoints).toFixed(1)} SP` : '0 SP'}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <input
              id="manual-story-points"
              data-testid="input-story-points"
              type="number"
              required
              min="0.5"
              max="21"
              step="0.5"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              className="w-32 rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-1.5 text-xs">
              {[1, 2, 3, 5, 8].map((pts) => (
                <button
                  key={pts}
                  type="button"
                  onClick={() => setStoryPoints(pts)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    Number(storyPoints) === pts
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {pts} SP
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="btn-submit-manual-contribution"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-3 text-xs font-bold text-white shadow-lg transition hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Đang lưu vào hàng đợi CSDL...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Gửi khai báo (Trạng thái: PENDING)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
