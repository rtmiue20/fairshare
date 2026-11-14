import React, { useState, useEffect, useCallback } from 'react';
import { X, Minus, Copy, Check, Loader2, ShieldAlert } from 'lucide-react';
import { TeamMember } from '../../types/team';
import { teamApi } from '../../api/team.api';
import { showToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  projectName?: string;
  inviteCode?: string;
  onMemberUpdated?: () => void;
}

// Pastel backgrounds matching Image 2
const AVATAR_PALETTES = [
  { bg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8' }, // Pink
  { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' }, // Mint / Green
  { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' }, // Light Blue
  { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' }, // Lavender / Purple
  { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }, // Warm Amber
  { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' }, // Peach
];

// Memoji SVGs reminiscent of Image 2 3D characters
const MEMOJI_VARIANTS = [
  // 1. Bearded character (Jesse style)
  () => (
    <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7">
      <circle cx="18" cy="18" r="14" fill="#FBBF24" opacity="0.3" />
      <circle cx="18" cy="18" r="11" fill="#F6D5B8" />
      {/* Hair */}
      <path d="M10 16C10 11 13 8 18 8C23 8 26 11 26 16C26 17 25 15 23 13C20 11 16 11 13 13C11 15 10 17 10 16Z" fill="#78350F" />
      {/* Eyes */}
      <circle cx="14" cy="17" r="1.5" fill="#1E293B" />
      <circle cx="22" cy="17" r="1.5" fill="#1E293B" />
      {/* Smile */}
      <path d="M15 22C16 23.5 20 23.5 21 22" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
      {/* Beard */}
      <path d="M12 19C12 25 14 27 18 27C22 27 24 25 24 19C24 23 21 25.5 18 25.5C15 25.5 12 23 12 19Z" fill="#92400E" />
    </svg>
  ),
  // 2. Glasses character (Ernest style)
  () => (
    <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7">
      <circle cx="18" cy="18" r="14" fill="#34D399" opacity="0.25" />
      <circle cx="18" cy="18" r="11" fill="#FBD6B5" />
      {/* Hair */}
      <path d="M11 15C11 10 14 7 18 7C22 7 25 10 25 15C24 13 22 12 18 12C14 12 12 13 11 15Z" fill="#1F2937" />
      {/* Round Glasses */}
      <circle cx="14" cy="17" r="3" stroke="#1F2937" strokeWidth="1.4" fill="#E0F2FE" fillOpacity="0.4" />
      <circle cx="22" cy="17" r="3" stroke="#1F2937" strokeWidth="1.4" fill="#E0F2FE" fillOpacity="0.4" />
      <line x1="17" y1="17" x2="19" y2="17" stroke="#1F2937" strokeWidth="1.4" />
      {/* Eyes */}
      <circle cx="14" cy="17" r="1.2" fill="#111827" />
      <circle cx="22" cy="17" r="1.2" fill="#111827" />
      {/* Smile */}
      <path d="M15.5 23C16.5 24 19.5 24 20.5 23" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  // 3. Beanie / Cap character (Kobe style)
  () => (
    <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7">
      <circle cx="18" cy="18" r="14" fill="#60A5FA" opacity="0.25" />
      <circle cx="18" cy="19" r="10.5" fill="#D2996E" />
      {/* Blue Beanie */}
      <path d="M11 16C11 10 14 7 18 7C22 7 25 10 25 16C25 17 11 17 11 16Z" fill="#3B82F6" />
      <rect x="10" y="15" width="16" height="3" rx="1.5" fill="#1D4ED8" />
      {/* Eyes */}
      <circle cx="14" cy="20" r="1.3" fill="#1E293B" />
      <circle cx="22" cy="20" r="1.3" fill="#1E293B" />
      {/* Smile & Beard */}
      <path d="M13 22C13 26 15 28 18 28C21 28 23 26 23 22C23 25 21 27 18 27C15 27 13 25 13 22Z" fill="#374151" />
      <path d="M16 23C17 24 19 24 20 23" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  // 4. Pompadour / Stylish dark hair character (John style)
  () => (
    <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7">
      <circle cx="18" cy="18" r="14" fill="#A855F7" opacity="0.25" />
      <circle cx="18" cy="19" r="11" fill="#F4CFB0" />
      {/* Voluminous Pompadour Hair */}
      <path d="M10 15C9 10 13 7 18 6C23 6 27 10 26 15C25 13 23 11 18 11C13 11 11 13 10 15Z" fill="#262626" />
      <circle cx="13" cy="13" r="2.5" fill="#262626" />
      <circle cx="23" cy="13" r="2.5" fill="#262626" />
      {/* Eyes */}
      <circle cx="14" cy="18" r="1.3" fill="#1E293B" />
      <circle cx="22" cy="18" r="1.3" fill="#1E293B" />
      {/* Stubble / Chin */}
      <path d="M15.5 23.5C16.5 24.5 19.5 24.5 20.5 23.5" stroke="#78350F" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
];

export const TeamMembersModal: React.FC<TeamMembersModalProps> = ({
  isOpen,
  onClose,
  teamId,
  projectName,
  inviteCode: propInviteCode,
  onMemberUpdated,
}) => {
  const { user: currentUser } = useAuthStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailChips, setEmailChips] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState<string>(propInviteCode || '');
  const [memberToDelete, setMemberToDelete] = useState<{ id: number; name: string } | null>(null);

  // Load members and team details from Database
  const fetchTeamData = useCallback(async () => {
    if (!teamId) return;
    setLoadingMembers(true);
    try {
      // 1. Fetch members from DB: GET /api/teams/{teamId}/members
      const membersRes = await teamApi.getMembers(teamId);
      if (membersRes?.data && Array.isArray(membersRes.data)) {
        setMembers(membersRes.data);
      }

      // 2. Fetch team detail to get latest inviteCode from DB
      const teamRes = await teamApi.getTeamById(teamId);
      if (teamRes?.data?.inviteCode) {
        setInviteCode(teamRes.data.inviteCode);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (isOpen && teamId) {
      fetchTeamData();
      if (propInviteCode) {
        setInviteCode(propInviteCode);
      }
    } else {
      setEmailInput('');
      setEmailChips([]);
      setMemberToDelete(null);
    }
  }, [isOpen, teamId, propInviteCode, fetchTeamData]);

  if (!isOpen) return null;

  // Add email chip on Enter or comma
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addEmailChip(emailInput);
    }
  };

  const addEmailChip = (val: string) => {
    const trimmed = val.trim().replace(/,/g, '');
    if (!trimmed) return;

    // Basic email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      showToast.error('Định dạng email không hợp lệ!', 'Cảnh báo');
      return;
    }

    if (!emailChips.includes(trimmed)) {
      setEmailChips([...emailChips, trimmed]);
    }
    setEmailInput('');
  };

  const removeChip = (emailToRemove: string) => {
    setEmailChips(emailChips.filter((e) => e !== emailToRemove));
  };

  // Invite member by email connecting to DB
  const handleInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // If user has text in input not yet added as chip, add it
    const allEmails = [...emailChips];
    if (emailInput.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(emailInput.trim())) {
        allEmails.push(emailInput.trim());
      } else {
        showToast.error('Email nhập vào không hợp lệ', 'Lỗi nhập liệu');
        return;
      }
    }

    if (allEmails.length === 0) {
      showToast.error('Vui lòng nhập email thành viên để mời', 'Thông báo');
      return;
    }

    setInviting(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const email of allEmails) {
      try {
        await teamApi.inviteMember(teamId, email);
        successCount++;
      } catch (err: unknown) {
        const errorMsg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        if (errorMsg && errorMsg.includes('User not found')) {
          errors.push(`Email "${email}" chưa có tài khoản trên hệ thống. Hãy gửi mã mời để bạn bè đăng ký!`);
        } else if (errorMsg && (errorMsg.includes('already a member') || errorMsg.includes('đã là thành viên'))) {
          errors.push(`"${email}" đã có trong nhóm!`);
        } else {
          errors.push(`Không thể mời "${email}": ${errorMsg || 'Lỗi kết nối'}`);
        }
      }
    }

    setInviting(false);
    setEmailInput('');
    setEmailChips([]);

    if (successCount > 0) {
      showToast.success(`Đã thêm thành công ${successCount} thành viên vào nhóm!`, 'Thành công');
      fetchTeamData();
      onMemberUpdated?.();
    }

    if (errors.length > 0) {
      errors.forEach((msg) => showToast.error(msg, 'Thông báo'));
    }
  };

  // Delete member from team connecting to DB
  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    const userId = memberToDelete.id;
    setDeletingUserId(userId);
    try {
      await teamApi.deleteMember(teamId, userId);
      showToast.success(`Đã xóa thành viên "${memberToDelete.name}" khỏi dự án.`);
      setMemberToDelete(null);
      await fetchTeamData();
      onMemberUpdated?.();
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      showToast.error(errorMsg || 'Không thể xóa thành viên. Hãy kiểm tra quyền hạn của bạn.');
    } finally {
      setDeletingUserId(null);
    }
  };

  // Copy project invite code
  const handleCopyInviteCode = () => {
    const code = inviteCode || propInviteCode || 'FS8F5661827D';
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      showToast.success(`Đã sao chép mã mời: ${code}`, 'Mã mời dự án');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Dialog Card matching Image 2 */}
      <div
        className="w-full bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 shadow-2xl transition-all"
        style={{
          maxWidth: '490px',
          borderRadius: '24px',
          border: '1px solid rgba(228, 228, 231, 0.8)',
          padding: '28px 28px 24px',
          position: 'relative',
        }}
      >
        {/* Header: Title + Close Button */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2
              className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-white"
              style={{ fontFamily: 'var(--f-body, system-ui, sans-serif)' }}
            >
              Add Members
            </h2>
            {projectName && (
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Dự án: <span className="font-semibold text-zinc-600 dark:text-zinc-300">{projectName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        {/* Section 1: Email Input */}
        <div className="mt-1">
          <label className="block text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
            Email
          </label>
          <form onSubmit={handleInvite} className="flex items-center gap-2.5">
            {/* Input field with chips inside */}
            <div
              className="flex-1 flex items-center flex-wrap gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/30 min-h-[44px]"
            >
              {emailChips.map((chip, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                >
                  <span className="truncate max-w-[140px]">{chip}</span>
                  <button
                    type="button"
                    onClick={() => removeChip(chip)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                placeholder={emailChips.length === 0 ? 'tonygfx@gmail.com' : 'Thêm email...'}
                className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 p-0.5"
              />
            </div>

            {/* Invite Button */}
            <button
              type="submit"
              disabled={inviting || (!emailInput.trim() && emailChips.length === 0)}
              className="px-5 py-2.5 bg-[#5B50EB] hover:bg-[#4E44DE] active:scale-[0.98] text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
            >
              {inviting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                'Invite'
              )}
            </button>
          </form>
        </div>

        {/* Section 2: Your Team */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white">
              Your Team
            </h3>
            <span className="text-[11px] font-medium text-zinc-400">
              {members.length} thành viên
            </span>
          </div>

          {/* Member List */}
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {loadingMembers ? (
              <div className="py-6 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                <Loader2 size={20} className="animate-spin text-indigo-500" />
                <span className="text-xs">Đang tải danh sách thành viên từ DB...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-5 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                Chưa có thành viên nào khác trong dự án.
              </div>
            ) : (
              members.map((member, index) => {
                const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
                const memojiRenderer = MEMOJI_VARIANTS[index % MEMOJI_VARIANTS.length];
                const memberName =
                  member.fullName ||
                  member.user?.fullName ||
                  member.email?.split('@')[0] ||
                  `Thành viên #${member.id}`;
                const memberEmail = member.email || member.user?.email || 'Chưa cập nhật email';
                const targetUserId = member.user?.id || member.userId || member.id;
                const isLeader = member.role === 'LEADER';
                const isCurrentUser = Boolean(
                  currentUser && (currentUser.id === targetUserId || currentUser.email === memberEmail)
                );

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-1 group hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 rounded-xl px-1.5 transition-colors"
                  >
                    {/* Left: Memoji Avatar + Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar with pastel colored box */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs border overflow-hidden"
                        style={{
                          backgroundColor: palette.bg,
                          borderColor: palette.border,
                        }}
                      >
                        {member.user?.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt={memberName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          memojiRenderer()
                        )}
                      </div>

                      {/* Name & Email */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {memberName}
                          </span>
                          {isLeader && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Leader
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              Bạn
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                          {memberEmail}
                        </p>
                      </div>
                    </div>

                    {/* Right: Red minus circle button (Delete / Remove member) */}
                    <button
                      type="button"
                      disabled={deletingUserId === targetUserId}
                      onClick={() => setMemberToDelete({ id: targetUserId, name: memberName })}
                      title={`Xóa ${memberName} khỏi nhóm`}
                      className="w-5 h-5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 text-rose-500 flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    >
                      {deletingUserId === targetUserId ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Minus size={11} strokeWidth={2.8} />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 3: Copy mã mời (formerly Copy Link) */}
        <div className="mt-6 pt-1">
          <label className="block text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
            Copy mã mời
          </label>
          <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5 pl-3.5 transition-all">
            <span
              className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-200 tracking-wider truncate mr-2 select-all"
              title={inviteCode}
            >
              {inviteCode || propInviteCode || 'FS8F5661827D'}
            </span>

            <button
              type="button"
              onClick={handleCopyInviteCode}
              className="px-3.5 py-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-[#5B50EB] dark:text-indigo-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <span>Copy</span>
                  <Copy size={12} strokeWidth={2} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Confirmation Modal to remove member */}
        {memberToDelete && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/40 backdrop-blur-xs"
            style={{ borderRadius: '24px' }}
          >
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-2xl max-w-xs w-full text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert size={20} />
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                Xác nhận xóa thành viên?
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Bạn có chắc chắn muốn xóa <strong>{memberToDelete.name}</strong> khỏi dự án không?
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteMember}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Xóa ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
