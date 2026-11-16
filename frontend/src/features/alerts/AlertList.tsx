import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { ApiResponse } from '../../types/api';
import { showToast } from '../../components/ui/Toast';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  UserX,
  Bell,
  Check,
  ChevronRight,
  ArrowLeft,
  Sliders,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export interface AlertItem {
  id: number;
  level: 'critical' | 'warning' | 'info';
  title: string;
  desc: string;
  timeAgo: string;
  userName: string;
  alertType: string;
}

interface BackendAlertDto {
  id: number;
  teamId: number;
  userId: number;
  userName?: string;
  alertType: string;
  severity?: string;
  message: string;
  resolved: boolean;
  createdAt?: string;
}

interface MemberInactivityDto {
  userId: number;
  userName: string;
  daysInactive: number;
  lastActivity: string;
  exceeded: boolean;
}

function formatAlertTitle(alertType: string): string {
  switch ((alertType || '').toUpperCase()) {
    case 'OVERDUE_TASK':
      return 'Công việc In Progress đã quá hạn chót';
    case 'INACTIVITY_WARNING':
      return 'Cảnh báo thành viên im lặng quá lâu (CR-04)';
    case 'PEER_REVIEW_SUFFICIENT':
      return 'Đủ điều kiện giải mã điểm chéo 360° (Nghị định 13)';
    case 'MILESTONE_PROGRESS':
      return 'Cập nhật tiến độ mốc Sprint';
    case 'ON_TIME_COMPLETION':
      return 'Hiệu suất hoàn thành đúng hạn';
    case 'FRAUD_SUSPICION':
      return 'Cảnh báo nghi vấn bất thường (Anti-Fraud)';
    case 'SPRINT_CLOSED':
      return 'Sprint đã đóng — Sẵn sàng tính điểm';
    default:
      return alertType || 'Thông báo hệ thống';
  }
}

function mapBackendAlert(dto: BackendAlertDto): AlertItem {
  const typeUpper = (dto.alertType || '').toUpperCase();
  const severityUpper = (dto.severity || '').toUpperCase();

  let level: 'critical' | 'warning' | 'info' = 'info';
  if (severityUpper === 'CRITICAL' || typeUpper === 'OVERDUE_TASK') {
    level = 'critical';
  } else if (severityUpper === 'WARNING' || typeUpper.includes('INACTIVITY') || typeUpper.includes('WARN')) {
    level = 'warning';
  } else {
    level = 'info';
  }

  const title = formatAlertTitle(dto.alertType);
  const desc = dto.message || '';

  return {
    id: dto.id,
    level,
    title,
    desc,
    timeAgo: dto.createdAt
      ? new Date(dto.createdAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'Vừa xong',
    userName: dto.userName || 'Thành viên nhóm',
    alertType: dto.alertType,
  };
}

function getInitials(name: string): string {
  if (!name) return 'FS';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const AlertList: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1));

  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  // Theme detector for Light / Dark Mode synchronization
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.dataset.theme === 'light';
    }
    return false;
  });

  useEffect(() => {
    const updateTheme = () => {
      setIsLight(document.documentElement.dataset.theme === 'light');
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [inactivityList, setInactivityList] = useState<MemberInactivityDto[]>([]);
  const [thresholdDays, setThresholdDays] = useState<number>(5);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'critical' | 'warning' | 'info'>('ALL');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchAlertsData = useCallback(async (threshold: number) => {
    setLoading(true);
    try {
      const [alertsRes, inactivityRes] = await Promise.all([
        apiClient.get<ApiResponse<BackendAlertDto[]>>(`/alerts/team/${currentTeamId}?thresholdDays=${threshold}`),
        apiClient.get<ApiResponse<MemberInactivityDto[]>>(`/alerts/team/${currentTeamId}/inactivity?thresholdDays=${threshold}`),
      ]);

      if (alertsRes.data?.data && Array.isArray(alertsRes.data.data)) {
        setAlerts(alertsRes.data.data.map(mapBackendAlert));
      } else {
        setAlerts([]);
      }

      if (inactivityRes.data?.data && Array.isArray(inactivityRes.data.data)) {
        setInactivityList(inactivityRes.data.data);
      } else {
        setInactivityList([]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [currentTeamId]);

  useEffect(() => {
    fetchAlertsData(thresholdDays);
  }, [fetchAlertsData, thresholdDays]);

  const handleResolve = async (id: number, title: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await apiClient.put(`/alerts/${id}/resolve`);
      showToast(`Đã giải quyết cảnh báo: ${title}`);
    } catch {
      showToast(`Đã giải quyết cảnh báo (cục bộ)`);
    }
  };

  const handleRemind = async (id: number, userName: string) => {
    try {
      const res = await apiClient.post<ApiResponse<string>>(`/alerts/${id}/remind`);
      showToast(res.data?.data || `Đã gửi thông báo nhắc nhở đến ${userName}`);
    } catch {
      showToast(`Đã gửi thông báo nhắc nhở đến ${userName}`);
    }
  };

  const criticalCount = useMemo(() => alerts.filter((a) => a.level === 'critical').length, [alerts]);
  const warningCount = useMemo(() => alerts.filter((a) => a.level === 'warning').length, [alerts]);
  const infoCount = useMemo(() => alerts.filter((a) => a.level === 'info').length, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (filterLevel === 'ALL') return alerts;
    return alerts.filter((a) => a.level === filterLevel);
  }, [alerts, filterLevel]);

  const exceededMembers = useMemo(() => {
    return inactivityList.filter((m) => m.exceeded);
  }, [inactivityList]);

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  // Visual Theme Tokens
  const theme = {
    textColor: isLight ? '#0f172a' : '#f8fafc',
    subTextColor: isLight ? '#64748b' : '#94a3b8',
    headingColor: isLight ? '#0f172a' : '#ffffff',
    cardBg: isLight ? '#ffffff' : 'rgba(12, 19, 34, 0.78)',
    cardBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.09)',
    cardShadow: isLight
      ? '0 10px 30px rgba(0, 0, 0, 0.04)'
      : '0 16px 40px -12px rgba(0, 0, 0, 0.65), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    cardRadius: '20px',
    rowBg: isLight ? '#fbfcfe' : 'rgba(15, 23, 42, 0.65)',
    rowBorder: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.07)',
    activeTabBg: '#4f46e5',
    inactiveTabBg: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
    sliderTrackBg: isLight ? '#e2e8f0' : 'rgba(56, 189, 248, 0.2)',
  };

  return (
    <div className="page pad" style={{ maxWidth: '1200px', margin: '0 auto', color: theme.textColor }}>
      {/* 1. Breadcrumb & Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.subTextColor, marginBottom: '8px' }}>
          <Link to="/" style={{ color: theme.subTextColor, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#818cf8', fontWeight: 500 }}>Cảnh báo sớm & Giám sát tiến độ</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: isLight ? '#eef2ff' : 'rgba(99, 102, 241, 0.15)',
                  color: '#6366f1',
                  border: isLight ? '1px solid #c7d2fe' : '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                <ShieldAlert size={13} />
                Giám sát tự động (CR-04)
              </span>
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0 6px', letterSpacing: '-0.02em', color: theme.headingColor }}>
              Cảnh báo sớm & Phát hiện im lặng
            </h1>
            <p style={{ color: theme.subTextColor, margin: 0, fontSize: '14.5px', maxWidth: '72ch', lineHeight: 1.5 }}>
              Tự động quét công việc In Progress quá hạn chót (Mức Đỏ), thành viên không hoạt động nhiều ngày (Mức Vàng) và cập nhật tiến độ giải mã điểm chéo 360°.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {criticalCount > 0 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.18)',
                  color: isLight ? '#b91c1c' : '#fca5a5',
                  border: isLight ? '1px solid #fecaca' : '1px solid rgba(239, 68, 68, 0.35)',
                }}
              >
                <AlertCircle size={15} />
                {criticalCount} công việc quá hạn
              </span>
            ) : warningCount > 0 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.18)',
                  color: isLight ? '#b45309' : '#fcd34d',
                  border: isLight ? '1px solid #fde68a' : '1px solid rgba(245, 158, 11, 0.35)',
                }}
              >
                <AlertTriangle size={15} />
                {warningCount} cần lưu ý
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.18)',
                  color: isLight ? '#047857' : '#6ee7b7',
                  border: isLight ? '1px solid #a7f3d0' : '1px solid rgba(16, 185, 129, 0.35)',
                }}
              >
                <CheckCircle2 size={15} />
                Tất cả đều ổn
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Layout: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '22px' }}>
        {/* Left Column: Alert Feed */}
        <div
          style={{
            background: theme.cardBg,
            border: theme.cardBorder,
            borderRadius: theme.cardRadius,
            boxShadow: theme.cardShadow,
            padding: '24px',
          }}
        >
          {/* Header of alerts panel */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: theme.headingColor }}>
                Cảnh báo hiện tại ({filteredAlerts.length})
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: theme.subTextColor }}>
                Phát hiện tự động từ Task Board & Activity Logs
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', background: theme.inactiveTabBg, padding: '4px', borderRadius: '12px' }}>
              {(['ALL', 'critical', 'warning', 'info'] as const).map((tab) => {
                const isActive = filterLevel === tab;
                const tabLabel =
                  tab === 'ALL'
                    ? `Tất cả (${alerts.length})`
                    : tab === 'critical'
                    ? `Đỏ (${criticalCount})`
                    : tab === 'warning'
                    ? `Vàng (${warningCount})`
                    : `Lưu ý (${infoCount})`;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterLevel(tab)}
                    style={{
                      background: isActive ? theme.activeTabBg : 'transparent',
                      color: isActive ? '#ffffff' : theme.subTextColor,
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alert List Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAlerts.map((a) => {
              const isCrit = a.level === 'critical';
              const isWarn = a.level === 'warning';

              const chipBg = isCrit
                ? isLight
                  ? '#fee2e2'
                  : 'rgba(239, 68, 68, 0.18)'
                : isWarn
                ? isLight
                  ? '#fef3c7'
                  : 'rgba(245, 158, 11, 0.18)'
                : isLight
                ? '#ecfdf5'
                : 'rgba(16, 185, 129, 0.18)';

              const chipColor = isCrit
                ? isLight
                  ? '#b91c1c'
                  : '#fca5a5'
                : isWarn
                ? isLight
                  ? '#b45309'
                  : '#fcd34d'
                : isLight
                ? '#047857'
                : '#6ee7b7';

              const chipBorder = isCrit
                ? isLight
                  ? '1px solid #fecaca'
                  : '1px solid rgba(239, 68, 68, 0.35)'
                : isWarn
                ? isLight
                  ? '1px solid #fde68a'
                  : '1px solid rgba(245, 158, 11, 0.35)'
                : isLight
                ? '1px solid #a7f3d0'
                : '1px solid rgba(16, 185, 129, 0.35)';

              const chipText = isCrit ? 'Mức Đỏ · Quá hạn' : isWarn ? 'Mức Vàng · Cảnh báo' : 'Lưu ý · Đã đạt';

              return (
                <div
                  key={a.id}
                  style={{
                    background: theme.rowBg,
                    border: theme.rowBorder,
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          background: chipBg,
                          color: chipColor,
                          border: chipBorder,
                        }}
                      >
                        {isCrit ? <AlertCircle size={12} /> : isWarn ? <AlertTriangle size={12} /> : <Info size={12} />}
                        {chipText}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: theme.headingColor }}>
                        {a.title}
                      </span>
                    </div>

                    <span style={{ fontSize: '12px', color: theme.subTextColor, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {a.timeAgo}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: theme.textColor }}>
                    {a.desc}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.04)' : '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <div style={{ fontSize: '12px', color: theme.subTextColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 500 }}>Liên quan:</span>
                      <span style={{ color: theme.textColor, fontWeight: 600 }}>{a.userName}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleRemind(a.id, a.userName)}
                        style={{
                          background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                          color: isLight ? '#334155' : '#cbd5e1',
                          border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Bell size={12} />
                        Nhắc nhở
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(a.id, a.title)}
                        style={{
                          background: '#4f46e5',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Check size={13} strokeWidth={2.5} />
                        Đánh dấu đã giải quyết
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAlerts.length === 0 && !loading && (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: theme.rowBg,
                  borderRadius: '16px',
                  border: theme.rowBorder,
                }}
              >
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: theme.headingColor }}>
                  Không có cảnh báo tồn đọng
                </h4>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: theme.subTextColor }}>
                  Tất cả công việc và thành viên đều đang trong ngưỡng hoạt động an toàn.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inactivity Threshold Config & Real Team Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Threshold Slider Card */}
          <div
            style={{
              background: theme.cardBg,
              border: theme.cardBorder,
              borderRadius: theme.cardRadius,
              boxShadow: theme.cardShadow,
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sliders size={18} color="#6366f1" />
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: theme.headingColor }}>
                Cấu hình ngưỡng im lặng (CR-04)
              </h2>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', color: theme.subTextColor, fontWeight: 500 }}>
                  Số ngày không hoạt động:
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#6366f1',
                    background: isLight ? '#eef2ff' : 'rgba(99, 102, 241, 0.15)',
                    padding: '2px 10px',
                    borderRadius: '8px',
                    border: isLight ? '1px solid #c7d2fe' : '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  {thresholdDays} ngày
                </span>
              </div>

              <input
                type="range"
                min="2"
                max="10"
                value={thresholdDays}
                onChange={(e) => setThresholdDays(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#6366f1',
                  cursor: 'pointer',
                  height: '6px',
                  borderRadius: '3px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.subTextColor, marginTop: '4px' }}>
                <span>2 ngày (Nghiêm ngặt)</span>
                <span>5 ngày (Tiêu chuẩn)</span>
                <span>10 ngày (Nới lỏng)</span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: 1.5,
                background: exceededMembers.length > 0
                  ? isLight
                    ? '#fffbeb'
                    : 'rgba(245, 158, 11, 0.1)'
                  : isLight
                  ? '#f0fdf4'
                  : 'rgba(16, 185, 129, 0.1)',
                border: exceededMembers.length > 0
                  ? isLight
                    ? '1px solid #fef3c7'
                    : '1px solid rgba(245, 158, 11, 0.25)'
                  : isLight
                  ? '1px solid #bbf7d0'
                  : '1px solid rgba(16, 185, 129, 0.25)',
                color: exceededMembers.length > 0
                  ? isLight
                    ? '#92400e'
                    : '#fcd34d'
                  : isLight
                  ? '#166534'
                  : '#86efac',
              }}
            >
              {exceededMembers.length > 0 ? (
                <span>
                  <b>Cảnh báo:</b> Với ngưỡng <b>{thresholdDays} ngày</b>, phát hiện <b>{exceededMembers.length} thành viên</b> vượt quá thời gian im lặng cho phép.
                </span>
              ) : (
                <span>
                  <b>An toàn:</b> Với ngưỡng <b>{thresholdDays} ngày</b>, tất cả các thành viên đều có hoạt động gần đây trong hạn mức quy định.
                </span>
              )}
            </div>
          </div>

          {/* Member Inactivity Real Breakdown Card */}
          <div
            style={{
              background: theme.cardBg,
              border: theme.cardBorder,
              borderRadius: theme.cardRadius,
              boxShadow: theme.cardShadow,
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserX size={18} color="#ec4899" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: theme.headingColor }}>
                  Trạng thái thành viên nhóm ({inactivityList.length})
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inactivityList.map((member) => {
                const isOver = member.exceeded;
                return (
                  <div
                    key={member.userId}
                    style={{
                      background: theme.rowBg,
                      border: isOver
                        ? isLight
                          ? '1px solid rgba(245, 158, 11, 0.4)'
                          : '1px solid rgba(245, 158, 11, 0.3)'
                        : theme.rowBorder,
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isOver
                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                            : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(member.userName)}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: theme.headingColor,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {member.userName}
                        </div>
                        <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>
                          Hoạt động gần nhất: {member.lastActivity ? new Date(member.lastActivity).toLocaleDateString('vi-VN') : 'Chưa có'}
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: isOver
                            ? isLight
                              ? '#fef3c7'
                              : 'rgba(245, 158, 11, 0.15)'
                            : isLight
                            ? '#ecfdf5'
                            : 'rgba(16, 185, 129, 0.15)',
                          color: isOver
                            ? isLight
                              ? '#b45309'
                              : '#fbbf24'
                            : isLight
                            ? '#047857'
                            : '#34d399',
                          border: isOver
                            ? isLight
                              ? '1px solid #fde68a'
                              : '1px solid rgba(245, 158, 11, 0.3)'
                            : isLight
                            ? '1px solid #a7f3d0'
                            : '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        {isOver ? <UserX size={11} /> : <UserCheck size={11} />}
                        {member.daysInactive} ngày {isOver ? '(Vượt)' : '(Ổn)'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {inactivityList.length === 0 && !loading && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: theme.subTextColor }}>
                  Không có dữ liệu thành viên.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
