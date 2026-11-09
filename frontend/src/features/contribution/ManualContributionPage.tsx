import React, { useState } from 'react';
import { ManualContributionForm } from '../dashboard/ManualContributionForm';
import { PendingContributionsList } from '../dashboard/PendingContributionsList';
import { ManualContributionItem } from '../../types/contribution';
import { Sparkles, ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEMO_USERS = [
  { id: 4, name: 'Trọng Phúc (Frontend)', role: 'FE' },
  { id: 2, name: 'Ngọc Thiện (BA)', role: 'BA' },
  { id: 3, name: 'Phúc Vương (Backend)', role: 'BE' },
  { id: 1, name: 'Minh Triều (Leader)', role: 'Lead' },
];

export const ManualContributionPage: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<number>(4);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleFormSuccess = (newItem: ManualContributionItem) => {
    setRefreshTrigger((prev) => prev + 1);
    setSuccessBanner(
      `Đã thêm công việc "${newItem.taskName}" (${newItem.storyPoints} SP) vào hàng đợi xét duyệt!`
    );
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleReviewed = (item: ManualContributionItem, action: 'APPROVE' | 'REJECT') => {
    setSuccessBanner(
      `Đã ${action === 'APPROVE' ? 'DUYỆT' : 'TỪ CHỐI'} đóng góp "${item.taskName}". Hệ thống đã cập nhật số liệu!`
    );
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="manual-contribution-page">
      {/* Header Điều hướng & Tiêu đề */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Khai báo & Xét duyệt đóng góp thủ công
              </h1>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                CR-02 & M3
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Ghi nhận công việc ngoài Task Board (Figma, SRS, Tech Research) và xét duyệt chéo chống gian lận
            </p>
          </div>
        </div>

        {/* User Switcher phục vụ kiểm thử Anti-Fraud linh hoạt */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs shadow-sm">
          <UserCheck className="h-4 w-4 text-indigo-400" />
          <span className="text-slate-400">Đang thao tác với tư cách:</span>
          <select
            data-testid="user-switcher-select"
            value={currentUserId}
            onChange={(e) => setCurrentUserId(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
          >
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Thông báo banner khi thao tác thành công */}
      {successBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300 shadow-md">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Anti-Fraud Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-slate-300">
        <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Quy tắc chống gian lận (Anti-Fraud Gate)</p>
          <p className="text-slate-400 leading-relaxed">
            Hệ thống không cho phép thành viên tự duyệt hoặc tự cho điểm đóng góp của chính mình (<code className="text-indigo-300">currentUserId === item.userId</code>). Mọi đóng góp bắt buộc phải được thành viên khác trong nhóm kiểm tra minh chứng trước khi tích hợp vào điểm tổng kết trên Dashboard.
          </p>
        </div>
      </div>

      {/* Grid 2 cột: Bên trái Form khai báo - Bên phải Danh sách chờ duyệt */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ManualContributionForm
            teamId={1}
            sprintId={4}
            userId={currentUserId}
            onSuccess={handleFormSuccess}
          />
        </div>

        <div className="lg:col-span-7">
          <PendingContributionsList
            teamId={1}
            sprintId={4}
            currentUserId={currentUserId}
            refreshTrigger={refreshTrigger}
            onReviewed={handleReviewed}
          />
        </div>
      </div>
    </div>
  );
};
