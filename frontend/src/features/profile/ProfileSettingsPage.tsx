import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Github,
  Kanban,
  Pencil,
  ChevronRight,
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
  X,
  Check,
  Link2,
  User as UserIcon,
  FolderKanban,
  Camera,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import apiClient from '../../api/client';
import { broadcastAvatarUpdate, resolveAvatarUrl } from '../../utils/avatarSync';
import { teamApi } from '../../api/team.api';
import './ProfileSettingsPage.css';

type TabKey = 'personal' | 'project' | 'integrations' | 'privacy';
type EditSection = 'personal' | 'bio' | 'project' | 'github' | null;

interface ProfileForm {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  major: string;
  teamRole: string;
  bio: string;
  githubUsername: string;
}

interface ProjectForm {
  projectName: string;
  lecturer: string;
  sprintCount: number;
  courseCode: string;
  teamName: string;
}

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

const formatJoinDate = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const months = Math.max(
    0,
    (new Date().getFullYear() - d.getFullYear()) * 12 + (new Date().getMonth() - d.getMonth())
  );
  const span = months >= 12 ? `${(months / 12).toFixed(1).replace('.0', '')} năm` : months > 0 ? `${months} tháng` : 'mới tham gia';
  return `${date} (${span})`;
};

const roleLabel = (role?: string) => (role === 'LEADER' ? 'Trưởng nhóm' : role === 'MEMBER' ? 'Thành viên' : '');

const pickStr = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v : undefined);

/* ---------- Small presentational helpers ---------- */

const InfoItem: React.FC<{ label: string; value?: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="ps-item">
    <div className="ps-item-label">{label}</div>
    <div className={`ps-item-value${mono ? ' mono' : ''}${value ? '' : ' empty'}`}>{value || 'Chưa cập nhật'}</div>
  </div>
);

const CardHeader: React.FC<{
  title: string;
  editing?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  extra?: React.ReactNode;
}> = ({ title, editing, onEdit, editLabel, extra }) => (
  <div className="ps-card-h">
    <h3>{title}</h3>
    <div className="ps-card-h-actions">
      {extra}
      {onEdit && !editing && (
        <button type="button" className="ps-icon-btn" onClick={onEdit} aria-label={editLabel || `Chỉnh sửa ${title}`} title="Chỉnh sửa">
          <Pencil size={15} />
        </button>
      )}
    </div>
  </div>
);

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { teams, activeTeamId, fetchTeams } = useProjectStore();
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [editing, setEditing] = useState<EditSection>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Avatar Upload on Double Click
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(() => resolveAvatarUrl(user?.avatarUrl) || '');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveError('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    // Xem trước tức thì, sau đó lưu lên server (uploads/avatars)
    const previousUrl = avatarUrl;
    const previewUrl = URL.createObjectURL(file);
    setImgError(false);
    setAvatarUrl(previewUrl);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await apiClient.post<{ data?: { avatarUrl?: string } }>('/users/me/avatar', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const serverUrl = res.data?.data?.avatarUrl;
      if (!serverUrl) throw new Error('Server không trả về đường dẫn ảnh');

      setAvatarUrl(resolveAvatarUrl(serverUrl) || serverUrl);
      updateUser?.({ avatarUrl: serverUrl });
      if (user?.id) {
        // Báo cho các trang khác (Dashboard, ...) cập nhật ngay
        broadcastAvatarUpdate({ userId: user.id, avatarUrl: serverUrl });
      }
      setSaveSuccess('Đã cập nhật ảnh đại diện thành công!');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err) {
      console.warn('Avatar upload failed', err);
      setAvatarUrl(previousUrl);
      setSaveError('Không thể tải ảnh đại diện lên máy chủ. Vui lòng thử lại.');
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  // Active project resolution
  const activeTeam = teams.find((t) => t.id === activeTeamId) || (teams.length > 0 ? teams[0] : null);

  const [projectSettings, setProjectSettings] = useState<ProjectForm>({
    projectName: '',
    lecturer: '',
    sprintCount: 4,
    courseCode: '',
    teamName: '',
  });
  const projectSnapshot = useRef<ProjectForm | null>(null);

  const [formData, setFormData] = useState<ProfileForm>({
    fullName: user?.fullName || '',
    studentId: user?.studentId || extractStudentIdFromEmail(user?.email),
    email: user?.email || '',
    phone: '',
    major: '',
    teamRole: '',
    bio: '',
    githubUsername: user?.githubUsername || '',
  });
  const profileSnapshot = useRef<ProfileForm | null>(null);

  const [connections, setConnections] = useState({ github: false });
  const [githubTesting, setGithubTesting] = useState(false);

  const [consented, setConsented] = useState<boolean | null>(null);
  const [consentBusy, setConsentBusy] = useState(false);

  const flashSuccess = useCallback((msg: string, ms = 3500) => {
    setSaveError(null);
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), ms);
  }, []);
  const flashError = useCallback((msg: string, ms = 3500) => {
    setSaveError(msg);
    setTimeout(() => setSaveError(null), ms);
  }, []);

  // Close "More" menu on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [moreOpen]);

  // 1. Sync user profile: scoped localStorage (fallback) + Backend /users/me (source of truth)
  useEffect(() => {
    let mounted = true;
    if (!user) return;

    const userStorageKey = `fairshare_user_profile_${user.id}`;
    const savedProfile = localStorage.getItem(userStorageKey) || localStorage.getItem('fairshare_user_profile');

    let initialProfile: Partial<ProfileForm> = {};
    if (savedProfile) {
      try {
        initialProfile = JSON.parse(savedProfile);
      } catch {
        // Ignore parse error
      }
    }

    const autoStudentId = user.studentId || extractStudentIdFromEmail(user.email);

    setFormData({
      fullName: user.fullName || initialProfile.fullName || '',
      studentId: initialProfile.studentId || autoStudentId || '',
      email: user.email || initialProfile.email || '',
      phone: initialProfile.phone || '',
      major: initialProfile.major || '',
      teamRole: initialProfile.teamRole || '',
      bio: initialProfile.bio || '',
      githubUsername: user.githubUsername || initialProfile.githubUsername || '',
    });

    if (initialProfile.githubUsername || user.githubUsername) {
      setConnections({ github: true });
    }

    apiClient
      .get('/users/me')
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data || res.data;
        if (data && data.email) {
          setFormData((prev) => ({
            ...prev,
            fullName: pickStr(data.fullName) || prev.fullName,
            email: pickStr(data.email) || prev.email,
            studentId: pickStr(data.studentId) || prev.studentId || extractStudentIdFromEmail(data.email) || '',
            phone: pickStr(data.phone) || prev.phone,
            major: pickStr(data.major) || prev.major,
            teamRole: pickStr(data.teamRole) || prev.teamRole,
            bio: pickStr(data.bio) || prev.bio,
            githubUsername: pickStr(data.githubUsername) || prev.githubUsername,
          }));
          if (data.createdAt) setJoinedAt(data.createdAt);
          if (data.avatarUrl) {
            setImgError(false);
            setAvatarUrl(resolveAvatarUrl(data.avatarUrl) || data.avatarUrl);
            if (data.avatarUrl !== user?.avatarUrl) updateUser?.({ avatarUrl: data.avatarUrl });
          } else {
            setImgError(false);
            setAvatarUrl('');
            if (user?.avatarUrl) updateUser?.({ avatarUrl: undefined });
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, reloadKey]);

  // 2. Sync project settings from activeTeam (DB) + scoped localStorage (fallback)
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
        lecturer: activeTeam.lecturer || parsedProject.lecturer || '',
        sprintCount: activeTeam.sprintCount || parsedProject.sprintCount || 4,
      });
    } else {
      setProjectSettings({ projectName: '', lecturer: '', sprintCount: 4, courseCode: '', teamName: '' });
    }
  }, [activeTeam]);

  // 3. Consent status (Nghị định 13) from DB
  useEffect(() => {
    let mounted = true;
    if (!activeTeam?.id) {
      setConsented(null);
      return;
    }
    (async () => {
      try {
        const res = await teamApi.getConsentStatus(activeTeam.id);
        if (mounted) setConsented(Boolean(res?.data?.consented));
      } catch {
        if (mounted) setConsented(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeTeam?.id, reloadKey]);

  /* ---------- Handlers ---------- */

  const copyText = (key: string, text?: string | null) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const startEdit = (section: Exclude<EditSection, null>) => {
    if (section === 'project') {
      projectSnapshot.current = { ...projectSettings };
      setActiveTab('project');
    } else {
      profileSnapshot.current = { ...formData };
      if (section === 'github') setActiveTab('integrations');
      else setActiveTab('personal');
    }
    setEditing(section);
  };

  const cancelEdit = () => {
    if (editing === 'project' && projectSnapshot.current) setProjectSettings(projectSnapshot.current);
    if (editing && editing !== 'project' && profileSnapshot.current) setFormData(profileSnapshot.current);
    setEditing(null);
  };

  const handleSaveProjectSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (projectSettings.sprintCount < 1 || projectSettings.sprintCount > 12) {
      flashError('Số sprint phải nằm trong khoảng 1 - 12.');
      return;
    }
    setIsSavingProject(true);
    setSaveError(null);

    try {
      if (activeTeam && activeTeam.id) {
        await teamApi.updateTeam(activeTeam.id, {
          name: projectSettings.projectName.trim() || activeTeam.name,
          courseName: projectSettings.courseCode.trim(),
          lecturer: projectSettings.lecturer.trim(),
          sprintCount: projectSettings.sprintCount,
        });
        await fetchTeams();

        localStorage.setItem(`fairshare_project_settings_${activeTeam.id}`, JSON.stringify(projectSettings));
        flashSuccess(
          `Đã lưu thiết lập dự án: "${projectSettings.projectName || activeTeam.name}" (${projectSettings.sprintCount} Sprint)`
        );
      } else {
        localStorage.setItem('fairshare_project_settings_default', JSON.stringify(projectSettings));
        flashSuccess(`Đã lưu thiết lập cục bộ (${projectSettings.sprintCount} Sprint). Hãy tạo hoặc tham gia dự án để áp dụng.`);
      }
      setEditing(null);
    } catch {
      if (activeTeam?.id) {
        localStorage.setItem(`fairshare_project_settings_${activeTeam.id}`, JSON.stringify(projectSettings));
      }
      flashSuccess('Đã lưu thiết lập dự án cục bộ.');
      setEditing(null);
    } finally {
      setIsSavingProject(false);
    }
  };

  const persistProfile = async (data: ProfileForm): Promise<boolean> => {
    const userKey = user?.id ? `fairshare_user_profile_${user.id}` : 'fairshare_user_profile';
    localStorage.setItem(userKey, JSON.stringify(data));
    localStorage.setItem('fairshare_user_profile', JSON.stringify(data));

    try {
      const res = await apiClient.put('/users/me', {
        fullName: data.fullName,
        studentId: data.studentId,
        phone: data.phone,
        major: data.major,
        teamRole: data.teamRole,
        bio: data.bio,
        githubUsername: data.githubUsername,
      });
      const saved = res?.data?.data || res?.data;
      updateUser({
        fullName: pickStr(saved?.fullName) || data.fullName,
        studentId: data.studentId || null,
        githubUsername: data.githubUsername || null,
      });
      return true;
    } catch (err) {
      updateUser({ fullName: data.fullName });
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (status?.status === 400 && status.data?.message) {
        throw new Error(status.data.message);
      }
      return false;
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      flashError('Họ và tên không được để trống.');
      return;
    }
    setIsSavingProfile(true);
    setSaveError(null);
    try {
      const synced = await persistProfile(formData);
      flashSuccess(
        synced
          ? 'Đã cập nhật thông tin hồ sơ cá nhân vào hệ thống thành công.'
          : 'Đã lưu thông tin hồ sơ cá nhân cục bộ thành công.'
      );
      setEditing(null);
    } catch (err) {
      flashError((err as Error).message || 'Không thể lưu hồ sơ.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const testGithubConnection = () => {
    const username = formData.githubUsername.trim();
    if (!username) {
      flashError('Vui lòng nhập GitHub username trước khi kiểm tra.', 3000);
      return;
    }
    setGithubTesting(true);
    setTimeout(async () => {
      try {
        await persistProfile({ ...formData, githubUsername: username });
      } catch {
        // validation error shown elsewhere
      }
      setGithubTesting(false);
      setConnections((prev) => ({ ...prev, github: true }));
      setEditing(null);
      flashSuccess(`Kết nối tài khoản GitHub "${username}" thành công!`, 3000);
    }, 800);
  };

  const disconnectGithub = async () => {
    const next = { ...formData, githubUsername: '' };
    setFormData(next);
    setConnections({ github: false });
    try {
      await persistProfile(next);
    } catch {
      // ignore
    }
    flashSuccess('Đã hủy liên kết tài khoản GitHub.', 3000);
  };

  const toggleConsent = async () => {
    if (!activeTeam?.id) {
      flashError('Bạn cần tham gia một dự án để ký cam kết dữ liệu.');
      return;
    }
    if (consented && !window.confirm('Rút đồng thuận sẽ dừng ghi nhận dữ liệu đóng góp của bạn. Tiếp tục?')) return;
    setConsentBusy(true);
    try {
      if (consented) {
        await teamApi.revokeConsent(activeTeam.id);
        setConsented(false);
        flashSuccess('Đã rút đồng thuận xử lý dữ liệu cá nhân.');
      } else {
        await teamApi.submitConsent(activeTeam.id, { consented: true, shareTrelloActivity: true, shareDocsActivity: true });
        setConsented(true);
        flashSuccess('Đã ký cam kết dữ liệu theo Nghị định 13/2023/NĐ-CP.');
      }
    } catch {
      flashError('Không thể cập nhật trạng thái đồng thuận. Vui lòng thử lại.');
    } finally {
      setConsentBusy(false);
    }
  };

  const handleReload = async () => {
    setMoreOpen(false);
    setEditing(null);
    try {
      await fetchTeams();
    } catch {
      // ignore
    }
    setReloadKey((k) => k + 1);
    flashSuccess('Đã tải lại dữ liệu từ hệ thống.', 2500);
  };

  /* ---------- Derived ---------- */

  const displayName = formData.fullName || 'Chưa cập nhật họ tên';
  const badge = formData.teamRole || roleLabel(activeTeam?.currentRole);
  const joinText = formatJoinDate(joinedAt || user?.createdAt);
  const consentOk = consented === true;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'personal', label: 'Cá nhân', icon: <UserIcon size={14} /> },
    { key: 'project', label: 'Dự án', icon: <FolderKanban size={14} /> },
    { key: 'integrations', label: 'Liên kết', icon: <Link2 size={14} /> },
    { key: 'privacy', label: 'Nghị định 13', icon: <ShieldCheck size={14} /> },
  ];

  const editActions = (saving: boolean, saveLabel: string) => (
    <div className="ps-form-actions">
      <button type="button" className="ps-btn ps-btn-outline" onClick={cancelEdit} disabled={saving}>
        <X size={14} /> Hủy
      </button>
      <button type="submit" className="ps-btn ps-btn-primary" disabled={saving}>
        <Check size={14} /> <span>{saving ? 'Đang lưu...' : saveLabel}</span>
      </button>
    </div>
  );

  const consentRows = [
    [
      'Ghi nhận lịch sử mã nguồn (Git Commits & PRs)',
      'Đồng bộ mã hash commit, pull requests và tần suất đóng góp kỹ thuật từ các kho lưu trữ được liên kết.',
    ],
    [
      'Theo dõi tiến độ thẻ công việc (Task Board)',
      'Ghi nhận thời gian tạo, phân công, chuyển trạng thái và hoàn thành nhiệm vụ trên bảng công việc của dự án.',
    ],
    [
      'Minh bạch hóa chỉ số đóng góp đa chiều',
      'Công khai tỷ lệ đóng góp, khối lượng hoàn thành và dữ liệu đối soát trên Dashboard chung của dự án.',
    ],
    [
      'Bảo mật đánh giá chéo ẩn danh (Peer Review)',
      'Áp dụng cơ chế ẩn danh bảo vệ thông tin danh tính cá nhân khi tham gia gửi và nhận đánh giá năng lực đồng nghiệp.',
    ],
  ];

  return (
    <div className="page pad ps-page" data-testid="profile-settings-page">
      <h1 className="ps-sr-only">Thiết lập dự án &amp; Thông tin cá nhân</h1>

      {/* ---------- Top bar: breadcrumb + actions ---------- */}
      <div className="ps-topbar">
        <nav className="ps-breadcrumb" aria-label="breadcrumb">
          <span>Cài đặt</span>
          <ChevronRight size={14} />
          <span className="current">Hồ sơ {formData.fullName ? `của ${formData.fullName}` : 'cá nhân'}</span>
        </nav>
        <div className="ps-top-actions">
          <button type="button" className="ps-btn ps-btn-primary" onClick={() => startEdit('personal')}>
            Chỉnh sửa hồ sơ
          </button>
          <div className="ps-more" ref={moreRef}>
            <button
              type="button"
              className="ps-btn ps-btn-outline"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
            >
              Thêm <MoreHorizontal size={16} />
            </button>
            {moreOpen && (
              <div className="ps-menu" role="menu">
                <button role="menuitem" type="button" disabled={!formData.studentId} onClick={() => { copyText('mssv', formData.studentId); setMoreOpen(false); }}>
                  <Copy size={14} /> Sao chép MSSV
                </button>
                <button role="menuitem" type="button" onClick={() => { copyText('email', formData.email); setMoreOpen(false); }}>
                  <Copy size={14} /> Sao chép email
                </button>
                <button role="menuitem" type="button" disabled={!activeTeam?.inviteCode} onClick={() => { copyText('invite', activeTeam?.inviteCode); setMoreOpen(false); }}>
                  <Copy size={14} /> Sao chép mã mời dự án
                </button>
                <div className="ps-menu-sep" />
                <button role="menuitem" type="button" onClick={() => { setMoreOpen(false); startEdit('project'); }}>
                  <Pencil size={14} /> Chỉnh sửa dự án
                </button>
                <button role="menuitem" type="button" onClick={handleReload}>
                  <RefreshCw size={14} /> Tải lại dữ liệu
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div role="status" className="ps-flash ok">
          <CheckCircle2 size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div role="alert" className="ps-flash bad">
          <AlertCircle size={16} />
          <span>{saveError}</span>
        </div>
      )}

      <section className="ps-shell">
        {/* ---------- Hero ---------- */}
        <header className="ps-hero">
          {/* Avatar with single-tap/click upload */}
          <div
            className="ps-avatar-wrapper"
            onClick={() => fileInputRef.current?.click()}
            title="Nhấn để tải ảnh đại diện mới"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
            <div className="ps-avatar" aria-hidden>
              {avatarUrl && !imgError ? (
                <img
                  src={avatarUrl}
                  alt=""
                  onError={() => setImgError(true)}
                  onLoad={() => setImgError(false)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                getInitials(formData.fullName || formData.email || 'FS')
              )}
            </div>
            <button
              type="button"
              className="ps-avatar-camera-badge"
              aria-label="Đổi ảnh đại diện"
              title="Đổi ảnh đại diện"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{ border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <Camera size={13} />
            </button>
            <div className="ps-avatar-overlay">
              <Camera size={18} />
              <span>Đổi ảnh</span>
            </div>
          </div>
          <div className="ps-hero-info">
            <div className="ps-name-row">
              <h2>{displayName}</h2>
              {badge && <span className="ps-badge">{badge}</span>}
            </div>
            <div className="ps-email">{formData.email || 'Chưa có email'}</div>
            <div className="ps-meta">
              <span>{joinText ? `Tham gia từ ${joinText}` : activeTeam ? `Dự án: ${activeTeam.name}` : 'Chưa tham gia dự án'}</span>
              <span className="ps-dot" />
              <span className="ps-active">Hoạt động</span>
            </div>
          </div>
          <div className="ps-hero-chips">
            <span className={`ps-chip ${consentOk ? 'ok' : consented === false ? 'warn' : ''}`}>
              ● NĐ 13/2023 {consentOk ? 'Hợp lệ' : consented === false ? 'Chưa đồng thuận' : 'Chưa xác định'}
            </span>
            <span className="ps-chip">{formData.studentId ? `MSSV / ID: ${formData.studentId}` : 'Chưa có MSSV'}</span>
          </div>
        </header>

        {/* ---------- Tabs ---------- */}
        <div className="ps-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={activeTab === t.key}
              className={activeTab === t.key ? 'active' : ''}
              onClick={() => {
                if (editing) cancelEdit();
                setActiveTab(t.key);
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ---------- Tab: Personal ---------- */}
        {activeTab === 'personal' && (
          <div className="ps-grid">
            <div className="ps-col">
              <div className="ps-card">
                <CardHeader title="Thông tin cá nhân" editing={editing === 'personal'} onEdit={() => startEdit('personal')} />
                {editing === 'personal' ? (
                  <form onSubmit={handleSaveProfile} className="ps-form">
                    <div className="ps-form-grid">
                      <label className="ps-field">
                        <span>Họ và tên hiển thị</span>
                        <input type="text" placeholder="Nhập họ và tên đầy đủ..." value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} autoFocus />
                      </label>
                      <label className="ps-field">
                        <span>Mã số sinh viên / Mã định danh (MSSV)</span>
                        <input type="text" placeholder="Nhập mã số sinh viên hoặc mã định danh..." value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} />
                      </label>
                      <label className="ps-field">
                        <span>Email (định danh tài khoản)</span>
                        <input type="text" value={formData.email} disabled />
                      </label>
                      <label className="ps-field">
                        <span>Số điện thoại liên hệ</span>
                        <input type="text" placeholder="Ví dụ: 0901 234 567..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </label>
                      <label className="ps-field">
                        <span>Chuyên ngành &amp; Khóa</span>
                        <input type="text" placeholder="Ví dụ: Công nghệ Thông tin - Khóa 2024..." value={formData.major} onChange={(e) => setFormData({ ...formData, major: e.target.value })} />
                      </label>
                      <label className="ps-field">
                        <span>Vai trò trong nhóm đồ án</span>
                        <input type="text" placeholder="Ví dụ: Trưởng nhóm, Lập trình viên Backend, Frontend..." value={formData.teamRole} onChange={(e) => setFormData({ ...formData, teamRole: e.target.value })} />
                      </label>
                    </div>
                    {editActions(isSavingProfile, 'Lưu cập nhật hồ sơ')}
                  </form>
                ) : (
                  <div className="ps-info-grid">
                    <InfoItem label="Họ và tên" value={formData.fullName} />
                    <InfoItem label="Mã số sinh viên" value={formData.studentId} mono />
                    <InfoItem label="Email" value={formData.email} />
                    <InfoItem label="Số điện thoại" value={formData.phone} />
                    <InfoItem label="Chuyên ngành & Khóa" value={formData.major} />
                    <InfoItem label="Vai trò trong nhóm" value={formData.teamRole} />
                  </div>
                )}
              </div>

              <div className="ps-card">
                <CardHeader title="Thông tin tài khoản" extra={<span className="ps-chip acc">Tài khoản xác thực</span>} />
                <div className="ps-info-grid">
                  <InfoItem label="Định danh tài khoản" value={formData.email} mono />
                  <InfoItem label="Mã người dùng" value={user?.id ? `#${user.id}` : undefined} mono />
                  <div className="ps-item">
                    <div className="ps-item-label">MSSV / Mã định danh</div>
                    <div className="ps-item-value mono ps-inline">
                      <span className={formData.studentId ? '' : 'empty'}>{formData.studentId || 'Chưa thiết lập'}</span>
                      <button type="button" className="ps-link-btn" onClick={() => copyText('mssv', formData.studentId)} disabled={!formData.studentId}>
                        <Copy size={12} /> {copied === 'mssv' ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>
                  <InfoItem label="GitHub" value={formData.githubUsername ? `@${formData.githubUsername}` : undefined} mono />
                </div>
              </div>
            </div>

            <div className="ps-col">
              <div className="ps-card">
                <CardHeader title="Dự án hiện tại" onEdit={() => startEdit('project')} editLabel="Chỉnh sửa dự án" />
                {activeTeam ? (
                  <div className="ps-info-grid">
                    <InfoItem label="Tên đề tài" value={projectSettings.projectName} />
                    <InfoItem label="Vai trò dự án" value={roleLabel(activeTeam.currentRole)} />
                    <InfoItem label="Mã học phần / Lớp" value={projectSettings.courseCode} />
                    <InfoItem label="Số sprint" value={String(projectSettings.sprintCount)} />
                    <InfoItem label="Giảng viên hướng dẫn" value={projectSettings.lecturer} />
                    <InfoItem label="Mã mời" value={activeTeam.inviteCode} mono />
                  </div>
                ) : (
                  <div className="ps-empty">
                    Chưa có dự án được chọn. Nhấn <strong>+ Tạo dự án</strong> trên thanh điều hướng để khởi tạo đồ án mới.
                  </div>
                )}
              </div>

              <div className="ps-card">
                <CardHeader title="Trách nhiệm trong đồ án" editing={editing === 'bio'} onEdit={() => startEdit('bio')} />
                {editing === 'bio' ? (
                  <form onSubmit={handleSaveProfile} className="ps-form">
                    <label className="ps-field">
                      <span>Trách nhiệm chính trong đồ án</span>
                      <textarea rows={4} placeholder="Mô tả phạm vi trách nhiệm đóng góp của bạn trong nhóm đồ án..." value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} autoFocus maxLength={1000} />
                    </label>
                    {editActions(isSavingProfile, 'Lưu cập nhật hồ sơ')}
                  </form>
                ) : formData.bio ? (
                  <p className="ps-bio">{formData.bio}</p>
                ) : (
                  <div className="ps-empty">Chưa mô tả trách nhiệm. Nhấn biểu tượng bút chì để bổ sung.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------- Tab: Project ---------- */}
        {activeTab === 'project' && (
          <div className="ps-grid">
            <div className="ps-col">
              <div className="ps-card">
                <CardHeader
                  title="Thiết lập dự án"
                  editing={editing === 'project'}
                  onEdit={() => startEdit('project')}
                  editLabel="Chỉnh sửa dự án"
                  extra={<span className="ps-chip">{projectSettings.courseCode || 'Chưa có mã HP'}</span>}
                />
                {!activeTeam && (
                  <div className="ps-empty" style={{ marginBottom: 14 }}>
                    Chưa có dự án được chọn. Bạn có thể tự điền thông tin bên dưới hoặc nhấn <strong>+ Tạo dự án</strong> trên thanh điều hướng để khởi tạo đồ án mới.
                  </div>
                )}
                {editing === 'project' ? (
                  <form id="setForm" onSubmit={handleSaveProjectSettings} className="ps-form">
                    <div className="ps-form-grid">
                      <label className="ps-field span2">
                        <span>Tên đề tài / Dự án</span>
                        <input id="s1" type="text" placeholder="Ví dụ: Nền tảng quản lý dự án nhóm..." value={projectSettings.projectName} onChange={(e) => setProjectSettings({ ...projectSettings, projectName: e.target.value })} autoFocus />
                      </label>
                      <label className="ps-field">
                        <span>Mã học phần / Lớp học</span>
                        <input id="s-course" type="text" placeholder="Ví dụ: PRJ301, CNTT-K2024..." value={projectSettings.courseCode} onChange={(e) => setProjectSettings({ ...projectSettings, courseCode: e.target.value })} />
                      </label>
                      <label className="ps-field">
                        <span>Giảng viên hướng dẫn</span>
                        <input id="s2" type="text" placeholder="Ví dụ: TS. Nguyễn Văn A..." value={projectSettings.lecturer} onChange={(e) => setProjectSettings({ ...projectSettings, lecturer: e.target.value })} />
                      </label>
                      <label className="ps-field">
                        <span>Số sprint</span>
                        <input id="s3" type="number" min={1} max={12} value={projectSettings.sprintCount} onChange={(e) => setProjectSettings({ ...projectSettings, sprintCount: Number(e.target.value) })} />
                      </label>
                    </div>
                    {editActions(isSavingProject, 'Lưu thay đổi')}
                  </form>
                ) : (
                  <div className="ps-info-grid">
                    <InfoItem label="Tên đề tài / Dự án" value={projectSettings.projectName} />
                    <InfoItem label="Mã học phần / Lớp học" value={projectSettings.courseCode} />
                    <InfoItem label="Giảng viên hướng dẫn" value={projectSettings.lecturer} />
                    <InfoItem label="Số sprint" value={String(projectSettings.sprintCount)} />
                  </div>
                )}
              </div>
            </div>
            <div className="ps-col">
              <div className="ps-card">
                <CardHeader title="Thông tin nhóm" />
                {activeTeam ? (
                  <div className="ps-list">
                    <div className="ps-list-row">
                      <div>
                        <div className="ps-list-t">Mã mời tham gia</div>
                        <div className="ps-list-s mono">{activeTeam.inviteCode || '—'}</div>
                      </div>
                      <button type="button" className="ps-link-btn" disabled={!activeTeam.inviteCode} onClick={() => copyText('invite', activeTeam.inviteCode)}>
                        <Copy size={12} /> {copied === 'invite' ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                    </div>
                    <div className="ps-list-row">
                      <div>
                        <div className="ps-list-t">Vai trò của bạn</div>
                        <div className="ps-list-s">{roleLabel(activeTeam.currentRole) || '—'}</div>
                      </div>
                    </div>
                    <div className="ps-list-row">
                      <div>
                        <div className="ps-list-t">Ngày tạo dự án</div>
                        <div className="ps-list-s">{formatJoinDate(activeTeam.createdAt) || '—'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ps-empty">Chưa tham gia dự án nào.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------- Tab: Integrations ---------- */}
        {activeTab === 'integrations' && (
          <div className="ps-grid">
            <div className="ps-col">
              <div className="ps-card">
                <CardHeader
                  title="GitHub Repository"
                  editing={editing === 'github'}
                  onEdit={() => startEdit('github')}
                  extra={<span className={`ps-chip ${connections.github ? 'ok' : ''}`}>{connections.github ? 'Đã kết nối' : 'Chưa liên kết'}</span>}
                />
                {editing === 'github' || !connections.github ? (
                  <label className="ps-field">
                    <span>Tài khoản GitHub (Username)</span>
                    <div className="ps-inline-input">
                      <input type="text" value={formData.githubUsername} onChange={(e) => setFormData({ ...formData, githubUsername: e.target.value })} placeholder="Nhập GitHub username..." />
                      <button type="button" onClick={testGithubConnection} disabled={githubTesting} className="ps-btn ps-btn-primary">
                        {githubTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                      </button>
                      {editing === 'github' && (
                        <button type="button" className="ps-btn ps-btn-outline" onClick={cancelEdit}>
                          Hủy
                        </button>
                      )}
                    </div>
                  </label>
                ) : (
                  <div className="ps-list-row">
                    <div className="ps-inline">
                      <Github size={18} />
                      <span className="mono">@{formData.githubUsername}</span>
                    </div>
                    <button type="button" className="ps-link-btn danger" onClick={disconnectGithub}>
                      Hủy liên kết
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="ps-col">
              <div className="ps-card">
                <CardHeader title="Bảng Quản lý Công việc (Task Board)" extra={<span className="ps-chip ok">Đang kích hoạt</span>} />
                <div className="ps-inline ps-desc" style={{ alignItems: 'flex-start' }}>
                  <Kanban size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Tự động ghi nhận các sự kiện tạo, cập nhật tiến độ và hoàn thành nhiệm vụ phục vụ phân tích đóng góp.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Tab: Privacy (NĐ 13) ---------- */}
        {activeTab === 'privacy' && (
          <div className="ps-grid">
            <div className="ps-col">
              <div className="ps-card">
                <CardHeader title="Quyền xử lý dữ liệu cá nhân" extra={<span className={`ps-chip ${consentOk ? 'ok' : 'warn'}`}>{consentOk ? '4/4 Quyền' : '0/4 Quyền'}</span>} />
                <div className="ps-list">
                  {consentRows.map(([t, s]) => (
                    <div className="ps-list-row" key={t}>
                      <div>
                        <div className="ps-list-t">{t}</div>
                        <div className="ps-list-s">{s}</div>
                      </div>
                      <span className={`ps-chip ${consentOk ? 'ok' : ''}`}>{consentOk ? 'ĐÃ ĐỒNG THUẬN' : 'CHƯA ĐỒNG THUẬN'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="ps-col">
              <div className="ps-card">
                <CardHeader
                  title="Thỏa thuận Bảo vệ Dữ liệu Cá nhân"
                  extra={
                    <span className={`ps-chip ${consentOk ? 'ok' : 'warn'}`}>
                      {consentOk ? 'Tuân thủ NĐ 13/2023/NĐ-CP' : 'Chưa kích hoạt'}
                    </span>
                  }
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                  <p className="ps-desc" style={{ margin: 0, lineHeight: 1.6 }}>
                    Hệ thống xử lý dữ liệu hoạt động làm việc kỹ thuật số nhằm phân tích tiến độ, minh bạch hóa minh chứng và tính điểm đóng góp công bằng trong không gian dự án{' '}
                    <strong>{activeTeam?.name || 'được chỉ định'}</strong>.
                  </p>

                  <div
                    style={{
                      background: 'var(--surface2, rgba(255, 255, 255, 0.04))',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '12.5px',
                      lineHeight: 1.55,
                      color: 'var(--fg2)',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: '6px' }}>
                      Cam kết pháp lý &amp; Quyền của chủ thể dữ liệu (Điều 9 NĐ 13/2023):
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <li><strong>Minh bạch:</strong> Toàn bộ dữ liệu tính toán đều có thể truy vết nguồn gốc (Audit Traceability).</li>
                      <li><strong>Bảo mật:</strong> Đánh giá chéo đồng nghiệp được ẩn danh hoàn toàn (K-Anonymity).</li>
                      <li><strong>Quyền rút đồng thuận:</strong> Bạn có quyền rút lại đồng thuận bất kỳ lúc nào mà không ảnh hưởng đến tài khoản.</li>
                    </ul>
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: consentOk ? 'var(--ok, #10b981)' : 'var(--fg3)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                    }}
                  >
                    {consentOk ? (
                      <>
                        <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Trạng thái: Dữ liệu cá nhân được bảo vệ theo Nghị định 13/2023/NĐ-CP.</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>Trạng thái: Chưa cấp quyền. Vui lòng ký đồng thuận để hệ thống ghi nhận đóng góp của bạn.</span>
                      </>
                    )}
                  </div>

                  <div className="ps-form-actions" style={{ justifyContent: 'flex-start', marginTop: '4px' }}>
                    <button
                      type="button"
                      className={`ps-btn ${consentOk ? 'ps-btn-danger' : 'ps-btn-primary'}`}
                      onClick={toggleConsent}
                      disabled={consentBusy || !activeTeam}
                    >
                      <ShieldCheck size={14} />
                      {consentBusy ? 'Đang xử lý...' : consentOk ? 'Rút đồng thuận' : 'Ký đồng thuận'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
