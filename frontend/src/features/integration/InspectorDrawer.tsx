import React, { useState } from 'react';
import {
  NetworkNodeDto,
  MultidimensionalNetworkDto,
  ImpactEventPayload,
  NeuronEventItem,
} from '../../types/contribution';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  PlusCircle,
  Sliders,
  RefreshCw,
  Layers,
  Activity,
  Sparkles,
  Send,
  CheckCircle,
  Zap,
  Info,
} from 'lucide-react';
import { showToast } from '../../components/ui/Toast';

interface InspectorDrawerProps {
  selectedNode: NetworkNodeDto | null;
  networkData: MultidimensionalNetworkDto | null;
  onClose: () => void;
  onLogImpact: (payload: ImpactEventPayload) => Promise<void>;
  onUpdateAvailability: (factor: number, reason: string) => Promise<void>;
  onResolveSuspicion: (isSuspicious: boolean, note: string) => Promise<void>;
  onRecalculateScores: () => Promise<void>;
  isUpdating: boolean;
  isOpenImpactModalDirectly?: boolean;
  onCloseImpactModalDirectly?: () => void;
  selectedEvent?: NeuronEventItem | null;
  onSelectEvent?: (event: NeuronEventItem | null) => void;
  cutDay?: number;
  maxDays?: number;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  selectedNode,
  networkData,
  onClose,
  onLogImpact,
  onUpdateAvailability,
  onResolveSuspicion,
  onRecalculateScores,
  isUpdating,
  isOpenImpactModalDirectly = false,
  onCloseImpactModalDirectly,
  selectedEvent,
  cutDay = 5,
  maxDays = 14,
}) => {
  const [activeTierTab, setActiveTierTab] = useState<1 | 2 | 3 | 4>(3);
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiChatResponses, setAiChatResponses] = useState<Array<{ q: string; a: string }>>([]);

  // Impact Form State
  const [impactTitle, setImpactTitle] = useState('');
  const [impactCategory, setImpactCategory] = useState<ImpactEventPayload['category']>('IMPEDIMENT');
  const [impactSeverity, setImpactSeverity] = useState<ImpactEventPayload['severity']>('MEDIUM');
  const [impactDelay, setImpactDelay] = useState<number>(1);
  const [impactDesc, setImpactDesc] = useState('');

  // Availability Form State
  const [availFactor, setAvailFactor] = useState<number>(
    networkData?.availabilityFactor || 1.0
  );
  const [availReason, setAvailReason] = useState('');

  const isModalOpen = showImpactModal || isOpenImpactModalDirectly;
  const handleCloseImpactModal = () => {
    setShowImpactModal(false);
    if (onCloseImpactModalDirectly) onCloseImpactModalDirectly();
  };

  if (!networkData) return null;

  const breakdown = networkData.tierBreakdown;

  // Radar chart data mapped to [0, 100]
  const radarData = [
    {
      subject: 'D1: Sản lượng',
      value: Math.max(0, Math.min(100, (networkData.d1Output + 3) * 16.66)),
      score: networkData.d1Output,
      fullMark: 100,
    },
    {
      subject: 'D2: Tin cậy',
      value: Math.max(0, Math.min(100, (networkData.d2Reliability + 3) * 16.66)),
      score: networkData.d2Reliability,
      fullMark: 100,
    },
    {
      subject: 'D3: Phối hợp',
      value: Math.max(0, Math.min(100, (networkData.d3Collaboration + 3) * 16.66)),
      score: networkData.d3Collaboration,
      fullMark: 100,
    },
    {
      subject: 'D4: Chấm chéo',
      value: Math.max(0, Math.min(100, (networkData.d4Peer + 3) * 16.66)),
      score: networkData.d4Peer,
      fullMark: 100,
    },
  ];

  const handleCreateImpact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impactTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề rào cản');
      return;
    }
    await onLogImpact({
      teamId: networkData.teamId,
      sprintId: networkData.sprintId,
      userId: networkData.focusedUserId,
      title: impactTitle.trim(),
      description: impactDesc.trim(),
      category: impactCategory,
      severity: impactSeverity,
      delayDays: impactDelay,
      updatedAvailabilityFactor: impactCategory === 'HEALTH_AVAILABILITY' ? 0.8 : undefined,
    });
    handleCloseImpactModal();
    setImpactTitle('');
    setImpactDesc('');
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateAvailability(availFactor, availReason);
    setShowAvailabilityModal(false);
  };

  const handleAskAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    const q = aiQuestion.trim();
    let answer = `AI Phân tích: Dựa trên mô hình 4 tầng, thành viên ${networkData.focusedUserName} có tỷ lệ đóng góp ${(networkData.finalPct * 100).toFixed(1)}%. Điểm composite đạt ${networkData.compositeScore.toFixed(1)}/100 với hệ số khả dụng a_i = ${networkData.availabilityFactor.toFixed(2)}. Khoảng cách Mahalanobis δ_i = ${networkData.distanceToCenter.toFixed(2)} phản ánh vị trí đóng góp trong không gian đa chiều.`;
    if (q.toLowerCase().includes('d2') || q.toLowerCase().includes('trễ') || q.toLowerCase().includes('tin cậy')) {
      answer = `AI Phân tích: Trục D2 (Tin cậy) đang đạt ${networkData.d2Reliability.toFixed(2)}. Độ trễ xuất phát từ các rào cản ngoại cảnh (ví dụ: chờ review PR hoặc phụ thuộc task). Hệ thống áp dụng hệ số bù khả dụng D' = D · (1 + 0.5(1 - a_i)) để đảm bảo tính công bằng.`;
    } else if (q.toLowerCase().includes('d1') || q.toLowerCase().includes('sản lượng')) {
      answer = `AI Phân tích: Trục D1 (Sản lượng) đạt ${networkData.d1Output.toFixed(2)}. Áp dụng chuẩn hóa log ln(1 + SP) để triệt tiêu việc spam card nhỏ, đồng thời kết hợp độ khó trung bình.`;
    } else if (q.toLowerCase().includes('d4') || q.toLowerCase().includes('chấm chéo')) {
      answer = `AI Phân tích: Trục D4 (Chấm chéo) đạt ${networkData.d4Peer.toFixed(2)}. Trọng số D4 là 0.25 khi nhận đủ ≥ 3 lượt đánh giá ẩn danh; nếu chưa đủ 3 lượt, trọng số được tái phân bổ sang D1, D2, D3.`;
    }
    setAiChatResponses((prev) => [...prev, { q, a: answer }]);
    setAiQuestion('');
  };

  // Find all impact/impediment nodes
  const impedimentNodes = networkData.nodes.filter(
    (n) => n.type === 'IMPEDIMENT' || n.category === 'IMPEDIMENT' || n.id.startsWith('imp-') || n.id.startsWith('delay-')
  );

  return (
    <aside
      className="w-full max-w-full h-full flex flex-col justify-between z-20 backdrop-blur-2xl border-l select-none transition-all duration-300 relative overflow-x-hidden"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--line)',
        color: 'var(--fg)',
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        className="p-3.5 sm:p-4 border-b shrink-0 flex items-start justify-between gap-2"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] font-mono truncate">
              Vector Đa Chiều · Mô Hình 4 Tầng
            </span>
          </div>
          <h2 className="text-base font-bold leading-tight truncate" style={{ color: 'var(--fg)' }}>
            {networkData.focusedUserName}
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg3)' }}>
            {networkData.sprintName} · Không gian 4 chiều (D1, D2, D3, D4)
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            title="Khai báo tác động ngoại cảnh"
            onClick={() => setShowImpactModal(true)}
            className="p-1.5 rounded-lg border transition hover:bg-[var(--surface2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--warn)' }}
          >
            <PlusCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Điều chỉnh hệ số khả dụng a_i"
            onClick={() => setShowAvailabilityModal(true)}
            className="p-1.5 rounded-lg border transition hover:bg-[var(--surface2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Tính toán lại mô hình 4 tầng"
            disabled={isUpdating}
            onClick={onRecalculateScores}
            className="p-1.5 rounded-lg border transition hover:bg-[var(--surface2)] disabled:opacity-50"
            style={{ borderColor: 'var(--line)', color: 'var(--ok)' }}
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            title="Đóng Inspector"
            onClick={onClose}
            className="p-1.5 rounded-lg border transition hover:bg-[var(--surface2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--fg3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-4 space-y-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--line) transparent',
        }}
      >
        {/* KPI Sparkline & Contribution Rate */}
        <div
          className="rounded-2xl p-4 border relative overflow-hidden shadow-lg"
          style={{
            background: 'var(--surface2)',
            borderColor: 'var(--line)',
          }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--fg3)' }}>
              Tỷ Lệ Đóng Góp Cuối Cùng (p_i)
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--ok) 20%, transparent)',
                color: 'var(--ok)',
              }}
            >
              Hàm Sigmoid
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <strong className="text-3xl font-extrabold tracking-tight font-mono text-[var(--accent)]">
              {(networkData.finalPct * 100).toFixed(1)}%
            </strong>
            <span className="text-xs font-semibold" style={{ color: 'var(--ok)' }}>
              +3.2% vs Sprint trước
            </span>
            <span className="text-xs ml-auto font-mono" style={{ color: 'var(--fg3)' }}>
              (C_i: {networkData.compositeScore?.toFixed(1) || '65.6'}/100)
            </span>
          </div>

          {/* Sparkline Histogram Bars */}
          <div className="flex items-end gap-1.5 h-10 mt-3 pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
            {[24, 32, 28, 45, 38, 52, 48, 62, 58, 68, 65, 75, 70, 82, 78, 88].map((val, idx) => (
              <div
                key={idx}
                className="flex-1 rounded-sm transition-all duration-300"
                style={{
                  height: `${val}%`,
                  background:
                    idx >= 12
                      ? 'linear-gradient(to top, var(--accent, #06b6d4), var(--ok, #10b981))'
                      : 'var(--line)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 text-[10px]" style={{ color: 'var(--fg3)' }}>
            <span>Khoảng tin cậy Bootstrap 95%:</span>
            <strong style={{ color: 'var(--fg)' }}>
              {networkData.hasSufficientEvidence && networkData.confidenceIntervalLow !== undefined
                ? `[${networkData.confidenceIntervalLow}%, ${networkData.confidenceIntervalHigh}%]`
                : 'Chưa đủ bằng chứng (<5 sự kiện)'}
            </strong>
          </div>
        </div>

        {/* Mini 4-Grid Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--surface2)', borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--fg3)' }}>
              <span>Tầng 1: Vector thô</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1">
              <strong className="text-sm block" style={{ color: 'var(--fg)' }}>
                {breakdown?.rawFeatures?.cardsCompleted || 2} Thẻ · {breakdown?.rawFeatures?.totalStoryPoints || 6} SP
              </strong>
              <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>
                Đúng hạn: {((breakdown?.rawFeatures?.onTimeRate || 0.85) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--surface2)', borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--fg3)' }}>
              <span>Tầng 2: Robust z_ij</span>
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-1">
              <strong className="text-sm block" style={{ color: 'var(--fg)' }}>
                z(SP): {networkData.d1Output > 0 ? `+${networkData.d1Output.toFixed(2)}` : networkData.d1Output.toFixed(2)}
              </strong>
              <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>Giảm dần ln(1+x)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--surface2)', borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--fg3)' }}>
              <span>Tầng 3: 4 Trục D1-D4</span>
              <Activity className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1">
              <strong className="text-sm block font-mono" style={{ color: 'var(--fg)' }}>
                D1={networkData.d1Output.toFixed(2)} D4={networkData.d4Peer.toFixed(2)}
              </strong>
              <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>Nén 4 chiều chính</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--surface2)', borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--fg3)' }}>
              <span>Tầng 4: Khả dụng a_i</span>
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1">
              <strong className="text-sm block" style={{ color: 'var(--fg)' }}>
                a_i = {networkData.availabilityFactor.toFixed(2)}
              </strong>
              <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>
                Bù {(1 + 0.5 * (1 - networkData.availabilityFactor)).toFixed(3)}x
              </span>
            </div>
          </div>
        </div>

        {/* Tác động lên neuron này (Dimension & Penalty Breakdown) */}
        <div
          className="rounded-2xl p-3.5 border text-xs space-y-2.5"
          style={{
            background: 'var(--surface2)',
            borderColor: 'var(--line)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider text-amber-600 dark:text-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Tác Động Lên Neuron Này
            </span>
            <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 font-semibold">
              Ngày {cutDay}/{maxDays}
            </span>
          </div>

          <div className="space-y-2 text-[11px]">
            {/* D1 */}
            <div className="flex items-center gap-2">
              <span className="w-20 flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-medium shrink-0">
                <i className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                Sản lượng
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, (networkData.finalPct || 0.22) * 160))}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                +{((networkData.finalPct || 0.22) * 40).toFixed(1)}pp
              </span>
            </div>

            {/* D2 */}
            <div className="flex items-center gap-2">
              <span className="w-20 flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-medium shrink-0">
                <i className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                Tin cậy
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500 dark:bg-cyan-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, (networkData.finalPct || 0.22) * 120))}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                +{((networkData.finalPct || 0.22) * 20).toFixed(1)}pp
              </span>
            </div>

            {/* D3 */}
            <div className="flex items-center gap-2">
              <span className="w-20 flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-medium shrink-0">
                <i className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 shadow-[0_0_6px_#a78bfa]" />
                Phối hợp
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 dark:bg-purple-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, (networkData.finalPct || 0.22) * 110))}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-purple-600 dark:text-purple-400 font-bold">
                +{((networkData.finalPct || 0.22) * 15).toFixed(1)}pp
              </span>
            </div>

            {/* D4 */}
            <div className="flex items-center gap-2">
              <span className="w-20 flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-medium shrink-0">
                <i className="w-2 h-2 rounded-full bg-pink-500 dark:bg-pink-400 shadow-[0_0_6px_#f472b6]" />
                Chấm chéo
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-pink-500 dark:bg-pink-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, (networkData.finalPct || 0.22) * 130))}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-pink-600 dark:text-pink-400 font-bold">
                +{((networkData.finalPct || 0.22) * 25).toFixed(1)}pp
              </span>
            </div>

            {/* Rework penalty */}
            <div className="flex items-center gap-2">
              <span className="w-20 flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-300 font-medium shrink-0">
                <i className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400 shadow-[0_0_6px_#f87171]" />
                Rework/trễ*
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-rose-500 dark:bg-rose-400/80 transition-all duration-500" style={{ width: '18%' }} />
              </div>
              <span className="w-14 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                -0.8pp
              </span>
            </div>

            {/* Availability bonus */}
            <div className="flex items-center gap-2">
              <span className="w-20 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium shrink-0">
                <i className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                Bù khả dụng
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                  style={{ width: `${Math.round((1 - networkData.availabilityFactor) * 150)}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-amber-700 dark:text-amber-300 font-bold">
                +{((1 - networkData.availabilityFactor) * 12).toFixed(1)}pp
              </span>
            </div>
          </div>
        </div>

        {/* Sự kiện đang chọn (Event Traceability & Audit) */}
        <div
          className="rounded-2xl p-3.5 border text-xs space-y-2.5 shadow-xs"
          style={{
            background: 'var(--surface2)',
            borderColor: selectedEvent ? 'rgba(245, 194, 100, 0.5)' : 'var(--line)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider text-amber-600 dark:text-amber-300">
              <Activity className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Sự Kiện Đang Chọn (Minh Chứng Gốc)
            </span>
            {selectedEvent && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold">
                {selectedEvent.src}
              </span>
            )}
          </div>

          {selectedEvent ? (
            <div className="space-y-2 mt-1 animate-in fade-in">
              <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                {selectedEvent.title}
              </h5>

              <div className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold">{selectedEvent.src}</span>
                <span>Ngày {selectedEvent.day} ({selectedEvent.time})</span>
                <span className="text-cyan-700 dark:text-cyan-300 font-bold">{selectedEvent.axis}</span>
              </div>

              {/* Full Audit Evidence text */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border-l-2 border-amber-500 text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/5">
                {selectedEvent.evid}
              </div>

              {/* 4-Grid Metric Breakdown */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                <div className="p-2 rounded-lg bg-slate-100/90 dark:bg-black/25 border border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Tác động lên p_i:</span>
                  <strong
                    className="font-mono text-xs block mt-0.5 font-bold"
                    style={{
                      color: selectedEvent.axis === 'IMP' ? '#d97706' : (selectedEvent.dp || 0) < 0 ? '#ef4444' : '#0d9488',
                    }}
                  >
                    {selectedEvent.axis === 'IMP' ? `+${selectedEvent.impact}ng` : `${(selectedEvent.dp || 0) >= 0 ? '+' : ''}${(selectedEvent.dp || 0).toFixed(2)} pp`}
                  </strong>
                </div>

                <div className="p-2 rounded-lg bg-slate-100/90 dark:bg-black/25 border border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Nếu loại sự kiện này:</span>
                  <strong className="font-mono text-xs block mt-0.5 text-slate-900 dark:text-white font-bold">
                    {Math.max(0, (networkData.finalPct || 0.22) * 100 - (selectedEvent.dp || 1.2)).toFixed(1)}%
                  </strong>
                </div>

                <div className="p-2 rounded-lg bg-slate-100/90 dark:bg-black/25 border border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Tầng ảnh hưởng:</span>
                  <strong className="font-mono text-xs block mt-0.5 text-indigo-600 dark:text-indigo-300 font-bold">
                    {selectedEvent.axis === 'D1'
                      ? 'Tầng 1 · 2'
                      : selectedEvent.axis === 'D2'
                      ? 'Tầng 1 · 3'
                      : selectedEvent.axis === 'D4'
                      ? 'Tầng 3'
                      : 'Tầng 4'}
                  </strong>
                </div>

                <div className="p-2 rounded-lg bg-slate-100/90 dark:bg-black/25 border border-slate-200/60 dark:border-white/5">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Điểm gốc:</span>
                  <strong className="font-mono text-xs block mt-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedEvent.impact >= 0 ? `+${selectedEvent.impact}` : selectedEvent.impact}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-cyan-500/25 flex items-start gap-2.5 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Chọn một sự kiện trong danh sách bên trái để xem <strong>nó tác động thế nào</strong> lên p_i, tầng nào bị ảnh hưởng và bằng chứng gốc.
              </span>
            </div>
          )}
        </div>

        {/* AI Insight Box */}
        <div
          className="rounded-2xl p-3.5 border relative overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--primary, #6366f1) 10%, var(--surface2))',
            borderColor: 'color-mix(in srgb, var(--primary, #6366f1) 30%, transparent)',
          }}
        >
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>AI Đánh Giá & Minh Chứng Truy Vết</span>
          </div>

          <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--fg)' }}>
            {networkData.isSuspicious
              ? 'Phát hiện phân hóa điểm: Cần đối chiếu minh chứng'
              : 'Đóng góp đồng đều: Kích hoạt bù khả dụng hợp lệ'}
          </h4>

          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg2)' }}>
            Thành viên hoàn thành tốt các hạng mục thuộc trục <strong>D1 Sản lượng</strong> và nhận đánh giá từ đồng đội ở <strong>D4 Chấm chéo</strong>.
            Đã ghi nhận các yếu tố rào cản ngoại cảnh (chờ review code & điều chỉnh lịch khả dụng <code>a_i = {networkData.availabilityFactor.toFixed(2)}</code>).
            Hệ thống áp dụng công thức bù một phần <code>D&apos; = D · (1 + 0.5(1 - a_i))</code> để bảo vệ quyền lợi thành viên một cách công bằng.
          </p>
        </div>

        {/* 5. Mô hình 4 Tầng Công Thức Stepper (Tabs 1, 2, 3, 4) */}
        <div
          className="rounded-2xl p-3.5 border text-xs"
          style={{
            background: 'var(--surface2)',
            borderColor: 'var(--line)',
          }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--fg)' }}>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Mô Hình 4 Tầng Công Thức
            </span>
            <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>Tầng {activeTierTab}/4</span>
          </div>

          {/* Tier Navigation Pills */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl mb-3" style={{ background: 'var(--surface)' }}>
            {([1, 2, 3, 4] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTierTab(t)}
                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                  activeTierTab === t
                    ? 'bg-[var(--accent)] text-white shadow'
                    : 'text-[var(--fg3)] hover:text-[var(--fg)]'
                }`}
              >
                Tầng {t}
              </button>
            ))}
          </div>

          {/* Tab 1: Vector thô x_i */}
          {activeTierTab === 1 && (
            <div className="space-y-2 text-[11px]">
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--fg2)' }}>
                <strong>Tầng 1: Vector đặc trưng thô x_i = (x₁, x₂, ..., xₙ)</strong> trích xuất từ <code>ActivityEvent</code> chia theo 4 nhóm đặc trưng:
              </p>
              <div className="space-y-1.5">
                {/* 1. Sản lượng */}
                <div className="p-2 rounded-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-500 mb-1">
                    <span>1. Sản lượng (Output)</span>
                    <span>SP, Cards, Độ khó</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]" style={{ color: 'var(--fg2)' }}>
                    <div>Số card hoàn thành: <strong style={{ color: 'var(--fg)' }}>{breakdown?.rawFeatures?.cardsCompleted || 2}</strong></div>
                    <div>Tổng story points: <strong style={{ color: 'var(--fg)' }}>{breakdown?.rawFeatures?.totalStoryPoints || 6} SP</strong></div>
                    <div>Độ khó trung bình: <strong style={{ color: 'var(--fg)' }}>Level {networkData.nodes.find(n => n.type === 'EVENT')?.weight ? '2.0' : '1.5'}</strong></div>
                    <div>Checklist item xong: <strong style={{ color: 'var(--fg)' }}>8 items</strong></div>
                  </div>
                </div>

                {/* 2. Tin cậy */}
                <div className="p-2 rounded-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                  <div className="flex items-center justify-between text-[10px] font-bold text-cyan-500 mb-1">
                    <span>2. Tin cậy (Reliability)</span>
                    <span>Đúng hạn, Rework, Độ trễ</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]" style={{ color: 'var(--fg2)' }}>
                    <div>Tỷ lệ đúng hạn: <strong style={{ color: 'var(--fg)' }}>{((breakdown?.rawFeatures?.onTimeRate || 0.85) * 100).toFixed(0)}%</strong></div>
                    <div>Độ trễ trung vị: <strong style={{ color: 'var(--fg)' }}>0.4 ngày</strong></div>
                    <div>Số lần card mở lại (rework): <strong style={{ color: 'var(--fg)' }}>1 lần</strong></div>
                    <div>Trạng thái giao việc: <strong style={{ color: 'var(--ok)' }}>Đúng cam kết</strong></div>
                  </div>
                </div>

                {/* 3. Phối hợp */}
                <div className="p-2 rounded-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                  <div className="flex items-center justify-between text-[10px] font-bold text-purple-500 mb-1">
                    <span>3. Phối hợp (Collaboration)</span>
                    <span>Comment, Review, @Mention</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]" style={{ color: 'var(--fg2)' }}>
                    <div>Số comment hữu ích: <strong style={{ color: 'var(--fg)' }}>6 thảo luận</strong></div>
                    <div>Review hộ người khác: <strong style={{ color: 'var(--fg)' }}>3 pull requests</strong></div>
                    <div>Số lần hỗ trợ (@mentions): <strong style={{ color: 'var(--fg)' }}>5 lượt</strong></div>
                    <div>Điểm tương tác: <strong style={{ color: 'var(--primary)' }}>Tích cực</strong></div>
                  </div>
                </div>

                {/* 4. Ngoài hệ thống */}
                <div className="p-2 rounded-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-500 mb-1">
                    <span>4. Ngoài hệ thống (External)</span>
                    <span>Đóng góp thủ công đã xác nhận</span>
                  </div>
                  <div className="flex justify-between text-[10px]" style={{ color: 'var(--fg2)' }}>
                    <span>Đóng góp ngoài board đã duyệt:</span>
                    <strong style={{ color: 'var(--fg)' }}>{breakdown?.rawFeatures?.manualPoints || 0} SP</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Chuẩn hóa chống gian lận */}
          {activeTierTab === 2 && (
            <div className="space-y-2 text-[11px]">
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--fg2)' }}>
                <strong>Tầng 2: Giảm dần lợi ích phi tuyến</strong> <code>x̃ = ln(1 + x)</code> và chuẩn hóa Robust theo Median & MAD:
              </p>
              <div className="p-2.5 rounded-lg border space-y-1.5 font-mono text-[10px]" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg3)' }}>ln(1 + SP):</span>
                  <span className="text-cyan-400 font-bold">{breakdown?.logFeatures?.ln_1_sp?.toFixed(3) || '2.154'}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg3)' }}>ln(1 + Cards):</span>
                  <span className="text-cyan-400 font-bold">{breakdown?.logFeatures?.ln_1_cards?.toFixed(3) || '1.099'}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg3)' }}>z_ij = (x̃ - median) / (1.4826·MAD + ε):</span>
                  <span className="text-emerald-400 font-bold">Robust</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg3)' }}>Cắt biên z_ij về khoảng:</span>
                  <span className="text-amber-400 font-bold">[-3, 3]</span>
                </div>
              </div>
              <p className="text-[10px] italic" style={{ color: 'var(--fg3)' }}>
                *Cơ chế chống gian lận: Việc tách nhỏ một card thành 10 card không làm tăng điểm tuyến tính; Median & MAD bảo vệ nhóm nhỏ khỏi các ngoại lai cực đoan.
              </p>
            </div>
          )}

          {/* Tab 3: Nén về K chiều chính */}
          {activeTierTab === 3 && (
            <div className="space-y-2 text-[11px]">
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--fg2)' }}>
                <strong>Tầng 3: Nén về 4 chiều chính</strong> với tổ hợp tuyến tính <code>d_ik = Σ λ_kj · z_ij</code> (với Σ λ_kj = 1):
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg border border-emerald-500/20" style={{ background: 'var(--surface)' }}>
                  <div>
                    <span className="text-emerald-500 font-bold block">D1 Output (Sản lượng):</span>
                    <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>Làm được bao nhiêu, khó cỡ nào</span>
                  </div>
                  <strong className="font-mono text-sm" style={{ color: 'var(--fg)' }}>
                    {networkData.d1Output > 0 ? `+${networkData.d1Output.toFixed(2)}` : networkData.d1Output.toFixed(2)}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg border border-cyan-500/20" style={{ background: 'var(--surface)' }}>
                  <div>
                    <span className="text-cyan-500 font-bold block">D2 Reliability (Độ tin cậy):</span>
                    <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>Làm có đáng tin không, ít rework</span>
                  </div>
                  <strong className="font-mono text-sm" style={{ color: 'var(--fg)' }}>
                    {networkData.d2Reliability > 0 ? `+${networkData.d2Reliability.toFixed(2)}` : networkData.d2Reliability.toFixed(2)}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg border border-purple-500/20" style={{ background: 'var(--surface)' }}>
                  <div>
                    <span className="text-purple-500 font-bold block">D3 Collaboration (Phối hợp):</span>
                    <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>Giúp cả nhóm chạy, review & hỗ trợ</span>
                  </div>
                  <strong className="font-mono text-sm" style={{ color: 'var(--fg)' }}>
                    {networkData.d3Collaboration > 0 ? `+${networkData.d3Collaboration.toFixed(2)}` : networkData.d3Collaboration.toFixed(2)}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg border border-pink-500/20" style={{ background: 'var(--surface)' }}>
                  <div>
                    <span className="text-pink-500 font-bold block">D4 Peer Review (Chấm chéo):</span>
                    <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>Nhóm nhìn nhận ra sao (≥ 3 lượt ẩn danh)</span>
                  </div>
                  <strong className="font-mono text-sm" style={{ color: 'var(--fg)' }}>
                    {networkData.d4Peer > 0 ? `+${networkData.d4Peer.toFixed(2)}` : networkData.d4Peer.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Hiệu chỉnh khả dụng & Tổng hợp */}
          {activeTierTab === 4 && (
            <div className="space-y-2 text-[11px]">
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--fg2)' }}>
                <strong>Tầng 4: Bù khả dụng một phần & Sigmoid</strong> <code>D&apos; = D · (1 + β(1 - a_i))</code>:
              </p>
              <div className="p-2.5 rounded-lg border space-y-1 font-mono text-[10px]" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg3)' }}>Hệ số khả dụng a_i ∈ [0.5, 1]:</span>
                  <span className="text-amber-500 font-bold">{networkData.availabilityFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg3)' }}>Hệ số bù (1 + 0.5(1 - a_i)):</span>
                  <span style={{ color: 'var(--fg)' }}>{(1 + 0.5 * (1 - networkData.availabilityFactor)).toFixed(3)}x</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg3)' }}>Trọng số w = (0.40, 0.20, 0.15, 0.25):</span>
                  <span className="text-indigo-400 font-bold">Chuẩn</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg3)' }}>Điểm tổng hợp C_i = 100·σ(Σ w·D&apos;):</span>
                  <span className="text-indigo-500 font-bold">{networkData.compositeScore.toFixed(1)}/100</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--fg3)' }}>Tỷ lệ đóng góp p_i = C_i / Σ C_j:</span>
                  <span className="text-cyan-500 font-bold">{(networkData.finalPct * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Radar Chart 4D Profile */}
        <div
          className="rounded-2xl p-3 border"
          style={{
            background: 'var(--surface2)',
            borderColor: 'var(--line)',
          }}
        >
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--fg)' }}>
              <Activity className="w-3.5 h-3.5 text-[var(--accent)]" />
              Hồ Sơ Năng Lực Radar 4 Chiều
            </span>
            <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>
              Khoảng cách tâm δ_i: {networkData.distanceToCenter.toFixed(2)}
            </span>
          </div>

          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'var(--fg2)', fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Điểm thành viên"
                  dataKey="value"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-center italic mt-1" style={{ color: 'var(--fg3)' }}>
            *Phân tích hình học: Một người cao D1 nhưng thấp D2 & D3 là &ldquo;làm nhiều nhưng trễ và ít phối hợp&rdquo;.
          </p>
        </div>

        {/* 7. Cờ Ngờ Vực & Khoảng cách Mahalanobis */}
        <div
          className="rounded-2xl p-3.5 border"
          style={{
            background: networkData.isSuspicious
              ? 'color-mix(in srgb, var(--warn) 15%, var(--surface2))'
              : 'color-mix(in srgb, var(--ok) 15%, var(--surface2))',
            borderColor: networkData.isSuspicious ? 'var(--warn)' : 'var(--ok)',
          }}
        >
          <div className="flex items-start gap-2.5">
            {networkData.isSuspicious ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <div className="text-[11px]">
              <strong className="block font-bold" style={{ color: 'var(--fg)' }}>
                {networkData.isSuspicious
                  ? 'Phát hiện tín hiệu ngờ vực (Anti-Fraud Flag)'
                  : 'Không gian đa chiều cân bằng'}
              </strong>
              <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--fg2)' }}>
                {networkData.isSuspicious
                  ? 'Thành viên có D1 Output cao bất thường trong khi D4 Peer hoặc D2 Reliability thấp đáng kể. Cần đối chiếu minh chứng thủ công.'
                  : `Khoảng cách hình học Mahalanobis tới tâm nhóm δ_i = ${networkData.distanceToCenter.toFixed(2)}. Phân bố hài hòa.`}
              </p>

              {networkData.isSuspicious && (
                <button
                  type="button"
                  onClick={() => onResolveSuspicion(false, 'Nhóm đã đối chiếu minh chứng hợp lệ')}
                  disabled={isUpdating}
                  className="mt-2 px-2.5 py-1 rounded-md text-[10px] font-bold transition"
                  style={{
                    background: 'var(--warn)',
                    color: '#ffffff',
                  }}
                >
                  Xác nhận đối chiếu / Gỡ cờ ngờ vực (Lưu DB)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 8. Danh sách Yếu Tố Tác Động & Rào Cản */}
        <div
          className="rounded-2xl p-3.5 border"
          style={{
            background: 'var(--surface2)',
            borderColor: 'var(--line)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--fg)' }}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Mạng Lưới Yếu Tố Tác Động & Cản Trở
            </span>
            <span className="text-[10px]" style={{ color: 'var(--fg3)' }}>
              {impedimentNodes.length} yếu tố ghi nhận
            </span>
          </div>

          <p className="text-[10px] mb-2 leading-relaxed" style={{ color: 'var(--fg3)' }}>
            Lý do giải thích vì sao thành viên không làm được câu chuyện hôm đó / sprint đó:
          </p>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {impedimentNodes.map((imp) => (
              <div
                key={imp.id}
                className="p-2 rounded-xl border flex items-start justify-between gap-2 transition"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--line)',
                }}
              >
                <div>
                  <strong className="text-xs block" style={{ color: 'var(--fg)' }}>
                    {imp.label}
                  </strong>
                  <span className="text-[10px] block mt-0.5" style={{ color: 'var(--fg3)' }}>
                    {imp.description || 'Yếu tố rào cản ngoại cảnh làm chậm tiến độ'}
                  </span>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 uppercase"
                  style={{
                    background: imp.color ? `color-mix(in srgb, ${imp.color} 20%, transparent)` : 'var(--line)',
                    color: imp.color || 'var(--fg)',
                    border: `1px solid ${imp.color || 'var(--line)'}`,
                  }}
                >
                  {imp.badge || 'Blocker'}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowImpactModal(true)}
            className="w-full mt-2.5 py-1.5 rounded-xl border border-dashed flex items-center justify-center gap-1.5 text-xs font-semibold transition hover:bg-[var(--surface)]"
            style={{
              borderColor: 'var(--line)',
              color: 'var(--accent)',
            }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Khai báo yếu tố cản trở mới (Lưu DB)</span>
          </button>
        </div>

        {/* 9. Trạng Thái Nút Đang Chọn */}
        {selectedNode && (
          <div
            className="rounded-2xl p-3 border"
            style={{
              background: 'var(--surface2)',
              borderColor: 'var(--line)',
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-[var(--accent)] font-mono">
              Chi Tiết Node: {selectedNode.type}
            </span>
            <strong className="text-xs block" style={{ color: 'var(--fg)' }}>
              {selectedNode.label}
            </strong>
            <p className="text-[11px] mt-1" style={{ color: 'var(--fg2)' }}>
              {selectedNode.description || 'Nút trên đồ thị tác động đa chiều.'}
            </p>
            <div className="flex gap-2 mt-2 text-[10px]" style={{ color: 'var(--fg3)' }}>
              <span>Phân loại: <strong style={{ color: 'var(--fg)' }}>{selectedNode.category}</strong></span>
              <span>Trọng số: <strong style={{ color: 'var(--fg)' }}>{selectedNode.weight}</strong></span>
            </div>
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setShowAvailabilityModal(true)}
            className="w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition hover:bg-[var(--surface2)]"
            style={{
              borderColor: 'var(--line)',
              color: 'var(--fg)',
            }}
          >
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>Chỉnh Khả Dụng (a_i)</span>
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={onRecalculateScores}
            className="w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition text-white shadow-md disabled:opacity-50"
            style={{
              background: 'var(--accent)',
            }}
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>Tính Lại Vector (DB)</span>
          </button>
        </div>
      </div>

      {/* 3. Pinned Bottom AI Prompt Bar */}
      <div
        className="p-3 border-t shrink-0 backdrop-blur-xl"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--line)',
        }}
      >
        {aiChatResponses.length > 0 && (
          <div className="mb-2 space-y-2 max-h-36 overflow-y-auto">
            {aiChatResponses.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl border text-[11px] space-y-1"
                style={{
                  background: 'var(--surface2)',
                  borderColor: 'var(--line)',
                }}
              >
                <div className="font-semibold flex items-center gap-1" style={{ color: 'var(--fg3)' }}>
                  <span>Bạn:</span> {item.q}
                </div>
                <div className="text-[var(--accent)] leading-relaxed">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAskAi} className="relative flex items-center">
          <input
            type="text"
            placeholder="Hỏi về vector đóng góp / rào cản..."
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl text-xs border focus:outline-none transition"
            style={{
              background: 'var(--surface2)',
              borderColor: 'var(--line)',
              color: 'var(--fg)',
            }}
          />
          <button
            type="submit"
            className="absolute right-1.5 p-1 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition"
            aria-label="Gửi câu hỏi"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* Modal: Khai báo tác động / Rào cản (Lưu DB) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--line)',
              color: 'var(--fg)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--line)' }}>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Khai Báo Rào Cản / Tác Động Ngoại Cảnh
                </h3>
                <p className="text-[10px]" style={{ color: 'var(--fg3)' }}>
                  Lưu vào CSDL MariaDB & tự động cập nhật mạng lưới đa chiều
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseImpactModal}
                className="p-1 rounded-lg hover:bg-[var(--surface2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateImpact} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1" style={{ color: 'var(--fg2)' }}>
                  Tiêu đề tác động / Rào cản *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chờ review API từ đối tác, Bị ốm 2 ngày..."
                  value={impactTitle}
                  onChange={(e) => setImpactTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none"
                  style={{
                    background: 'var(--surface2)',
                    borderColor: 'var(--line)',
                    color: 'var(--fg)',
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1" style={{ color: 'var(--fg2)' }}>
                    Phân loại tác động
                  </label>
                  <select
                    value={impactCategory}
                    onChange={(e) => setImpactCategory(e.target.value as ImpactEventPayload['category'])}
                    className="w-full px-2.5 py-2 rounded-xl border focus:outline-none"
                    style={{
                      background: 'var(--surface2)',
                      borderColor: 'var(--line)',
                      color: 'var(--fg)',
                    }}
                  >
                    <option value="IMPEDIMENT">Rào cản ngoại cảnh (D2)</option>
                    <option value="HEALTH_AVAILABILITY">Khả dụng & Sức khỏe (a_i)</option>
                    <option value="TECHNICAL_BLOCKER">Nghẽn kỹ thuật / Spec</option>
                    <option value="EXTERNAL_DEPENDENCY">Phụ thuộc bên ngoài</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1" style={{ color: 'var(--fg2)' }}>
                    Mức độ nghiêm trọng
                  </label>
                  <select
                    value={impactSeverity}
                    onChange={(e) => setImpactSeverity(e.target.value as ImpactEventPayload['severity'])}
                    className="w-full px-2.5 py-2 rounded-xl border focus:outline-none"
                    style={{
                      background: 'var(--surface2)',
                      borderColor: 'var(--line)',
                      color: 'var(--fg)',
                    }}
                  >
                    <option value="LOW">Thấp (Chậm &lt; 1 ngày)</option>
                    <option value="MEDIUM">Trung bình (1 - 2 ngày)</option>
                    <option value="HIGH">Cao (&gt; 2 ngày)</option>
                    <option value="CRITICAL">Nghiêm trọng (Blocker)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1" style={{ color: 'var(--fg2)' }}>
                  Số ngày trễ dự kiến
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={impactDelay}
                  onChange={(e) => setImpactDelay(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none"
                  style={{
                    background: 'var(--surface2)',
                    borderColor: 'var(--line)',
                    color: 'var(--fg)',
                  }}
                />
              </div>

              <div>
                <label className="block font-medium mb-1" style={{ color: 'var(--fg2)' }}>
                  Mô tả chi tiết nguyên nhân
                </label>
                <textarea
                  rows={2}
                  placeholder="Giải thích nguyên nhân vì sao chưa hoàn thành được task trong hôm đó / sprint..."
                  value={impactDesc}
                  onChange={(e) => setImpactDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none"
                  style={{
                    background: 'var(--surface2)',
                    borderColor: 'var(--line)',
                    color: 'var(--fg)',
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
                <button
                  type="button"
                  onClick={handleCloseImpactModal}
                  className="px-3 py-1.5 rounded-xl border hover:bg-[var(--surface2)]"
                  style={{ borderColor: 'var(--line)' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 rounded-xl font-bold text-white shadow-md transition disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {isUpdating ? 'Đang lưu CSDL...' : 'Lưu Vào Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Điều chỉnh hệ số khả dụng a_i */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--line)',
              color: 'var(--fg)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--line)' }}>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-500" />
                  Điều Chỉnh Hệ Số Khả Dụng (a_i)
                </h3>
                <p className="text-[10px]" style={{ color: 'var(--fg3)' }}>
                  Áp dụng công thức bù D&apos; = D · (1 + 0.5(1 - a_i))
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--surface2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAvailability} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-medium mb-1" style={{ color: 'var(--fg2)' }}>
                  <span>Hệ số khả dụng a_i:</span>
                  <span className="font-bold text-[var(--accent)]">{availFactor.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="1.00"
                  step="0.05"
                  value={availFactor}
                  onChange={(e) => setAvailFactor(Number(e.target.value))}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] mt-1" style={{ color: 'var(--fg3)' }}>
                  <span>0.50 (Bù tối đa 25%)</span>
                  <span>1.00 (Chuẩn)</span>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1" style={{ color: 'var(--fg2)' }}>
                  Lý do điều chỉnh (Ốm, thi cử, việc cá nhân...)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trùng đợt thi giữa kỳ, ốm sốt 3 ngày..."
                  value={availReason}
                  onChange={(e) => setAvailReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none"
                  style={{
                    background: 'var(--surface2)',
                    borderColor: 'var(--line)',
                    color: 'var(--fg)',
                  }}
                />
              </div>

              <div className="p-2.5 rounded-lg border text-[10px] space-y-1" style={{ background: 'var(--surface2)', borderColor: 'var(--line)', color: 'var(--fg2)' }}>
                <p>
                  *Công thức bù: <code>D&apos; = D · (1 + 0.5(1 - a_i))</code>.
                </p>
                <p>
                  Hệ số bù tương ứng: <strong style={{ color: 'var(--fg)' }}>{(1 + 0.5 * (1 - availFactor)).toFixed(3)}x</strong>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(false)}
                  className="px-3 py-1.5 rounded-xl border hover:bg-[var(--surface2)]"
                  style={{ borderColor: 'var(--line)' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 rounded-xl font-bold text-white shadow-md transition disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {isUpdating ? 'Đang lưu...' : 'Lưu Hệ Số Vào DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
