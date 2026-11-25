import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, CheckCircle2, AlertCircle, Check, Kanban, Layers, Users } from 'lucide-react';
import { teamApi } from '../../api/team.api';

export interface ConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  onSuccess: () => void;
}

const DATA_SCOPES = [
  {
    title: 'Hoạt động trên Bảng công việc (Task Board)',
    desc: 'Ghi nhận thời gian tạo, phân công, chuyển trạng thái và hoàn thành thẻ công việc trên bảng nội bộ của dự án.',
    icon: <Kanban size={13} className="text-sky-400 shrink-0 mt-0.5" />,
  },
  {
    title: 'Tổng hợp & đối soát tỷ lệ đóng góp',
    desc: 'Tính toán khối lượng hoàn thành, khai báo đóng góp và nhật ký truy vết nguồn gốc trên bảng điều khiển chung của dự án.',
    icon: <Layers size={13} className="text-indigo-400 shrink-0 mt-0.5" />,
  },
  {
    title: 'Đánh giá chéo ẩn danh (Peer Review)',
    desc: 'Thu thập điểm và nhận xét đánh giá giữa các thành viên, hiển thị ở dạng điểm tổng hợp ẩn danh nhằm bảo vệ danh tính người chấm.',
    icon: <Users size={13} className="text-emerald-400 shrink-0 mt-0.5" />,
  },
];

export const ConsentDialog: React.FC<ConsentDialogProps> = ({
  isOpen,
  onClose,
  teamId,
  onSuccess,
}) => {
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setErrorMsg(null);
    try {
      setLoading(true);
      await teamApi.submitConsent(teamId, { consented: true });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 1000);
    } catch {
      setErrorMsg('Không thể lưu xác nhận đồng thuận. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const dialogContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#121318] border border-zinc-800 rounded-xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">
                Đồng thuận Dữ liệu cá nhân (Consent)
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                Tuân thủ Nghị định 13/2023/NĐ-CP • Bảo vệ dữ liệu đồ án
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md"
          >
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={20} />
            </div>
            <h4 className="font-medium text-xs text-zinc-100">Đã cập nhật đồng thuận thành công!</h4>
            <p className="text-xs text-zinc-400 font-mono">
              Chính sách chia sẻ minh chứng đã được đồng bộ với hệ thống nhóm.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex items-start gap-2.5">
              <AlertCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Hệ thống FairShare chỉ thu thập và xử lý 3 nhóm dữ liệu thực tế dưới đây để phục vụ đối soát đóng góp trong phạm vi dự án.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Read-only list of real collected data scopes */}
            <div className="space-y-2">
              {DATA_SCOPES.map((scope) => (
                <div
                  key={scope.title}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800"
                >
                  {scope.icon}
                  <div className="flex-1">
                    <div className="text-xs font-medium text-zinc-200">{scope.title}</div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{scope.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Single genuine consent checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/25 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded bg-zinc-850 border-zinc-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-zinc-200 leading-relaxed">
                Tôi đã đọc, hiểu và đồng ý cho hệ thống xử lý 3 nhóm dữ liệu trên trong phạm vi dự án này.
              </span>
            </label>

            {/* Rights Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <Check size={11} /> Tuân thủ Nghị định 13/2023/NĐ-CP
              </span>
              <span>Có thể rút lại bất kỳ lúc nào</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!agreed || loading}
                className="px-4 py-2 text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Xác nhận đồng ý'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
