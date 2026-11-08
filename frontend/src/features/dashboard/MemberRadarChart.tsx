import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';
import { ContributionSummaryItem } from '../../types/contribution';

interface MemberRadarChartProps {
  member: ContributionSummaryItem | null;
}

export const MemberRadarChart: React.FC<MemberRadarChartProps> = ({ member }) => {
  if (!member) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
        <p className="text-sm text-slate-400">Chọn một thành viên trong danh sách để xem biểu đồ năng lực 4 chiều.</p>
      </div>
    );
  }

  const isEnoughEvidence = member.isEnoughEvidence ?? member.hasSufficientEvidence ?? true;
  const isSuspicious = member.suspicionFlag ?? member.isSuspicious ?? false;

  // Trường hợp 1: Chưa đủ bằng chứng (< 5 sự kiện) -> Hiển thị Fallback UI
  if (!isEnoughEvidence) {
    return (
      <div
        data-testid="insufficient-evidence-box"
        className="flex h-80 flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-amber-950/20 p-8 text-center"
      >
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h4 className="text-lg font-bold text-amber-300">Chưa đủ bằng chứng</h4>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-300">
          Thành viên <span className="font-semibold text-white">{member.userName}</span> có ít hơn 5 sự kiện hoạt động trong sprint. Hệ thống chưa đủ dữ liệu thống kê để lập biểu đồ Radar đa chiều.
        </p>
        <div className="mt-4 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1 text-xs font-semibold text-amber-300">
          Số lượng sự kiện &lt; 5 (Cần thêm Activity Events)
        </div>
      </div>
    );
  }

  // Chuẩn hóa Z-Score (-3..+3) về thang điểm hiển thị 0-100 trên Radar
  const mapZScoreToChart = (zScore: number | undefined): number => {
    if (zScore === undefined || isNaN(zScore)) return 50;
    // Điểm chuẩn hóa: z = 0 -> 50, z = +3 -> 100, z = -3 -> 0
    const scaled = Math.round(50 + zScore * 16.67);
    return Math.max(5, Math.min(100, scaled));
  };

  const radarData = [
    {
      dimension: 'D1: Sản lượng',
      fullDimension: 'Sản lượng (Story Points & Thẻ xong)',
      score: mapZScoreToChart(member.d1Output),
      zValue: member.d1Output ?? 0,
    },
    {
      dimension: 'D2: Tin cậy',
      fullDimension: 'Độ tin cậy (Đúng hạn & Ít rework)',
      score: mapZScoreToChart(member.d2Reliability),
      zValue: member.d2Reliability ?? 0,
    },
    {
      dimension: 'D3: Phối hợp',
      fullDimension: 'Phối hợp (Review & Hỗ trợ đồng đội)',
      score: mapZScoreToChart(member.d3Collaboration),
      zValue: member.d3Collaboration ?? 0,
    },
    {
      dimension: 'D4: Chấm chéo',
      fullDimension: 'Đánh giá chéo ẩn danh (Peer Review)',
      score: mapZScoreToChart(member.d4Peer),
      zValue: member.d4Peer ?? 0,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header thông tin thành viên */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">{member.userName}</h3>
            {isSuspicious && (
              <span
                data-testid="suspicion-badge"
                className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                ⚠️ Cần rà soát thủ công
              </span>
            )}
            {!isSuspicious && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Dữ liệu hợp lệ
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Hồ sơ năng lực 4 chiều theo Mô hình Khoa học Dữ liệu (Sprint 4 - CR-03)
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400">Tỷ lệ đóng góp: </span>
          <span className="text-base font-black text-sky-400">{member.finalPct?.toFixed(1) ?? '0.0'}%</span>
          {member.confidenceIntervalLow !== undefined && member.confidenceIntervalHigh !== undefined && (
            <div className="text-[11px] text-slate-400">
              95% CI: [{member.confidenceIntervalLow.toFixed(1)}% - {member.confidenceIntervalHigh.toFixed(1)}%]
            </div>
          )}
        </div>
      </div>

      {/* Cảnh báo nghi vấn nếu suspicionFlag = true */}
      {isSuspicious && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs leading-relaxed text-rose-200">
          <strong>Lưu ý kiểm tra:</strong> Thành viên có điểm Sản lượng ($D_1$) cao vượt bậc nhưng điểm Chấm chéo ($D_4$) hoặc Độ tin cậy ($D_2$) thấp đáng kể. Cần đối chiếu lại nhật ký hoạt động thực tế.
        </div>
      )}

      {/* Radar Chart */}
      <div className="relative h-64 w-full" data-testid="radar-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5 shadow-xl">
                      <p className="text-xs font-semibold text-white">{data.fullDimension}</p>
                      <p className="mt-1 text-xs text-sky-400">
                        Điểm hiển thị: <span className="font-bold">{data.score}/100</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Z-score gốc: <span className="font-mono">{Number(data.zValue).toFixed(2)}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Radar
              name="Năng lực thành viên"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="#6366f1"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 4 Cards chi tiết 4 chiều */}
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5 text-center">
          <div className="text-slate-400">D1: Sản lượng</div>
          <div className="mt-1 font-mono text-sm font-bold text-sky-400">
            {Number(member.d1Output ?? 0).toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5 text-center">
          <div className="text-slate-400">D2: Tin cậy</div>
          <div className="mt-1 font-mono text-sm font-bold text-emerald-400">
            {Number(member.d2Reliability ?? 0).toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5 text-center">
          <div className="text-slate-400">D3: Phối hợp</div>
          <div className="mt-1 font-mono text-sm font-bold text-indigo-400">
            {Number(member.d3Collaboration ?? 0).toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5 text-center">
          <div className="text-slate-400">D4: Chấm chéo</div>
          <div className="mt-1 font-mono text-sm font-bold text-purple-400">
            {Number(member.d4Peer ?? 0).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
