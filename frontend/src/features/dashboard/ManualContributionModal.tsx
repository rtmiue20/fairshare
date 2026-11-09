import React, { useState } from 'react';
import { ManualContributionForm } from './ManualContributionForm';
import { PendingContributionsList } from './PendingContributionsList';
import { ManualContributionItem } from '../../types/contribution';
import { X, Sparkles, FileEdit, CheckSquare, ShieldCheck } from 'lucide-react';

export interface ManualContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  sprintId: number;
  currentUserId: number;
  onContributionApproved?: (item: ManualContributionItem) => void;
}

export const ManualContributionModal: React.FC<ManualContributionModalProps> = ({
  isOpen,
  onClose,
  teamId,
  sprintId,
  currentUserId,
  onContributionApproved,
}) => {
  const [activeTab, setActiveTab] = useState<'SUBMIT' | 'REVIEW'>('REVIEW');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!isOpen) return null;

  const handleFormSuccess = () => {
    // Tự động chuyển qua tab Review và refresh danh sách
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('REVIEW');
  };

  const handleReviewed = (item: ManualContributionItem, action: 'APPROVE' | 'REJECT') => {
    if (action === 'APPROVE' && onContributionApproved) {
      onContributionApproved(item);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="manual-contribution-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Khai báo & Xét duyệt đóng góp thủ công
                </h2>
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                  Sprint {sprintId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ghi nhận minh chứng nghiên cứu, thiết kế Figma, SRS ngoài Task Board kèm xác nhận chống gian lận
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3">
          <button
            onClick={() => setActiveTab('REVIEW')}
            data-testid="tab-review"
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'REVIEW'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Danh sách chờ duyệt (Pending Review)</span>
          </button>

          <button
            onClick={() => setActiveTab('SUBMIT')}
            data-testid="tab-submit"
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'SUBMIT'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileEdit className="h-4 w-4" />
            <span>Khai báo công việc mới</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Anti-Fraud Banner */}
          <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-2.5 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-400" />
            <span>
              <strong>Ràng buộc hệ thống:</strong> Mọi đóng góp ngoài board bắt buộc phải có link minh chứng hợp lệ và phải được một thành viên khác trong nhóm xét duyệt trước khi tính điểm vào Dashboard.
            </span>
          </div>

          {activeTab === 'REVIEW' ? (
            <PendingContributionsList
              teamId={teamId}
              sprintId={sprintId}
              currentUserId={currentUserId}
              onReviewed={handleReviewed}
              refreshTrigger={refreshTrigger}
            />
          ) : (
            <ManualContributionForm
              teamId={teamId}
              sprintId={sprintId}
              userId={currentUserId}
              onSuccess={handleFormSuccess}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-6 py-3 text-xs text-slate-400">
          <span>Người dùng đang đăng nhập: <strong>User #{currentUserId}</strong></span>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
