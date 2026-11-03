import React from 'react';
import { TeamMember, Role } from '../../types/team';
import {
  ShieldCheck,
  Crown,
  User as UserIcon,
  Kanban,
  GitPullRequest,
  Check,
} from 'lucide-react';

interface MemberTableProps {
  members: TeamMember[];
  onRemoveMember?: (memberId: number) => void;
  onUpdateRole?: (memberId: number, role: Role) => void;
  isLeader?: boolean;
}

export const MemberTable: React.FC<MemberTableProps> = ({ members }) => {
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      if (name.includes('Triều')) return 'MT';
      if (name.includes('Thiện')) return 'HT';
      if (name.includes('Vương')) return 'PV';
      if (name.includes('Phúc')) return 'TP';
      if (name.includes('Khang')) return 'TK';
      if (name.includes('Nam Anh')) return 'NA';
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return (email?.substring(0, 2) || 'TV').toUpperCase();
  };

  const getSubTitle = (name?: string) => {
    if (!name) return 'Thành viên dự án';
    if (name.includes('Triều')) return 'Trưởng nhóm đồ án (Team Leader)';
    if (name.includes('Thiện')) return 'Phân tích nghiệp vụ (BA) & Frontend';
    if (name.includes('Vương')) return 'Kỹ sư Backend & Tích hợp Trello/Git';
    if (name.includes('Phúc')) return 'Phát triển Frontend & Dữ liệu đóng góp';
    if (name.includes('Khang')) return 'Phát triển Tính năng & Chấm chéo';
    if (name.includes('Nam Anh')) return 'Đảm bảo CLPM (QA/QC) & Triển khai';
    return 'Thành viên nhóm phát triển';
  };

  return (
    <div className="w-full bg-[#121318] border border-zinc-800/80 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-zinc-900/60 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-5">Thành viên</th>
              <th className="py-3 px-5">Email UEH / MSSV</th>
              <th className="py-3 px-5">Vai trò dự án</th>
              <th className="py-3 px-5">Đồng thuận NĐ 13</th>
              <th className="py-3 px-5">Kênh dữ liệu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {members.map((member) => {
              const name = member.user?.fullName || member.user?.email || 'Thành viên';
              const initials = getInitials(member.user?.fullName, member.user?.email);
              const isLead = member.role === 'LEADER' || name.includes('Triều');
              const isThien = name.includes('Thiện');

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
                          {isThien && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {getSubTitle(name)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Email / MSSV */}
                  <td className="py-3.5 px-5 text-zinc-400 font-mono text-xs">
                    {member.user?.email}
                  </td>

                  {/* Project Role */}
                  <td className="py-3.5 px-5">
                    {isLead ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <Crown size={12} className="text-amber-400" />
                        <span>Trưởng nhóm</span>
                      </span>
                    ) : isThien ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                        <span>BA & Frontend</span>
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck size={12} className="text-emerald-400" />
                      <span>Đã xác nhận</span>
                      <Check size={11} className="text-emerald-400 stroke-[3]" />
                    </span>
                  </td>

                  {/* Connected channels */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-colors"
                        title="Trello Board Connected"
                      >
                        <Kanban size={11} className="text-sky-400" />
                        <span>Trello</span>
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-colors"
                        title="GitHub Repository Connected"
                      >
                        <GitPullRequest size={11} className="text-indigo-400" />
                        <span>Git</span>
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};