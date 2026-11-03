import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ChevronRight,
  ArrowRight,
  X,
} from 'lucide-react';
import { Team } from '../../types/team';
import { teamApi } from '../../api/team.api';

// Demo Team 07 Data Fallback khi backend chưa bật
const DEFAULT_TEAMS: Team[] = [
  {
    id: 1,
    name: 'Nền tảng FairShare',
    courseName: 'Quản lý Dự án Phần mềm (IS301)',
    description: 'Hệ thống đo lường đóng góp sinh viên khách quan qua Git, Trello và đối soát NĐ 13/2023.',
    createdAt: '2026-10-15',
    members: [],
  },
];

export const TeamListPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    courseName: 'Quản lý Dự án Phần mềm (IS301)',
    description: '',
  });

  useEffect(() => {
    teamApi
      .getTeams()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setTeams(res.data);
        }
      })
      .catch((err) => {
        console.warn('Backend offline, using local team data:', err);
      });
  }, []);

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name.trim()) return;

    const created: Team = {
      id: Date.now(),
      name: newTeam.name,
      courseName: newTeam.courseName,
      description: newTeam.description,
      createdAt: new Date().toISOString(),
      members: [],
    };

    setTeams([created, ...teams]);
    setShowCreateModal(false);
    setNewTeam({ name: '', courseName: 'Quản lý Dự án Phần mềm (IS301)', description: '' });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
        <Link to="/teams" className="hover:text-zinc-300 transition-colors">
          Danh sách nhóm
        </Link>
        <ChevronRight size={12} />
        <span className="text-zinc-200">IS301 • Quản lý đồ án</span>
      </div>

      {/* Header Banner - Linear Minimalist */}
      <div className="border border-zinc-800 bg-[#121318] rounded-xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Nhóm đồ án & Sprints
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/80">
              Học kỳ 1 • 2026-2027
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Quản lý danh sách nhóm học phần QLDA PM (IS301), phân bổ sprint và chính sách minh bạch đóng góp.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-xs shrink-0"
        >
          <Plus size={14} />
          <span>Tạo nhóm mới</span>
        </button>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((t) => (
          <div
            key={t.id}
            className="border border-zinc-800 bg-[#121318] rounded-xl p-5 hover:border-zinc-700 transition-colors flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-mono font-bold text-sm">
                  {t.id === 1 ? 'FS' : 'UEH'}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-100 hover:text-white transition-colors">
                  {t.name}
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{t.courseName}</p>
              </div>

              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {t.description || 'Chưa cập nhật mô tả chi tiết cho đồ án này.'}
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-zinc-800/80">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                  <span className="block text-[10px] text-zinc-500">Thành viên</span>
                  <span className="font-mono font-bold text-zinc-200">6 SV</span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                  <span className="block text-[10px] text-zinc-500">Tiến độ</span>
                  <span className="font-mono font-bold text-sky-400">Sprint 3/7</span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                  <span className="block text-[10px] text-zinc-500">NĐ 13</span>
                  <span className="font-mono font-bold text-emerald-400">100%</span>
                </div>
              </div>

              <Link
                to={`/teams/${t.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <span>Xem chi tiết nhóm</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tạo nhóm mới - Linear Style */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#121318] border border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100">Khởi tạo nhóm đồ án mới</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-medium text-zinc-400">Tên nhóm đồ án</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhóm 07 — Nền tảng FairShare"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-200 bg-zinc-900 focus:outline-none focus:border-zinc-600 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-zinc-400">Học phần môn học</label>
                <input
                  type="text"
                  value={newTeam.courseName}
                  onChange={(e) => setNewTeam({ ...newTeam, courseName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-200 bg-zinc-900 focus:outline-none focus:border-zinc-600 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-zinc-400">Mô tả mục tiêu đồ án</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả tóm tắt đề tài, bài toán và công nghệ áp dụng..."
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-200 bg-zinc-900 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-xs"
                >
                  Tạo nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
