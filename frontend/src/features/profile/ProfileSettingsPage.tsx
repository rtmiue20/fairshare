import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Github,
  Kanban,
  Link2,
  ChevronRight,
  Info,
  Save,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const ProfileSettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations' | 'privacy'>('profile');
  const [copiedId, setCopiedId] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State initialized with student information
  const [formData, setFormData] = useState({
    fullName: user?.fullName || 'Hà Ngọc Thiện',
    studentId: (user as { studentId?: string })?.studentId || '31241021658',
    email: user?.email || 'thien.31241021658@st.ueh.edu.vn',
    phone: '0901 234 567',
    major: 'Hệ thống Thông tin Doanh nghiệp (MIS) • Khóa 50',
    teamRole: 'Phân tích nghiệp vụ (BA) & Phát triển Frontend',
    bio: 'Phụ trách mô đun Quản lý Nhóm, Thiết lập Sprint, Chính sách Đồng thuận NĐ 13/2023 và Giao diện người dùng FairShare.',
    githubUsername: 'HNTRHunter',
  });

  // GitHub Connection status
  const [connections, setConnections] = useState({
    github: true,
  });

  const [githubTesting, setGithubTesting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('fairshare_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleCopyStudentId = () => {
    navigator.clipboard.writeText(formData.studentId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('fairshare_user_profile', JSON.stringify(formData));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const testGithubConnection = () => {
    setGithubTesting(true);
    setTimeout(() => {
      setGithubTesting(false);
      setConnections((prev) => ({ ...prev, github: true }));
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
        <span>FairShare</span>
        <ChevronRight size={12} />
        <span>Cài đặt hệ thống</span>
        <ChevronRight size={12} />
        <span className="text-zinc-200">Hồ sơ sinh viên</span>
      </div>

      {/* Header Banner - Linear Clean Style */}
      <div className="border border-zinc-800 bg-[#121318] rounded-xl p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 font-mono font-bold text-xl shadow-xs shrink-0">
              HT
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                  {formData.fullName}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-950/60 text-sky-400 border border-sky-800/60">
                  {formData.teamRole}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  NĐ 13 Hợp lệ
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono flex flex-wrap items-center gap-3">
                <span>MSSV: {formData.studentId}</span>
                <span>•</span>
                <span>{formData.email}</span>
                <span>•</span>
                <span>Đồ án FairShare</span>
              </p>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>Đã cập nhật thông tin hồ sơ sinh viên vào hệ thống thành công.</span>
          </div>
        )}
      </div>

      {/* Main Grid: Sidebar Profile Summary (4 cols) & Tab Panels (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quick Profile Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="border border-zinc-800 bg-[#121318] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Thông tin định danh
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                <span className="text-[11px] text-zinc-500 block">Mã số sinh viên (UEH ID)</span>
                <div className="flex items-center justify-between font-mono font-medium text-zinc-200">
                  <span>{formData.studentId}</span>
                  <button
                    onClick={handleCopyStudentId}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>{copiedId ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                <span className="text-[11px] text-zinc-500 block">Email sinh viên chính thức</span>
                <span className="font-mono text-zinc-300 break-all">{formData.email}</span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                <span className="text-[11px] text-zinc-500 block">Nhóm đồ án & Lớp học phần</span>
                <span className="text-zinc-200 font-medium">Nhóm 07 • 24D1INF50900503</span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                <span className="text-[11px] text-zinc-500 block">Đề tài đồ án</span>
                <span className="text-zinc-200 font-medium">FairShare - Nền tảng đo lường đóng góp đồ án</span>
              </div>
            </div>

            {/* Decree 13 Consent Box */}
            <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-emerald-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>Đồng thuận NĐ 13/2023</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  4/4 Quyền
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tài khoản đã kích hoạt đầy đủ chính sách đồng thuận bảo mật dữ liệu minh chứng theo Nghị định 13/2023/NĐ-CP.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Tab Panels (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Segmented Tab Pill Bar */}
          <div className="bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User size={14} />
              <span>Hồ sơ sinh viên</span>
            </button>

            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'integrations'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Link2 size={14} />
              <span>Tài khoản liên kết</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Quyền riêng tư (NĐ 13)</span>
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="border border-zinc-800 bg-[#121318] rounded-xl p-6">
            {/* Tab 1: Profile Form */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSave} className="space-y-4">
                {/* Verified UEH Academic Identity (Read-only / Synchronized) */}
                <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Lock size={13} className="text-zinc-500 shrink-0" />
                    <span>Định danh UEH chính thức (Đồng bộ Cổng đào tạo • Cố định):</span>
                  </div>
                  <div className="font-mono text-zinc-300 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-200 font-semibold">{formData.studentId}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">{formData.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-400">
                      Họ và tên hiển thị
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-200 bg-zinc-900/80 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-400">
                      Số điện thoại liên hệ cá nhân
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="09xx xxx xxx"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-200 bg-zinc-900/80 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">
                    Chuyên ngành & Lớp sinh hoạt
                  </label>
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-200 bg-zinc-900/80 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">
                    Vai trò trong nhóm đồ án (PCCV)
                  </label>
                  <input
                    type="text"
                    value={formData.teamRole}
                    onChange={(e) => setFormData({ ...formData, teamRole: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-200 bg-zinc-900/80 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">
                    Giới thiệu / Trách nhiệm chính trong đồ án
                  </label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-200 bg-zinc-900/80 focus:outline-none focus:border-zinc-600 transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Notification & Alert Preferences */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-2.5">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono block">
                    Tùy chọn cảnh báo & Minh chứng
                  </span>
                  <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-indigo-500"
                    />
                    <span>Nhận cảnh báo tự động khi tỷ lệ đóng góp giảm dưới ngưỡng an toàn (&lt; 15%).</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-indigo-500"
                    />
                    <span>Gửi thông báo xác nhận mỗi khi hệ thống đồng bộ commit Git hoặc thẻ Trello mới.</span>
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      const saved = localStorage.getItem('fairshare_user_profile');
                      if (saved) setFormData(JSON.parse(saved));
                    }}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-colors shadow-xs"
                  >
                    <Save size={14} />
                    <span>Lưu cập nhật</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Integrations Form */}
            {activeTab === 'integrations' && (
              <div className="space-y-5">
                <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
                  <Info size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                  <span>
                    Hệ thống tự động thu thập minh chứng hoạt động từ Task Board nội bộ và tài khoản GitHub phục vụ tính điểm đóng góp công bằng.
                  </span>
                </div>

                {/* Task Board Integration (CR-02) */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
                        <Kanban size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-200">Task Board Nội Bộ (CR-02)</h4>
                        <p className="text-[11px] text-zinc-400">Tự động đồng bộ thẻ công việc từ Kanban Board nội bộ</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                      <CheckCircle2 size={12} />
                      Đang kích hoạt
                    </span>
                  </div>
                </div>

                {/* GitHub Integration */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
                        <Github size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-200">GitHub Repository</h4>
                        <p className="text-[11px] text-zinc-400">Theo dõi commits, pull requests và code review</p>
                      </div>
                    </div>
                    {connections.github ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                        <CheckCircle2 size={12} />
                        Đã kết nối
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                        Chưa liên kết
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="GitHub handle (vd: HNTRHunter)"
                        value={formData.githubUsername}
                        onChange={(e) => setFormData({ ...formData, githubUsername: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-200 bg-zinc-900 focus:outline-none focus:border-zinc-600 transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={testGithubConnection}
                      disabled={githubTesting}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors disabled:opacity-50"
                    >
                      {githubTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Privacy & Decree 13 */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Hệ thống FairShare thu thập dữ liệu minh chứng với mục đích học thuật duy nhất: tính toán chỉ số đóng góp đồ án môn học. Toàn bộ dữ liệu được lưu trữ có kiểm soát và bạn có quyền thu hồi bất kỳ lúc nào.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-zinc-200">Chia sẻ lịch sử Git commits & PRs</h4>
                      <p className="text-[11px] text-zinc-500">Cho phép hệ thống đọc hash commit và thống kê dòng code</p>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-medium">ĐÃ ĐỒNG THUẬN</span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-zinc-200">Đồng bộ trạng thái thẻ bài tập Trello</h4>
                      <p className="text-[11px] text-zinc-500">Ghi nhận tiến độ hoàn thành task theo từng sprint</p>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-medium">ĐÃ ĐỒNG THUẬN</span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-zinc-200">Hiển thị tỷ lệ đóng góp trong nhóm</h4>
                      <p className="text-[11px] text-zinc-500">Công khai chỉ số CI trên dashboard đối soát nội bộ</p>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-medium">ĐÃ ĐỒNG THUẬN</span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-zinc-200">Tham gia chấm chéo ẩn danh (Peer Review)</h4>
                      <p className="text-[11px] text-zinc-500">Đánh giá chéo thành viên khách quan qua mã số mã hóa</p>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-medium">ĐÃ ĐỒNG THUẬN</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
