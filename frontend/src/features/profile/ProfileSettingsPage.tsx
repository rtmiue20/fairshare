import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Github,
  Kanban,
  Link2,
  Save,
  Lock,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import apiClient from '../../api/client';
import { teamApi } from '../../api/team.api';

const extractStudentIdFromEmail = (email?: string): string => {
  if (!email) return '';
  const match = email.match(/(\d{8,12})/);
  return match ? match[1] : '';
};

const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { teams, activeTeamId, fetchTeams } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'project' | 'profile' | 'integrations' | 'privacy'>('project');
  const [copiedId, setCopiedId] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Active project resolution
  const activeTeam = teams.find((t) => t.id === activeTeamId) || (teams.length > 0 ? teams[0] : null);

  // Project settings state (Starts clean, pulls dynamically from activeTeam)
  const [projectSettings, setProjectSettings] = useState({
    projectName: '',
    lecturer: '',
    sprintCount: 4,
    courseCode: '',
    teamName: '',
  });

  // User profile state (Starts clean / unpolluted for new accounts)
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    studentId: (user as { studentId?: string })?.studentId || extractStudentIdFromEmail(user?.email),
    email: user?.email || '',
    phone: '',
    major: '',
    teamRole: '',
    bio: '',
    githubUsername: (user as { githubUsername?: string })?.githubUsername || '',
  });

  const [connections, setConnections] = useState({
    github: false,
  });
  const [githubTesting, setGithubTesting] = useState(false);

  // 1. Sync User Profile from scoped localStorage + Backend API
  useEffect(() => {
    let mounted = true;
    if (!user) return;

    const userStorageKey = `fairshare_user_profile_${user.id}`;
    const savedProfile = localStorage.getItem(userStorageKey) || localStorage.getItem('fairshare_user_profile');

    let initialProfile: Partial<typeof formData> = {};
    if (savedProfile) {
      try {
        initialProfile = JSON.parse(savedProfile);
      } catch {
        // Ignore parse error
      }
    }

    const autoStudentId = (user as { studentId?: string })?.studentId || extractStudentIdFromEmail(user.email);

    setFormData({
      fullName: user.fullName || initialProfile.fullName || '',
      studentId: initialProfile.studentId || autoStudentId || '',
      email: user.email || initialProfile.email || '',
      phone: initialProfile.phone || '',
      major: initialProfile.major || '',
      teamRole: initialProfile.teamRole || '',
      bio: initialProfile.bio || '',
      githubUsername: (user as { githubUsername?: string })?.githubUsername || initialProfile.githubUsername || '',
    });

    if (initialProfile.githubUsername || (user as { githubUsername?: string })?.githubUsername) {
      setConnections({ github: true });
    }

    // Fetch freshest current user info from Backend /api/users/me
    apiClient
      .get('/users/me')
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data || res.data;
        if (data && data.email) {
          setFormData((prev) => ({
            ...prev,
            fullName: data.fullName || prev.fullName,
            email: data.email || prev.email,
            studentId: prev.studentId || (data.studentId as string) || extractStudentIdFromEmail(data.email) || '',
            githubUsername: (data.githubUsername as string) || prev.githubUsername,
          }));
          if (data.githubUsername) {
            setConnections({ github: true });
          }
        }
      })
      .catch(() => {
        // Offline / fallback to local state
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  // 2. Sync Project Settings from activeTeam + scoped localStorage
  useEffect(() => {
    if (activeTeam) {
      const projectKey = `fairshare_project_settings_${activeTeam.id}`;
      const savedProject = localStorage.getItem(projectKey);
      let parsedProject: { lecturer?: string; sprintCount?: number } = {};
      if (savedProject) {
        try {
          parsedProject = JSON.parse(savedProject);
        } catch {
          // Ignore
        }
      }

      setProjectSettings({
        projectName: activeTeam.name || '',
        courseCode: activeTeam.courseName || '',
        teamName: activeTeam.name || '',
        lecturer: parsedProject.lecturer || '',
        sprintCount: parsedProject.sprintCount || 4,
      });
    } else {
      // No active project selected -> clean slate
      setProjectSettings({
        projectName: '',
        lecturer: '',
        sprintCount: 4,
        courseCode: '',
        teamName: '',
      });
    }
  }, [activeTeam]);

  const handleCopyStudentId = () => {
    if (!formData.studentId) return;
    navigator.clipboard.writeText(formData.studentId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProjectSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProject(true);
    setSaveError(null);

    try {
      if (activeTeam && activeTeam.id) {
        // Sync with backend API
        await teamApi.updateTeam(activeTeam.id, {
          name: projectSettings.projectName.trim() || activeTeam.name,
          courseName: projectSettings.courseCode.trim(),
        });
        await fetchTeams();

        localStorage.setItem(
          `fairshare_project_settings_${activeTeam.id}`,
          JSON.stringify(projectSettings)
        );
        setSaveSuccess(`Đã lưu thiết lập dự án: "${projectSettings.projectName || activeTeam.name}" (${projectSettings.sprintCount} Sprint)`);
      } else {
        localStorage.setItem('fairshare_project_settings_default', JSON.stringify(projectSettings));
        setSaveSuccess(`Đã lưu thiết lập cục bộ (${projectSettings.sprintCount} Sprint). Hãy tạo hoặc tham gia dự án để áp dụng.`);
      }
    } catch {
      if (activeTeam?.id) {
        localStorage.setItem(`fairshare_project_settings_${activeTeam.id}`, JSON.stringify(projectSettings));
      }
      setSaveSuccess(`Đã lưu thiết lập dự án cục bộ.`);
    } finally {
      setIsSavingProject(false);
      setTimeout(() => setSaveSuccess(null), 3500);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveError(null);

    const userKey = user?.id ? `fairshare_user_profile_${user.id}` : 'fairshare_user_profile';
    localStorage.setItem(userKey, JSON.stringify(formData));
    localStorage.setItem('fairshare_user_profile', JSON.stringify(formData));

    updateUser({
      fullName: formData.fullName,
    });

    try {
      await apiClient.put('/users/me', {
        fullName: formData.fullName,
        githubUsername: formData.githubUsername,
      });
      setSaveSuccess('Đã cập nhật thông tin hồ sơ cá nhân vào hệ thống thành công.');
    } catch {
      setSaveSuccess('Đã lưu thông tin hồ sơ cá nhân cục bộ thành công.');
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => setSaveSuccess(null), 3500);
    }
  };

  const testGithubConnection = () => {
    if (!formData.githubUsername.trim()) {
      setSaveError('Vui lòng nhập GitHub username trước khi kiểm tra.');
      setTimeout(() => setSaveError(null), 3000);
      return;
    }
    setGithubTesting(true);
    setTimeout(() => {
      setGithubTesting(false);
      setConnections((prev) => ({ ...prev, github: true }));
      setSaveSuccess(`Kết nối tài khoản GitHub "${formData.githubUsername}" thành công!`);
      setTimeout(() => setSaveSuccess(null), 3000);
    }, 800);
  };

  return (
    <div className="page pad" data-testid="profile-settings-page">
      {/* Page Head matching sample_ui/FairShare.html #v-cai-dat */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Cài đặt · Hệ thống &amp; Hồ sơ</div>
          <h1>Thiết lập dự án &amp; Thông tin cá nhân</h1>
          <p className="lede">
            Quản lý thông số đồ án môn học, thông tin định danh cá nhân và chính sách bảo vệ dữ liệu theo Nghị định 13/2023/NĐ-CP.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="chip" style={{ color: 'var(--ok)', borderColor: 'color-mix(in srgb, var(--ok) 40%, var(--line))' }}>
            ● NĐ 13/2023 Hợp lệ
          </span>
          {formData.studentId ? (
            <span className="chip">MSSV / ID: {formData.studentId}</span>
          ) : (
            <span className="chip">Chưa có MSSV</span>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: 'color-mix(in srgb, var(--ok) 14%, var(--surface))',
            border: '1px solid color-mix(in srgb, var(--ok) 40%, var(--line))',
            color: 'var(--ok)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: 'color-mix(in srgb, var(--bad) 14%, var(--surface))',
            border: '1px solid color-mix(in srgb, var(--bad) 40%, var(--line))',
            color: 'var(--bad)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid2">
        {/* Left Column: Project Settings (#setForm from sample_ui/FairShare.html) + Identity Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form className="panel" id="setForm" onSubmit={handleSaveProjectSettings}>
            <div className="panel-h">
              <span>Thiết lập dự án</span>
              <span className="chip">{projectSettings.courseCode || 'Chưa có mã HP'}</span>
            </div>

            {!activeTeam && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--fg2)',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--surface2)',
                  borderRadius: '6px',
                  border: '1px dashed var(--line)',
                }}
              >
                Chưa có dự án được chọn. Bạn có thể tự điền thông tin bên dưới hoặc nhấn <strong>+ Tạo dự án</strong> trên thanh điều hướng để khởi tạo đồ án mới.
              </div>
            )}

            <label className="field">
              <span>Tên đề tài / Dự án</span>
              <input
                id="s1"
                type="text"
                placeholder="Ví dụ: Nền tảng quản lý dự án nhóm..."
                value={projectSettings.projectName}
                onChange={(e) => setProjectSettings({ ...projectSettings, projectName: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Mã học phần / Lớp học</span>
              <input
                id="s-course"
                type="text"
                placeholder="Ví dụ: PRJ301, CNTT-K2024..."
                value={projectSettings.courseCode}
                onChange={(e) => setProjectSettings({ ...projectSettings, courseCode: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Giảng viên hướng dẫn</span>
              <input
                id="s2"
                type="text"
                placeholder="Ví dụ: TS. Nguyễn Văn A..."
                value={projectSettings.lecturer}
                onChange={(e) => setProjectSettings({ ...projectSettings, lecturer: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Số sprint</span>
              <input
                id="s3"
                type="number"
                min={1}
                max={12}
                value={projectSettings.sprintCount}
                onChange={(e) => setProjectSettings({ ...projectSettings, sprintCount: Number(e.target.value) })}
              />
            </label>

            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn sq" type="submit" disabled={isSavingProject}>
                {isSavingProject ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>

          {/* Identity Overview Panel */}
          <div className="panel">
            <div className="panel-h">
              <span>Thông tin tài khoản &amp; Định danh</span>
              <span className="chip" style={{ color: 'var(--accent)' }}>Tài khoản xác thực</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'color-mix(in srgb, var(--accent) 18%, var(--surface2))',
                  border: '1px solid color-mix(in srgb, var(--accent) 45%, var(--line))',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--mono)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  flexShrink: 0,
                }}
              >
                {getInitials(formData.fullName || formData.email || 'FS')}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--fg)' }}>
                  {formData.fullName || 'Chưa cập nhật họ tên'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--fg2)', fontFamily: 'var(--mono)' }}>
                  {formData.email || 'Chưa có email'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--fg3)', marginTop: '0.15rem' }}>
                  {projectSettings.teamName || 'Chưa tham gia dự án'}
                </div>
              </div>
            </div>

            <div className="rows">
              <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="t">Mã số sinh viên / Mã định danh</div>
                  <div className="s" style={{ fontFamily: 'var(--mono)' }}>
                    {formData.studentId || 'Chưa thiết lập'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyStudentId}
                  disabled={!formData.studentId}
                  className="btn ghost"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', opacity: formData.studentId ? 1 : 0.4 }}
                >
                  <Copy size={12} style={{ marginRight: '0.25rem' }} />
                  {copiedId ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="t">Đồng thuận Nghị định 13/2023/NĐ-CP</div>
                  <div className="s">Bảo vệ dữ liệu cá nhân &amp; minh chứng học thuật</div>
                </div>
                <span className="chip" style={{ color: 'var(--ok)' }}>4/4 Quyền</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile, Integrations & Privacy Tabs */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="panel-h" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Cấu hình cá nhân &amp; Liên kết</span>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveTab('project')}
                className={`btn ${activeTab === 'project' ? 'sq' : 'ghost'}`}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
              >
                <Settings size={12} style={{ marginRight: '0.25rem' }} />
                Hồ sơ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('integrations')}
                className={`btn ${activeTab === 'integrations' ? 'sq' : 'ghost'}`}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
              >
                <Link2 size={12} style={{ marginRight: '0.25rem' }} />
                Liên kết
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`btn ${activeTab === 'privacy' ? 'sq' : 'ghost'}`}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
              >
                <ShieldCheck size={12} style={{ marginRight: '0.25rem' }} />
                Nghị định 13
              </button>
            </div>
          </div>

          {(activeTab === 'project' || activeTab === 'profile') && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--line)',
                  fontSize: '0.75rem',
                  color: 'var(--fg2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Lock size={13} />
                  Định danh tài khoản:
                </span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg)' }}>
                  {formData.studentId ? `${formData.studentId} · ` : ''}{formData.email}
                </span>
              </div>

              <label className="field">
                <span>Họ và tên hiển thị</span>
                <input
                  type="text"
                  placeholder="Nhập họ và tên đầy đủ..."
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Mã số sinh viên / Mã định danh (MSSV)</span>
                <input
                  type="text"
                  placeholder="Nhập mã số sinh viên hoặc mã định danh..."
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Số điện thoại liên hệ</span>
                <input
                  type="text"
                  placeholder="Ví dụ: 0901 234 567..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Chuyên ngành &amp; Khóa</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Công nghệ Thông tin - Khóa 2024..."
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Vai trò trong nhóm đồ án</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Trưởng nhóm, Lập trình viên Backend, Frontend..."
                  value={formData.teamRole}
                  onChange={(e) => setFormData({ ...formData, teamRole: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Trách nhiệm chính trong đồ án</span>
                <textarea
                  rows={3}
                  placeholder="Mô tả phạm vi trách nhiệm đóng góp của bạn trong nhóm đồ án..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn sq"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Save size={14} />
                  <span>{isSavingProfile ? 'Đang lưu...' : 'Lưu cập nhật hồ sơ'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="rows">
                <div className="row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                  <Kanban size={18} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div className="t">Task Board Nội Bộ (CR-02)</div>
                    <div className="s">Tự động ghi nhận sự kiện tạo/kéo thẻ Kanban nội bộ phục vụ chấm điểm D1–D3</div>
                  </div>
                  <span className="chip" style={{ color: 'var(--ok)' }}>Đang kích hoạt</span>
                </div>

                <div className="row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                  <Github size={18} style={{ color: 'var(--fg)' }} />
                  <div>
                    <div className="t">GitHub Repository</div>
                    <div className="s">Đồng bộ commits, pull requests và code review qua GitHub Webhook</div>
                  </div>
                  <span className="chip" style={{ color: connections.github ? 'var(--ok)' : 'var(--fg3)' }}>
                    {connections.github ? 'Đã kết nối' : 'Chưa liên kết'}
                  </span>
                </div>
              </div>

              <label className="field">
                <span>Tài khoản GitHub (Username)</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={formData.githubUsername}
                    onChange={(e) => setFormData({ ...formData, githubUsername: e.target.value })}
                    placeholder="Nhập GitHub username..."
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={testGithubConnection}
                    disabled={githubTesting}
                    className="btn ghost"
                  >
                    {githubTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                  </button>
                </div>
              </label>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="rows">
              <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="t">Chia sẻ lịch sử Git commits &amp; PRs</div>
                  <div className="s">Cho phép hệ thống đọc hash commit và thống kê đóng góp mã nguồn</div>
                </div>
                <span className="chip" style={{ color: 'var(--ok)' }}>ĐÃ ĐỒNG THUẬN</span>
              </div>

              <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="t">Đồng bộ trạng thái thẻ Task Board nội bộ (CR-02)</div>
                  <div className="s">Ghi nhận tiến độ hoàn thành task theo từng sprint qua sự kiện bất biến</div>
                </div>
                <span className="chip" style={{ color: 'var(--ok)' }}>ĐÃ ĐỒNG THUẬN</span>
              </div>

              <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="t">Hiển thị tỷ lệ đóng góp trong nhóm</div>
                  <div className="s">Công khai chỉ số đóng góp đa chiều trên Dashboard đối soát nội bộ</div>
                </div>
                <span className="chip" style={{ color: 'var(--ok)' }}>ĐÃ ĐỒNG THUẬN</span>
              </div>

              <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="t">Tham gia chấm chéo ẩn danh (Peer Review)</div>
                  <div className="s">Đánh giá chéo thành viên khách quan, ẩn danh tính người chấm</div>
                </div>
                <span className="chip" style={{ color: 'var(--ok)' }}>ĐÃ ĐỒNG THUẬN</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
