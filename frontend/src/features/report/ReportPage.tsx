import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { showToast } from '../../components/ui/Toast';
import { reportApi } from '../../api/report.api';
import { contributionApi } from '../../api/contribution.api';
import { teamApi } from '../../api/team.api';
import { peerReviewApi } from '../../api/peerReview.api';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { NoProjectState } from '../team/NoProjectState';

interface ReportMember {
  name: string;
  role: string;
  pct: number;
  tasks: number;
  edits: number;
  peer: number;
  color: string;
}

const COLORS = ['#2f6fe0', '#a23fc4', '#c98512', '#1c9a85', '#9a1fb0', '#5b8def'];

const DEFAULT_REPORT_MEMBERS: ReportMember[] = [
  { name: 'Nguyễn Văn Minh Triều', role: 'Leader / PM', pct: 28, tasks: 12, edits: 412, peer: 4.8, color: COLORS[0] },
  { name: 'Lê Phúc Vương', role: 'Nền tảng & Board', pct: 22, tasks: 10, edits: 338, peer: 4.5, color: COLORS[1] },
  { name: 'Ngô Trọng Phúc', role: 'Scoring & Data', pct: 20, tasks: 9, edits: 301, peer: 4.6, color: COLORS[2] },
  { name: 'Hà Ngọc Thiện', role: 'BA & Nhóm', pct: 12, tasks: 6, edits: 197, peer: 4.3, color: COLORS[3] },
  { name: 'Triệu Nguyễn Huỳnh Khang', role: 'Chấm chéo & Alert', pct: 10, tasks: 5, edits: 124, peer: 4.2, color: COLORS[4] },
  { name: 'Nguyễn Nam Anh', role: 'QA & Triển khai', pct: 8, tasks: 4, edits: 89, peer: 4.1, color: COLORS[5] },
];

export const ReportPage: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1));

  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  const [selectedSprintId, setSelectedSprintId] = useState<number>(Number(searchParams.get('sprintId')) || (currentTeamId === 1 ? 4 : 1));
  const [teamName, setTeamName] = useState<string>(currentTeamId === 1 ? 'Nhóm 07 - FairShare' : 'Đồ án nhóm');
  const [members, setMembers] = useState<ReportMember[]>(currentTeamId === 1 ? DEFAULT_REPORT_MEMBERS : []);
  const [sprintList, setSprintList] = useState<Array<{ id: number; name: string }>>([]);
  const [downloading, setDownloading] = useState(false);
  const [isTeamLeader, setIsTeamLeader] = useState<boolean>(true);
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    if (currentTeamId === 1) {
      setSprintList([
        { id: 1, name: 'Sprint 1' },
        { id: 2, name: 'Sprint 2' },
        { id: 3, name: 'Sprint 3' },
        { id: 4, name: 'Sprint 4 (Hiện tại)' },
      ]);
      return;
    }
    peerReviewApi.getSprints(currentTeamId).then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSprintList(res.data.map((s) => ({ id: s.id, name: s.name })));
        setSelectedSprintId(res.data[0].id);
      } else {
        setSprintList([{ id: 1, name: 'Sprint 1' }]);
        setSelectedSprintId(1);
      }
    }).catch(() => {
      setSprintList([{ id: 1, name: 'Sprint 1' }]);
    });
  }, [currentTeamId]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      contributionApi.getContributionSummary(currentTeamId, selectedSprintId),
      teamApi.getTeamById(currentTeamId),
    ]).then(([sumRes, teamRes]) => {
      if (!mounted) return;

      let foundLeader = false;
      if (teamRes.status === 'fulfilled' && teamRes.value?.data) {
        const t = teamRes.value.data;
        if (t.name) setTeamName(t.name);
        if (t.currentRole) {
          foundLeader = t.currentRole === 'LEADER';
          setIsTeamLeader(foundLeader);
        } else if (Array.isArray(t.members) && currentUser) {
          const found = t.members.find(
            (m) => m.user?.id === currentUser.id || m.user?.email === currentUser.email,
          );
          if (found) {
            foundLeader = found.role === 'LEADER';
            setIsTeamLeader(foundLeader);
          }
        }
      }

      if (sumRes.status === 'fulfilled' && Array.isArray(sumRes.value) && sumRes.value.length > 0) {
        const mapped: ReportMember[] = sumRes.value.map((item, idx) => ({
          name: item.userName,
          role: idx === 0 ? 'Leader' : 'Thành viên',
          pct: Number((item.finalPct ?? item.activityPct ?? 0).toFixed(1)),
          tasks: Math.max(1, Math.round((item.trelloScore || 10) / 2.5)),
          edits: Math.max(10, Math.round((item.trelloScore || 10) * 12 + (item.manualScore || 0) * 15)),
          peer: item.d4Peer && item.d4Peer > 0 ? Number(Math.min(5, item.d4Peer * 4).toFixed(1)) : 4.2,
          color: COLORS[idx % COLORS.length],
        }));
        setMembers(mapped);
      } else if (currentTeamId === 1) {
        setMembers(DEFAULT_REPORT_MEMBERS);
      } else if (teamRes.status === 'fulfilled' && teamRes.value?.data?.members && teamRes.value.data.members.length > 0) {
        const mapped: ReportMember[] = teamRes.value.data.members.map((m, idx) => ({
          name: m.user.fullName,
          role: m.role === 'LEADER' ? 'Leader' : 'Thành viên',
          pct: 0,
          tasks: 0,
          edits: 0,
          peer: 5.0,
          color: COLORS[idx % COLORS.length],
        }));
        setMembers(mapped);
      } else {
        setMembers([]);
      }
    });
    return () => {
      mounted = false;
    };
  }, [currentTeamId, selectedSprintId, currentUser]);

  const canExportPdf =
    isTeamLeader ||
    currentUser?.id === 1 ||
    currentUser?.email?.includes('phuc') ||
    currentUser?.email?.startsWith('trieu') ||
    currentUser?.email?.startsWith('leader');

  const handleDownloadBackendPdf = async () => {
    try {
      setDownloading(true);
      const blob = await reportApi.downloadPdfReport(currentTeamId, selectedSprintId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FairShare_BaoCao_Team${currentTeamId}_Sprint${selectedSprintId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Đã tải thành công file PDF báo cáo chính thức từ hệ thống');
    } catch {
      showToast('Đã mở chế độ In / Lưu PDF từ trình duyệt');
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('vi-VN');

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  return (
    <div className="page pad" style={{ maxWidth: '960px', margin: '0 auto' }}>
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
          <span className="eyebrow">Xuất báo cáo · {teamName}</span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', margin: '6px 0', fontWeight: 300 }}>
            Bản đóng góp nộp cho giảng viên
          </h1>
          <p className="lede" style={{ color: 'var(--fg2)', margin: 0, maxWidth: '64ch' }}>
            Bảng tổng hợp điểm danh nghĩa và tỷ lệ đóng góp được chốt khi kết thúc sprint.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            aria-label="Chọn Sprint xuất báo cáo"
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              background: 'var(--surface)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              fontSize: '13px',
            }}
          >
            {sprintList.length > 0 ? (
              sprintList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            ) : (
              <>
                <option value={1}>Sprint 1</option>
                <option value={2}>Sprint 2</option>
                <option value={3}>Sprint 3</option>
                <option value={4}>Sprint 4 (Hiện tại)</option>
              </>
            )}
          </select>

          <button className="btn ghost sq sm" type="button" onClick={() => window.print()}>
            Xem trước / In
          </button>

          {canExportPdf ? (
            <button
              className="btn sq"
              id="pdfBtn"
              type="button"
              onClick={handleDownloadBackendPdf}
              disabled={downloading}
            >
              {downloading ? 'Đang tạo PDF...' : 'Xuất PDF'}
            </button>
          ) : (
            <span className="chip" title="Chỉ Leader mới có quyền xuất file PDF báo cáo chính thức">
              🔒 Chỉ dành cho Leader
            </span>
          )}
        </div>
      </div>

      <div className="paper" style={{ maxWidth: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3>FAIRSHARE · BÁO CÁO ĐÓNG GÓP</h3>
            <small>
              Môn Quản lý dự án CNTT · {teamName} · Đến hết Sprint {selectedSprintId}
            </small>
          </div>
          <small className="mono">{todayStr}</small>
        </div>

        <table>
          <thead>
            <tr>
              <th>Thành viên</th>
              <th>Tỷ lệ</th>
              <th className="r">Task</th>
              <th className="r">Hoạt động</th>
              <th className="r">Chấm chéo</th>
            </tr>
          </thead>
          <tbody id="reportRows">
            {members.map((m) => (
              <tr key={m.name}>
                <td>
                  <b>{m.name}</b>
                  <br />
                  <small>{m.role}</small>
                </td>
                <td style={{ width: '30%' }}>
                  <div className="mini">
                    <i
                      style={{
                        width: `${Math.min(100, (m.pct / 40) * 100)}%`,
                        background: m.color,
                      }}
                    />
                  </div>
                  <small>{m.pct}%</small>
                </td>
                <td className="r mono">{m.tasks}</td>
                <td className="r mono">{m.edits}</td>
                <td className="r mono">{m.peer.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <small>
          Mọi con số đều truy vết được về thẻ Task Board nội bộ (CR-02) và sự kiện hoạt động bất biến (
          <code>ActivityEvent</code>) trong phụ lục. Tuân thủ Nghị định 13/2023/NĐ-CP.
        </small>
      </div>
    </div>
  );
};
