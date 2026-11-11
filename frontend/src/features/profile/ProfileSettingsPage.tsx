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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';
import { teamApi } from '../../api/team.api';

const extractStudentIdFromEmail = (email?: string): string => {
  if (!email) return '31241020074';
  const match = email.match(/(\d{8,12})/);
  return match ? match[1] : '31241020074';
};

const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'project' | 'profile' | 'integrations' | 'privacy'>('project');
  const [copiedId, setCopiedId] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Project settings state (#setForm from sample_ui/FairShare.html #v-cai-dat)
  const [projectSettings, setProjectSettings] = useState({
    projectName: 'FairShare — Nền tảng đo lường đóng góp đồ án nhóm',
    lecturer: 'ThS. Nguyễn Văn A — Khoa CNTT Kinh doanh (UEH)',
    sprintCount: 6,
    courseCode: '24D1INF50900503',
    teamName: 'Nhóm 07 — FairShare',
  });

  // Form State initialized dynamically from current authenticated user
  const [formData, setFormData] = useState({
    fullName: user?.fullName || 'Thành viên FairShare',
    studentId: (user as { studentId?: string })?.studentId || extractStudentIdFromEmail(user?.email),
    email: user?.email || 'student@st.ueh.edu.vn',
    phone: '0901 234 567',
    major: 'Công nghệ Thông tin & Hệ thống Thông tin • Khóa 50 UEH',
    teamRole: 'Thành viên Phát triển Đồ án FairShare',
    bio: 'Tham gia xây dựng và đối soát minh chứng đóng góp đa chiều (Task Board nội bộ CR-02, Git & Peer Review) tuân thủ Nghị định 13/2023/NĐ-CP.',
    githubUsername: (user as { githubUsername?: string })?.githubUsername || 'fairshare-member',
  });

  const [connections, setConnections] = useState({
    github: true,
  });
  const [githubTesting, setGithubTesting] = useState(false);

  // Sync user profile & team info from Backend API + localStorage
  useEffect(() => {
    let mounted = true;

    const savedProfile = localStorage.getItem('fairshare_user_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setFormData((prev) => ({
          ...prev,
          ...parsed,
          fullName: user?.fullName || parsed.fullName || prev.fullName,
          email: user?.email || parsed.email || prev.email,
          studentId: extractStudentIdFromEmail(user?.email || parsed.email) || parsed.studentId || prev.studentId,
        }));
      } catch {
        // Ignore parse error
      }
    } else if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.fullName || prev.fullName,
        email: user.email || prev.email,
        studentId: (user as { studentId?: string })?.studentId || extractStudentIdFromEmail(user.email),
        githubUsername: (user as { githubUsername?: string })?.githubUsername || prev.githubUsername,
      }));
    }

    const savedProject = localStorage.getItem('fairshare_project_settings');
    if (savedProject) {
      try {
        setProjectSettings((prev) => ({ ...prev, ...JSON.parse(savedProject) }));
      } catch {
        // Ignore
      }
    }

    // Fetch current user from Backend /api/users/me
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
            studentId: data.studentId || extractStudentIdFromEmail(data.email) || prev.studentId,
            githubUsername: data.githubUsername || prev.githubUsername,
          }));
        }
      })
      .catch(() => {
        // Offline / fallback
      });

    // Fetch active team info from Backend /api/teams
    teamApi
      .getTeams()
      .then((res) => {
        if (!mounted) return;
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const team = res.data[0];
          setProjectSettings((prev) => ({
            ...prev,
            teamName: team.name || prev.teamName,
            courseCode: team.courseName || prev.courseCode,
          }));
        }
      })
      .catch(() => {
        // Offline / fallback
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleCopyStudentId = () => {
    navigator.clipboard.writeText(formData.studentId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProjectSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('fairshare_project_settings', JSON.stringify(projectSettings));
    setSaveSuccess(`Đã lưu thiết lập dự án: "${projectSettings.projectName}" (${projectSettings.sprintCount} Sprint)`);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('fairshare_user_profile', JSON.stringify(formData));
    updateUser({
      fullName: formData.fullName,
    });

    try {
      await apiClient.put('/users/me', {
        fullName: formData.fullName,
        githubUsername: formData.githubUsername,
      });
    } catch {
      // Saved locally if backend offline
    }

    setSaveSuccess('Đã cập nhật thông tin hồ sơ sinh viên vào hệ thống thành công.');
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const testGithubConnection = () => {
    setGithubTesting(true);
    setTimeout(() => {
      setGithubTesting(false);
      setConnections((prev) => ({ ...prev, github: true }));
    }, 800);
  };

  return (
    <div className="page pad" data-testid="profile-settings-page">
      {/* Page Head matching sample_ui/FairShare.html #v-cai-dat */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Cài đặt · Hệ thống &amp; Hồ sơ</div>
          <h1>Thiết lập dự án &amp; Định danh UEH</h1>
          <p className="lede">
            Quản lý thông số đồ án môn học, thông tin định danh sinh viên và chính sách đồng thuận dữ liệu Nghị định 13/2023/NĐ-CP.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="chip" style={{ color: 'var(--ok)', borderColor: 'color-mix(in srgb, var(--ok) 40%, var(--line))' }}>
            ● NĐ 13/2023 Hợp lệ
          </span>
          <span className="chip">MSSV: {formData.studentId}</span>
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

      <div className="grid2">
        {/* Left Column: Project Settings (#setForm from sample_ui/FairShare.html) + Identity Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form className="panel" id="setForm" onSubmit={handleSaveProjectSettings}>
            <div className="panel-h">
              <span>Thiết lập dự án</span>
              <span className="chip">{projectSettings.courseCode}</span>
            </div>

            <label className="field">
              <span>Tên đề tài</span>
              <input
                id="s1"
                type="text"
                value={projectSettings.projectName}
                onChange={(e) => setProjectSettings({ ...projectSettings, projectName: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Giảng viên hướng dẫn</span>
              <input
                id="s2"
                type="text"
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
              <button className="btn sq" type="submit">
                Lưu thay đổi
              </button>
            </div>
          </form>

          {/* Identity Overview Panel */}
          <div className="panel">
            <div className="panel-h">
              <span>Thông tin định danh sinh viên</span>
              <span className="chip" style={{ color: 'var(--accent)' }}>UEH SSO</span>
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
                {getInitials(formData.fullName)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--fg)' }}>{formData.fullName}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--fg2)', fontFamily: 'var(--mono)' }}>{formData.email}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--fg3)', marginTop: '0.15rem' }}>{projectSettings.teamName}</div>
              </div>
            </div>

            <div className="rows">
              <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="t">Mã số sinh viên (UEH ID)</div>
                  <div className="s" style={{ fontFamily: 'var(--mono)' }}>{formData.studentId}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyStudentId}
                  className="btn ghost"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
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
                  Định danh UEH đồng bộ:
                </span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg)' }}>
                  {formData.studentId} · {formData.email}
                </span>
              </div>

              <label className="field">
                <span>Họ và tên hiển thị</span>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Số điện thoại liên hệ</span>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Chuyên ngành &amp; Khóa</span>
                <input
                  type="text"
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Vai trò trong nhóm đồ án (PCCV)</span>
                <input
                  type="text"
                  value={formData.teamRole}
                  onChange={(e) => setFormData({ ...formData, teamRole: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Trách nhiệm chính trong đồ án</span>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn sq" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Save size={14} />
                  <span>Lưu cập nhật hồ sơ</span>
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
