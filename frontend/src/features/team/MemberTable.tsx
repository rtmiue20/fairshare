import React from 'react';
import { TeamMember, Role } from '../../types/team';
import { useAuthStore } from '../../store/authStore';
import {
  ShieldCheck,
  Crown,
  User as UserIcon,
  Kanban,
  GitPullRequest,
  Check,
  Trash2,
} from 'lucide-react';

interface MemberTableProps {
  members: TeamMember[];
  onRemoveMember?: (memberId: number) => void;
  onUpdateRole?: (memberId: number, role: Role) => void;
  isLeader?: boolean;
}

export const MemberTable: React.FC<MemberTableProps> = ({
  members,
  onRemoveMember,
  onUpdateRole,
  isLeader = false,
}) => {
  const { user: currentUser } = useAuthStore();

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return (email?.substring(0, 2) || 'TV').toUpperCase();
  };

  const getSubTitle = (role?: Role) => {
    if (role === 'LEADER') return 'Trưởng nhóm đồ án (Team Leader)';
    return 'Thành viên nhóm phát triển';
  };

  const showActions = isLeader || Boolean(onRemoveMember || onUpdateRole);

  if (!members || members.length === 0) {
    return (
      <div className="w-full bg-[#121318] border border-zinc-800/80 rounded-xl p-8 text-center text-zinc-400">
        <p className="text-sm font-medium">Chưa có thành viên nào trong dự án</p>
        <p className="text-xs text-zinc-500 mt-1">Hãy mời thành viên bằng mã mời hoặc email để bắt đầu phân chia công việc.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#121318] border border-zinc-800/80 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-zinc-900/60 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-5">Thành viên</th>
              <th className="py-3 px-5">Email / Mã định danh</th>
              <th className="py-3 px-5">Vai trò dự án</th>
              <th className="py-3 px-5">Đồng thuận NĐ 13</th>
              <th className="py-3 px-5">Kênh dữ liệu</th>
              {showActions && <th className="py-3 px-5 text-right">Quản lý</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {members.map((member) => {
              const name = member.user?.fullName || member.fullName || member.user?.email || member.email || 'Thành viên';
              const initials = getInitials(name, member.user?.email || member.email);
              const isLead = member.role === 'LEADER';
              const targetUserId = member.user?.id || member.userId || member.id;
              const isCurrentUser = Boolean(currentUser && (currentUser.id === targetUserId || currentUser.email === (member.user?.email || member.email)));

              return (
                <tr
                  key={member.id}
                  className="hover:bg-zinc-800/30 transition-colors group"
                >
                  {/* Member identity */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 text-zinc-200 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                          <span>{name}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {getSubTitle(member.role)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Email / MSSV */}
                  <td className="py-3.5 px-5 text-zinc-400 font-mono text-xs">
                    {member.user?.email || member.email}
                  </td>

                  {/* Project Role */}
                  <td className="py-3.5 px-5">
                    {isLead ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <Crown size={12} className="text-amber-400" />
                        <span>Trưởng nhóm</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                        <UserIcon size={12} className="text-zinc-400" />
                        <span>Thành viên</span>
                      </span>
                    )}
                  </td>

                  {/* Consent Status */}
                  <td className="py-3.5 px-5">
                    {member.hasConsented ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck size={12} className="text-emerald-400" />
                        <span>Đã xác nhận</span>
                        <Check size={11} className="text-emerald-400 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <ShieldCheck size={12} className="text-amber-400" />
                        <span>Chờ xác nhận</span>
                      </span>
                    )}
                  </td>

                  {/* Connected channels */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-colors"
                        title="Kanban Board Connected"
                      >
                        <Kanban size={11} className="text-sky-400" />
                        <span>Kanban</span>
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-colors"
                        title="Git Repository Connected"
                      >
                        <GitPullRequest size={11} className="text-indigo-400" />
                        <span>Git</span>
                      </span>
                    </div>
                  </td>

                  {/* Management actions */}
                  {showActions && (
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onUpdateRole && (
                          <select
                            aria-label={`Đổi vai trò cho ${name}`}
                            value={member.role}
                            onChange={(e) => onUpdateRole(targetUserId, e.target.value as Role)}
                            className="bg-zinc-900 border border-zinc-700/80 text-zinc-300 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-amber-500/80 cursor-pointer"
                          >
                            <option value="MEMBER">Thành viên</option>
                            <option value="LEADER">Trưởng nhóm</option>
                          </select>
                        )}
                        {onRemoveMember && (
                          <button
                            type="button"
                            aria-label={`Xóa ${name}`}
                            onClick={() => onRemoveMember(targetUserId)}
                            className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                            title="Xóa thành viên khỏi nhóm"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
