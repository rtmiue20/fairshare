import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  Clock,
  Kanban,
  GitBranch,
  FileText,
  X,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { MemberTable } from './MemberTable';
import { ConsentDialog } from './ConsentDialog';
import { teamApi } from '../../api/team.api';
import type { Team, Role } from '../../types/team';

// Danh sách 6 thành viên chuẩn xác 100% Nhóm 07 - Đồ án QLDA UEH
const DEFAULT_TEAM_DATA: Team = {
  id: 1,
  name: 'Dự án FairShare',
  description:
    'Nền tảng đo lường và đối soát mức độ đóng góp công bằng cho đồ án môn Quản lý Dự án CNTT - Đại học Kinh tế TP.HCM (UEH). Tích hợp dữ liệu tự động từ Git, Trello và khảo sát chấm chéo ẩn danh tuân thủ Nghị định 13/2023/NĐ-CP.',
  createdAt: '2026-10-15T08:00:00Z',
  inviteCode: 'FS-UEH-2026',
  members: [
    {
      id: 101,
      role: 'LEADER',
      hasConsented: true,
      joinedAt: '2026-10-15T08:00:00Z',
      user: {
        id: 1,
        email: 'trieu.31241027455@st.ueh.edu.vn',
        fullName: 'Nguyễn Văn Minh Triều',
      },
    },
    {
      id: 102,
      role: 'MEMBER',
      hasConsented: true,
      joinedAt: '2026-10-15T08:30:00Z',
      user: {
        id: 2,
        email: 'thien.31241021658@st.ueh.edu.vn',
        fullName: 'Hà Ngọc Thiện',
      },
    },
    {
      id: 103,
      role: 'MEMBER',
      hasConsented: true,
      joinedAt: '2026-10-15T09:00:00Z',
      user: {
        id: 3,
        email: 'vuong.31241025017@st.ueh.edu.vn',
        fullName: 'Nguyễn Phúc Vương',
      },
    },
    {
      id: 104,
      role: 'MEMBER',
      hasConsented: true,
      joinedAt: '2026-10-15T09:15:00Z',
      user: {
        id: 4,
        email: 'phuc.31241020074@st.ueh.edu.vn',
        fullName: 'Ngô Trọng Phúc',
      },
    },
    {
      id: 105,
      role: 'MEMBER',
      hasConsented: true,
      joinedAt: '2026-10-15T09:30:00Z',
      user: {
        id: 5,
        email: 'khang.31241022785@st.ueh.edu.vn',
        fullName: 'Triệu Nguyễn Huỳnh Khang',
      },
    },
    {
      id: 106,
      role: 'MEMBER',
      hasConsented: true,
      joinedAt: '2026-10-15T10:00:00Z',
      user: {
        id: 6,
        email: 'namanh.31241022203@st.ueh.edu.vn',
        fullName: 'Khiếu Hoàng Nam Anh',
      },
    },
  ],
};

const SPRINTS_TIMELINE = [
  {
    num: 1,
    title: 'Khởi tạo & Khảo sát Pain Points',
    period: 'Tuần 1 (14/10 - 20/10)',
    status: 'DONE',
    focusTask: 'Khảo sát thực trạng Free-rider đồ án nhóm UEH, thu thập khảo sát 42 sinh viên CNTT.',
  },
  {
    num: 2,
    title: 'Đặc tả Nghiệp vụ & Chính sách Đồng thuận',
    period: 'Tuần 2 (21/10 - 27/10)',
    status: 'DONE',
    focusTask: 'Soạn thảo Báo cáo Tuần 2, đặc tả User Stories, ma trận RACI và tiêu chuẩn đồng thuận Nghị định 13.',
  },
  {
    num: 3,
    title: 'Giao diện Hồ sơ & Tích hợp Đối soát',
    period: 'Tuần 3 (28/10 - 03/11)',
    status: 'ACTIVE',
    focusTask: 'Thiết kế giao diện Auth/Profile/TeamDetail theo chuẩn Linear, tích hợp cơ chế đối soát Git & Trello.',
  },
  {
    num: 4,
    title: 'Trọng số Đóng góp & Thuật toán CI',
    period: 'Tuần 4 (04/11 - 10/11)',
    status: 'UPCOMING',
    focusTask: 'Xây dựng công thức tính chỉ số đóng góp CI = Git (40%) + Trello (40%) + Chấm chéo (20%).',
  },
  {
    num: 5,
    title: 'Khảo sát Chấm chéo Ẩn danh (Peer Review)',
    period: 'Tuần 5 (11/11 - 17/11)',
    status: 'UPCOMING',
    focusTask: 'Triển khai biểu mẫu đánh giá chéo ẩn danh 360 độ và thuật toán loại trừ thiên vị (Anti-bias).',
  },
  {
    num: 6,
    title: 'Xuất Báo cáo Giảng viên & Đối soát',
    period: 'Tuần 6 (18/11 - 24/11)',
    status: 'UPCOMING',
    focusTask: 'Phát triển module xuất báo cáo PDF/Excel minh chứng minh bạch phục vụ chấm điểm đồ án.',
  },
  {
    num: 7,
    title: 'Nghiệm thu & Báo cáo Đồ án Cuối kỳ',
    period: 'Tuần 7 (25/11 - 01/12)',
    status: 'UPCOMING',
    focusTask: 'Đóng gói toàn diện đồ án, hoàn thiện tài liệu kỹ thuật SRS và bảo vệ trước Hội đồng UEH.',
  },
];

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(DEFAULT_TEAM_DATA);
  const [activeTab, setActiveTab] = useState<'members' | 'sprints' | 'consent'>('members');
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTeam = async () => {
      try {
        const res = await teamApi.getTeamById(Number(id) || 1);
        if (isMounted && res && res.data && res.data.members && res.data.members.length > 0) {
          setTeam(res.data);
        }
      } catch {
        // Fallback to DEFAULT_TEAM_DATA already set
      }
    };

    fetchTeam();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setShowInviteModal(false);
      setInviteEmail('');
    }, 1500);
  };

  const handleUpdateRole = async (userId: number, role: Role) => {
    try {
      if (team?.id) {
        await teamApi.updateMemberRole(team.id, userId, role);
      }
      setTeam((prev) => {
        const base = prev || DEFAULT_TEAM_DATA;
        return {
          ...base,
          members: base.members?.map((m) =>
            m.user?.id === userId || m.id === userId ? { ...m, role } : m
          ),
        };
      });
      setActionMessage('Đã cập nhật vai trò thành viên thành công.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch {
      setActionMessage('Không thể cập nhật vai trò (yêu cầu quyền Leader hoặc quy tắc an toàn).');
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?');
    if (!confirmed) return;

    try {
      if (team?.id) {
        await teamApi.deleteMember(team.id, userId);
      }
      setTeam((prev) => {
        const base = prev || DEFAULT_TEAM_DATA;
        return {
          ...base,
          members: base.members?.filter(
            (m) => m.user?.id !== userId && m.id !== userId
          ),
        };
      });
      setActionMessage('Đã xóa thành viên khỏi danh sách nhóm.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch {
      setActionMessage('Không thể xóa thành viên (nhóm phải giữ lại ít nhất 1 Trưởng nhóm).');
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const currentTeam = team || DEFAULT_TEAM_DATA;
  const membersCount = currentTeam.members?.length || 6;

  return (
    <div className="space-y-6 pt-2">
      {/* 1. Linear Minimalist Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="space-y-1.5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <Link to="/teams" className="hover:text-zinc-300 transition-colors">
              Danh sách nhóm
            </Link>
            <ChevronRight size={12} className="text-zinc-600" />
            <span className="text-zinc-300">{currentTeam.name}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>{currentTeam.name}</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              Học kỳ 1 • 2026-2027
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
            {currentTeam.description}
          </p>
        </div>

        {/* Action Buttons: Linear Solid White & Minimalist Border */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to={`/teams/${currentTeam.id}/board`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 hover:text-white hover:bg-indigo-800/50 transition-colors"
          >
            <Kanban size={13} className="text-indigo-400" />
            <span>Task Board</span>
          </Link>
          <button
            onClick={() => setIsConsentOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Cài đặt Consent</span>
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-sm"
          >
            <UserPlus size={13} />
            <span>+ Mời thành viên</span>
          </button>
        </div>
      </div>

      {/* 2. Linear Metric Cards (Flat, border-zinc-800, Monospace Typography) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Team Members */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121318] border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Thành viên nhóm
            </span>
            <Users size={14} className="text-zinc-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight">
              {membersCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">sinh viên</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              {['MT', 'HT', 'PV', 'TP', 'TK', 'NA'].map((initials, i) => (
                <div
                  key={i}
                  className="h-5 w-5 rounded-md border border-zinc-700/80 bg-zinc-800/80 text-zinc-300 text-[9px] font-bold flex items-center justify-center shrink-0"
                >
                  {initials}
                </div>
              ))}
            </div>
            <span className="text-zinc-400 hidden sm:inline">6/6 vai trò</span>
          </div>
        </div>

        {/* Card 2: Consent Status */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121318] border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Đồng thuận dữ liệu
            </span>
            <ShieldCheck size={14} className="text-emerald-500/80" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-semibold text-emerald-400 tracking-tight">
              6 / 6
            </span>
            <span className="text-xs text-zinc-400 font-mono">ký số</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
            <CheckCircle2 size={12} />
            <span>Chuẩn Nghị định 13/2023</span>
          </div>
        </div>

        {/* Card 3: Active Sprint */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121318] border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Sprint hiện tại
            </span>
            <Calendar size={14} className="text-zinc-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight">
              Sprint 3
            </span>
            <span className="text-xs text-zinc-500 font-mono">/ 7 Sprints</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-amber-400" />
              <span>Hạn: 02/11/2026</span>
            </span>
            <span className="text-amber-400 font-medium">Hôm nay</span>
          </div>
        </div>

        {/* Card 4: Metric Integrations */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121318] border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Kênh đo lường
            </span>
            <Layers size={14} className="text-zinc-500" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg flex items-center gap-2">
              <Kanban size={13} className="text-sky-400" />
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">Trello</div>
                <div className="text-xs font-semibold text-zinc-200 font-mono">51 thẻ</div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg flex items-center gap-2">
              <GitBranch size={13} className="text-indigo-400" />
              <div>
                <div className="text-[10px] text-zinc-500 font-mono">GitHub</div>
                <div className="text-xs font-semibold text-zinc-200 font-mono">nhánh dev</div>
              </div>
            </div>
          </div>
          <div className="mt-2.5 text-[11px] text-zinc-500 font-mono text-right">
            Đồng bộ định kỳ 15 phút
          </div>
        </div>
      </div>

      {/* 3. Linear Segmented Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'members'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users size={13} />
            <span>Danh sách thành viên ({membersCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('sprints')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'sprints'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar size={13} />
            <span>Kế hoạch Sprint (7 Sprints)</span>
          </button>

          <button
            onClick={() => setActiveTab('consent')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'consent'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Chính sách Consent NĐ 13</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Member Table */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Thành viên tham gia đồ án
              </h2>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Quản lý định danh 6 sinh viên UEH và trạng thái kích hoạt Consent chia sẻ minh chứng.
              </p>
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              Mã tham gia: <span className="text-zinc-200 font-bold px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded">{currentTeam.inviteCode}</span>
            </div>
          </div>

          {actionMessage && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-300 flex items-center justify-between">
              <span>{actionMessage}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <MemberTable
            members={currentTeam.members || []}
            isLeader={true}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
          />
        </div>
      )}

      {/* Tab 2: Sprints Roadmap */}
      {activeTab === 'sprints' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Lộ trình 7 Sprints theo Đồ án Môn học UEH
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Theo dõi tiến độ bàn giao từng tuần và đối soát trách nhiệm chuyên môn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {SPRINTS_TIMELINE.map((sp) => {
              const isDone = sp.status === 'DONE';
              const isActive = sp.status === 'ACTIVE';

              return (
                <div
                  key={sp.num}
                  className={`p-4 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-[#121318] border-zinc-600/80 shadow-sm'
                      : isDone
                      ? 'bg-[#121318] border-zinc-800/80 opacity-90'
                      : 'bg-[#0f1015] border-zinc-850 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-xs text-zinc-200">
                      Sprint {sp.num}: {sp.title}
                    </span>
                    {isDone ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Hoàn thành
                      </span>
                    ) : isActive ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1">
                        Đang diễn ra
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-500">
                        Sắp tới
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-zinc-500 font-mono mb-3">{sp.period}</div>

                  <div className="pt-2.5 border-t border-zinc-800/60 text-xs">
                    <div className="font-medium text-zinc-300 mb-1 flex items-center gap-1">
                      <FileText size={12} className="text-zinc-400" />
                      <span>Nhiệm vụ trọng tâm:</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">{sp.focusTask}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Consent Policy */}
      {activeTab === 'consent' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Chính sách Đồng thuận & Bảo mật Dữ liệu (Nghị định 13/2023/NĐ-CP)
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Đảm bảo quyền riêng tư cá nhân khi minh bạch hóa dữ liệu đo lường học tập.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[#121318] border border-zinc-800/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-mono font-bold text-xs">
                1
              </div>
              <h3 className="font-semibold text-zinc-100 text-sm">Tự nguyện & Minh bạch</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sinh viên có toàn quyền lựa chọn cung cấp minh chứng Trello, commit Git hay chỉ số hoạt động mà không bị bắt buộc.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#121318] border border-zinc-800/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-mono font-bold text-xs">
                2
              </div>
              <h3 className="font-semibold text-zinc-100 text-sm">Mục đích giới hạn</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dữ liệu chỉ được sử dụng nội bộ trong phạm vi học phần Quản lý Dự án CNTT tại UEH, không chia sẻ cho bên thứ ba.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#121318] border border-zinc-800/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-mono font-bold text-xs">
                3
              </div>
              <h3 className="font-semibold text-zinc-100 text-sm">Quyền rút lại Consent</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Thành viên có thể hủy cấp phép hoặc chỉnh sửa phạm vi chia sẻ bất kỳ lúc nào tại màn hình Hồ sơ & Cài đặt cá nhân.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Consent Dialog */}
      <ConsentDialog
        isOpen={isConsentOpen}
        onClose={() => setIsConsentOpen(false)}
        teamId={team?.id ?? 1}
        onSuccess={() => setIsConsentOpen(false)}
      />

      {/* Invite Member Modal - Linear Style */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#121318] border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-zinc-300" />
                <h3 className="font-semibold text-sm text-zinc-100">Mời thành viên vào đồ án</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="font-medium text-xs text-zinc-100">Đã gửi lời mời thành công!</h4>
                <p className="text-xs text-zinc-400 font-mono">Lời mời đã được chuyển tới {inviteEmail}</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Email sinh viên UEH (@st.ueh.edu.vn)
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="mssv@st.ueh.edu.vn"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex items-start gap-2.5">
                  <AlertCircle size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Thành viên mới sẽ cần đăng nhập qua cổng định danh UEH và đồng thuận NĐ 13 trước khi dữ liệu được tổng hợp.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg transition-colors shadow-sm"
                  >
                    Gửi lời mời
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};