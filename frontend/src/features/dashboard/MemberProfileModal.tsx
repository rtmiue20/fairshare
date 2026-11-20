import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  User,
  GraduationCap,
  Sparkles,
  Check,
  Share2,
  X,
  ArrowRight,
} from 'lucide-react';
import { CuteAvatarSvg } from './ContributionDashboard';
import { showToast } from '../../components/ui/Toast';

export interface MemberProfileModalData {
  id: number;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  studentId?: string;
  major?: string;
  teamRole?: string;
  bio?: string;
  avatarUrl?: string | null;
  pct: string;
  compositeScore: number;
  tasks: number;
  edits: number;
  peer: number;
  d1: number;
  onTime: number;
  availabilityFactor: number;
}

export interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberProfileModalData;
  projectName?: string;
  courseName?: string;
  sprintLabel?: string;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  isOpen,
  onClose,
  member,
  projectName = 'EduConnect',
  courseName = 'Quản lý Dự án Công nghệ Thông tin',
  sprintLabel = 'Sprint 3',
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleShareMember = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('memberId', String(member.id));
      const directUrl = url.toString();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(directUrl).then(() => {
          showToast.success(`Đã sao chép liên kết chia sẻ hồ sơ ${member.name} vào khay nhớ tạm!`, 'Chia sẻ hồ sơ');
        });
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = directUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast.success(`Đã sao chép liên kết chia sẻ hồ sơ ${member.name} vào khay nhớ tạm!`, 'Chia sẻ hồ sơ');
      }

      window.history.replaceState(null, '', directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error('Không thể sao chép liên kết.', 'Lỗi');
    }
  };

  const displayMajor = member.major || 'Software Engineering';
  const displayRole = member.teamRole || member.role || 'Project Manager';
  const displaySubline = [
    displayMajor,
    displayRole,
    member.studentId ? `MSSV: ${member.studentId}` : member.email || '',
  ]
    .filter(Boolean)
    .join(' | ');

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-profile-modal-title"
    >
      <div
        className="bg-white dark:bg-[#181a24] rounded-3xl p-5 sm:p-7 max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto my-auto shadow-2xl border border-slate-200/80 dark:border-white/10 relative flex flex-col gap-4 sm:gap-5 text-left transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar: Ảnh thật hoặc Cute avatar hoạt hình */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-200/80 dark:border-white/10 shadow-xs bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <CuteAvatarSvg index={member.id} className="w-full h-full object-contain p-1.5" />
              )}
            </div>

            {/* Tên thành viên & Dòng mô tả chuyên môn */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3
                  id="member-profile-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate"
                >
                  {member.name}
                </h3>
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white shrink-0 shadow-xs"
                  title="Thành viên đã xác thực"
                >
                  <Check size={11} strokeWidth={3.5} />
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                {displaySubline}
              </p>
            </div>
          </div>

          {/* Nút Chia sẻ hồ sơ & Nút đóng */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleShareMember}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              title="Chia sẻ liên kết trực tiếp tới hồ sơ thành viên"
              aria-label="Chia sẻ hồ sơ thành viên"
            >
              {copied ? (
                <Check size={18} className="text-emerald-500" />
              ) : (
                <Share2 size={18} />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              title="Đóng"
              aria-label="Đóng popup hồ sơ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── THÔNG TIN DỰ ÁN & VAI TRÒ (3 CỘT THEO MẪU COMPANY INFORMATION) ── */}
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-wider">
            Thông tin dự án &amp; Chuyên môn
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
            {/* Cột 1: Dự án (Company) */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <Briefcase size={13} className="shrink-0" />
                <span className="truncate">Dự án</span>
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {projectName}
                </span>
              </div>
            </div>

            {/* Cột 2: Vai trò (Role) */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <User size={13} className="shrink-0" />
                <span className="truncate">Vai trò</span>
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {displayRole}
              </span>
            </div>

            {/* Cột 3: Chuyên ngành / Địa điểm (Location) */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <GraduationCap size={13} className="shrink-0" />
                <span className="truncate">Chuyên ngành</span>
              </span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {displayMajor}
                </span>
                <Sparkles size={11} className="text-amber-500 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* ── TÓM TẮT ĐÓNG GÓP & AI SUMMARY ── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-white">
              <Sparkles size={14} className="text-indigo-500" />
              <span>Tóm tắt năng lực &amp; đóng góp</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white shadow-xs">
              Powered by AI
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {member.bio ? (
              <p className="mb-2 italic text-slate-700 dark:text-slate-200 font-medium">
                "{member.bio}"
              </p>
            ) : null}
            <p>
              Thành viên <strong>{member.name}</strong> đảm nhận vai trò <strong>{displayRole}</strong> trong đồ án{' '}
              <strong>{projectName}</strong> ({courseName}). Trong <strong>{sprintLabel}</strong>, thành viên đạt tỷ lệ đóng góp{' '}
              <strong>{member.pct}%</strong>, điểm năng lực tổng hợp <strong>{Number(member.compositeScore).toFixed(1)} (C_i)</strong>,
              hoàn thành <strong>{member.tasks} tasks</strong> với độ tin cậy đúng hạn <strong>{member.onTime}%</strong> và{' '}
              <strong>{member.edits} sự kiện minh chứng</strong> ghi nhận trên hệ thống. Hệ số khả dụng duy trì ở mức{' '}
              <strong>{Number(member.availabilityFactor).toFixed(2)}</strong> thể hiện hiệu suất ổn định và cam kết cao.
            </p>
          </div>
        </div>

        {/* ── FOOTER: THÔNG TIN TÀI KHOẢN & HÀNH ĐỘNG ── */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] font-semibold">Mã: #{member.id}</span>
            {member.email && <span className="truncate max-w-[170px]">· {member.email}</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Đóng
            </button>
            <Link
              to="/profile"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm hover:opacity-90 transition flex items-center gap-1.5"
            >
              <span>Hồ sơ chi tiết</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
