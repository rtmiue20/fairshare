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
import { AlertCircle } from 'lucide-react';
import { ContributionSummaryItem } from '../../types/contribution';

interface MemberRadarChartProps {
  member: ContributionSummaryItem | null;
}

export const MemberRadarChart: React.FC<MemberRadarChartProps> = ({ member }) => {
  if (!member) {
    return (
      <div
        className="flex h-64 flex-col items-center justify-center rounded-xl p-6 text-center"
        style={{
          border: '1px dashed var(--line)',
          background: 'var(--surface2)',
          color: 'var(--fg3)',
        }}
      >
        <p className="text-xs">Chọn một thành viên trong danh sách để xem biểu đồ năng lực 4 chiều.</p>
      </div>
    );
  }

  const isEnoughEvidence = member.isEnoughEvidence ?? member.hasSufficientEvidence ?? true;

  // Trường hợp 1: Chưa đủ bằng chứng (< 5 sự kiện) -> Hiển thị Fallback UI
  if (!isEnoughEvidence) {
    return (
      <div
        data-testid="insufficient-evidence-box"
        className="flex h-72 flex-col items-center justify-center rounded-xl p-6 text-center"
        style={{
          border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--warn) 8%, transparent)',
        }}
      >
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--warn) 20%, transparent)',
            color: 'var(--warn)',
          }}
        >
          <AlertCircle className="h-6 w-6" />
        </div>
        <h4 className="text-base font-bold" style={{ color: 'var(--warn)' }}>
          Chưa đủ bằng chứng
        </h4>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed" style={{ color: 'var(--fg2)' }}>
          Thành viên <span className="font-semibold" style={{ color: 'var(--fg)' }}>{member.userName}</span> có ít hơn 5 sự kiện hoạt động trong sprint. Hệ thống chưa đủ dữ liệu thống kê để lập biểu đồ Radar đa chiều.
        </p>
        <div
          className="mt-3 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            border: '1px solid color-mix(in srgb, var(--warn) 40%, transparent)',
            color: 'var(--warn)',
            backgroundColor: 'color-mix(in srgb, var(--warn) 10%, transparent)',
          }}
        >
          Số lượng sự kiện &lt; 5 (Cần thêm Activity Events)
        </div>
      </div>
    );
  }

  // Chuẩn hóa Z-Score (-3..+3) về thang điểm hiển thị 0-100 trên Radar
  const mapZScoreToChart = (zScore: number | null | undefined): number => {
    if (zScore == null || isNaN(Number(zScore))) return 50;
    const scaled = Math.round(50 + Number(zScore) * 16.67);
    return Math.max(5, Math.min(100, scaled));
  };

  const radarData = [
    {
      dimension: 'D1: Sản lượng',
      fullDimension: 'D1 - Sản lượng (Story Points & Tasks)',
      score: mapZScoreToChart(member.d1Output),
      zValue: Number(member.d1Output ?? 0),
    },
    {
      dimension: 'D2: Tin cậy',
      fullDimension: 'D2 - Tin cậy (Hoàn thành đúng hạn)',
      score: mapZScoreToChart(member.d2Reliability),
      zValue: Number(member.d2Reliability ?? 0),
    },
    {
      dimension: 'D3: Phối hợp',
      fullDimension: 'D3 - Phối hợp (Tương tác nhóm & Docs)',
      score: mapZScoreToChart(member.d3Collaboration),
      zValue: Number(member.d3Collaboration ?? 0),
    },
    {
      dimension: 'D4: Chấm chéo',
      fullDimension: 'D4 - Đánh giá đồng đội (Peer Review)',
      score: mapZScoreToChart(member.d4Peer),
      zValue: Number(member.d4Peer ?? 0),
    },
  ];

  return (
    <div className="flex flex-col gap-4" data-testid="member-radar-chart">
      {/* Member info header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--fg)' }}>{member.userName}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--fg3)', marginTop: 2 }}>
            Tỷ lệ đóng góp:{' '}
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{Number(member.finalPct ?? 0).toFixed(1)}%</span>
            {member.confidenceIntervalLow != null && member.confidenceIntervalHigh != null && (
              <span style={{ marginLeft: 8, fontFamily: 'var(--f-mono)' }}>
                95% CI: [{Number(member.confidenceIntervalLow).toFixed(1)}% - {Number(member.confidenceIntervalHigh).toFixed(1)}%]
              </span>
            )}
          </div>
        </div>
        {/* Status badge */}
        {(member.suspicionFlag || member.isSuspicious) ? (
          <span
            data-testid="suspicion-badge"
            className="chip"
            style={{
              background: 'color-mix(in srgb, var(--bad) 15%, transparent)',
              color: 'var(--bad)',
              border: '1px solid color-mix(in srgb, var(--bad) 30%, transparent)',
              fontWeight: 700,
            }}
          >
            ⚠️ Cần rà soát thủ công
          </span>
        ) : (
          <span
            className="chip"
            style={{
              background: 'color-mix(in srgb, var(--ok) 15%, transparent)',
              color: 'var(--ok)',
              border: '1px solid color-mix(in srgb, var(--ok) 30%, transparent)',
            }}
          >
            Dữ liệu hợp lệ
          </span>
        )}
      </div>
      {(member.suspicionFlag || member.isSuspicious) && (
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--fg3)', lineHeight: 1.5, padding: '0.5rem 0.75rem', borderRadius: 6, background: 'color-mix(in srgb, var(--bad) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--bad) 20%, transparent)' }}>
          <strong style={{ color: 'var(--bad)' }}>Lưu ý kiểm tra:</strong> D1 (Sản lượng) cao bất thường trong khi D4 (Chấm chéo) thấp. Cần xác minh thủ công.
        </p>
      )}
      {/* Biểu đồ Radar Responsive */}
      <div className="h-60 w-full" data-testid="radar-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
            <PolarGrid stroke="var(--line)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: 'var(--fg2)', fontSize: 11, fontFamily: 'var(--f-body)' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: 'var(--fg3)', fontSize: 9 }}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div
                      className="rounded-lg p-2.5 shadow-lg text-xs"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        color: 'var(--fg)',
                      }}
                    >
                      <p className="font-semibold">{data.fullDimension}</p>
                      <p className="mt-1" style={{ color: 'var(--accent)' }}>
                        Điểm hiển thị: <span className="font-bold">{data.score}/100</span>
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--fg3)', fontFamily: 'var(--f-mono)' }}>
                        Z-score: <span>{Number(data?.zValue ?? 0).toFixed(2)}</span>
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
              stroke="var(--accent)"
              strokeWidth={2}
              fill="var(--accent)"
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 4 Cards chi tiết 4 chiều */}
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: 'var(--surface2)', border: '1px solid var(--line)' }}
        >
          <div style={{ color: 'var(--fg3)', fontSize: '11px' }}>D1: Sản lượng</div>
          <div className="mt-1 font-mono text-sm font-bold" style={{ color: 'var(--m1)' }}>
            {Number(member.d1Output ?? 0).toFixed(2)}
          </div>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: 'var(--surface2)', border: '1px solid var(--line)' }}
        >
          <div style={{ color: 'var(--fg3)', fontSize: '11px' }}>D2: Tin cậy</div>
          <div className="mt-1 font-mono text-sm font-bold" style={{ color: 'var(--ok)' }}>
            {Number(member.d2Reliability ?? 0).toFixed(2)}
          </div>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: 'var(--surface2)', border: '1px solid var(--line)' }}
        >
          <div style={{ color: 'var(--fg3)', fontSize: '11px' }}>D3: Phối hợp</div>
          <div className="mt-1 font-mono text-sm font-bold" style={{ color: 'var(--m3)' }}>
            {Number(member.d3Collaboration ?? 0).toFixed(2)}
          </div>
        </div>
        <div
          className="rounded-lg p-2.5 text-center"
          style={{ background: 'var(--surface2)', border: '1px solid var(--line)' }}
        >
          <div style={{ color: 'var(--fg3)', fontSize: '11px' }}>D4: Chấm chéo</div>
          <div className="mt-1 font-mono text-sm font-bold" style={{ color: 'var(--m2)' }}>
            {Number(member.d4Peer ?? 0).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};
