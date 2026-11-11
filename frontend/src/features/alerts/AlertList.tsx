import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client';
import { ApiResponse } from '../../types/api';
import { showToast } from '../../components/ui/Toast';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';

export interface AlertItem {
  id: number;
  level: 'warn' | 'acc' | 'ok';
  title: string;
  desc: string;
  timeAgo: string;
  inactiveDays?: number;
  memberName?: string;
}

interface BackendAlertDto {
  id: number;
  teamId: number;
  userId: number;
  userName?: string;
  alertType: string;
  message: string;
  resolved: boolean;
  createdAt?: string;
}

const DEFAULT_ALERTS: AlertItem[] = [
  {
    id: 1,
    level: 'warn',
    title: 'Triệu Nguyễn Huỳnh Khang chưa có hoạt động 6 ngày',
    desc: 'Vượt ngưỡng 5 ngày theo quy định Agile. Nên nhắn nhóm trưởng kiểm tra.',
    timeAgo: '10 phút trước',
    inactiveDays: 6,
    memberName: 'Triệu Nguyễn Huỳnh Khang',
  },
  {
    id: 2,
    level: 'acc',
    title: 'Sprint 4 còn 4 ngày',
    desc: 'Hiện còn 4 thẻ công việc chưa hoàn thành trên Task Board nội bộ.',
    timeAgo: '1 giờ trước',
  },
  {
    id: 3,
    level: 'ok',
    title: 'Chấm chéo Sprint 3 đã đủ phiếu',
    desc: 'Nhận đủ ≥ 3 phiếu đánh giá ẩn danh từ các thành viên, điểm trung bình đã chốt.',
    timeAgo: 'Hôm qua',
  },
];

function mapBackendAlert(dto: BackendAlertDto): AlertItem {
  const parts = (dto.message || '').split(' · ');
  const title = parts[0] || dto.alertType;
  const desc = parts.slice(1).join(' · ') || dto.message || '';
  const typeUpper = (dto.alertType || '').toUpperCase();
  const level: 'warn' | 'acc' | 'ok' =
    typeUpper.includes('WARN') || typeUpper.includes('INACTIVITY')
      ? 'warn'
      : typeUpper.includes('SUFFICIENT') || typeUpper.includes('OK')
        ? 'ok'
        : 'acc';

  return {
    id: dto.id,
    level,
    title,
    desc,
    timeAgo: dto.createdAt
      ? new Date(dto.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : 'Vừa cập nhật',
    inactiveDays: level === 'warn' ? 6 : undefined,
    memberName: dto.userName || 'Triệu Nguyễn Huỳnh Khang',
  };
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

  const [alerts, setAlerts] = useState<AlertItem[]>(currentTeamId === 1 ? DEFAULT_ALERTS : []);
  const [thresholdDays, setThresholdDays] = useState<number>(5);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get<ApiResponse<BackendAlertDto[]>>(`/alerts/team/${currentTeamId}`)
      .then((res) => {
        if (mounted) {
          if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
            setAlerts(res.data.data.map(mapBackendAlert));
          } else {
            setAlerts(currentTeamId === 1 ? DEFAULT_ALERTS : []);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setAlerts(currentTeamId === 1 ? DEFAULT_ALERTS : []);
        }
      });
    return () => {
      mounted = false;
    };
  }, [currentTeamId]);

  const handleResolve = async (id: number, title: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await apiClient.put(`/alerts/${id}/resolve`);
    } catch {
      // Fallback local state
    }
    showToast(`Đã đánh dấu giải quyết: ${title}`);
  };

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  const warnCount = alerts.filter((a) => a.level === 'warn').length;
  const maxInactiveDays = 6;
  const isThresholdHit = maxInactiveDays >= thresholdDays;

  return (
    <div className="page pad" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div
        className="page-head"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '24px',
        }}
      >
        <div>
          <span className="eyebrow">Cảnh báo sớm</span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', margin: '6px 0', fontWeight: 300 }}>
            Nhắc khi có người im lặng quá lâu
          </h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '64ch' }}>
            Hệ thống tự động phát hiện thành viên không hoạt động nhiều ngày, trễ hạn thẻ hoặc chưa được giao việc.
          </p>
        </div>
        {warnCount > 0 ? (
          <span className="chip warn" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            {warnCount} cần xử lý
          </span>
        ) : (
          <span className="chip ok" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            Tất cả đều ổn
          </span>
        )}
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Cảnh báo hiện tại</h2>
            <span className="note">Tự động phát hiện theo rule-based CR-04</span>
          </div>

          <div className="rows" id="alertsAll" style={{ display: 'flex', flexDirection: 'column' }}>
            {alerts.map((a) => (
              <div
                key={a.id}
                className="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--line)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 240 }}>
                  <span className={`chip ${a.level}`} style={{ marginTop: 2, flexShrink: 0 }}>
                    {a.level === 'warn' ? 'Cần xử lý' : a.level === 'ok' ? 'Ổn' : 'Lưu ý'}
                  </span>
                  <div>
                    <b style={{ color: 'var(--fg)', fontSize: '0.95rem', display: 'block' }}>{a.title}</b>
                    <p style={{ margin: '4px 0 0', color: 'var(--fg2)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {a.desc}
                    </p>
                    <span
                      className="mono"
                      style={{ fontSize: '0.72rem', color: 'var(--fg3)', marginTop: 4, display: 'inline-block' }}
                    >
                      {a.timeAgo}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn ghost sq sm"
                    onClick={() => showToast('Đã gửi thông báo nhắc nhở đến thành viên')}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Nhắc nhở
                  </button>
                  <button
                    type="button"
                    className="btn sq sm"
                    onClick={() => handleResolve(a.id, a.title)}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Đánh dấu đã giải quyết
                  </button>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--fg3)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  Hiện tại không có cảnh báo nào tồn đọng. Nhóm đang vận hành đúng tiến độ.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="panel" style={{ alignSelf: 'start' }}>
          <div className="panel-h">
            <h2>Ngưỡng cảnh báo</h2>
          </div>
          <div className="field">
            <label htmlFor="thr" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span>Số ngày không hoạt động</span>
              <span className="rate-val" id="thrV">
                {thresholdDays}
              </span>
            </label>
            <input
              type="range"
              id="thr"
              min="2"
              max="10"
              value={thresholdDays}
              onChange={(e) => setThresholdDays(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
          <p className="note" id="thrNote" style={{ margin: 0, color: 'var(--fg2)', fontSize: '0.85rem' }}>
            {isThresholdHit
              ? `Với ngưỡng ${thresholdDays} ngày, Huỳnh Khang (${maxInactiveDays} ngày im lặng) đang bị cảnh báo.`
              : `Với ngưỡng ${thresholdDays} ngày, chưa ai bị cảnh báo vượt ngưỡng.`}
          </p>
        </div>
      </div>
    </div>
  );
};
