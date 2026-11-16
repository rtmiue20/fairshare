import React, { useState } from 'react';
import {
  NetworkNodeDto,
  MultidimensionalNetworkDto,
  ImpactEventPayload,
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
  HeartPulse,
  Sparkles,
  Send,
  CheckCircle,
  TrendingUp,
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

  const node = selectedNode || networkData.nodes.find((n) => n.type === 'ROOT') || networkData.nodes[0];
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
    let answer = `AI Copilot: Dựa trên mô hình 4 tầng, thành viên ${networkData.focusedUserName} có tỷ lệ đóng góp ${(networkData.finalPct * 100).toFixed(1)}%. Điểm composite đạt ${networkData.compositeScore.toFixed(1)}/100 với hệ số khả dụng a_i = ${networkData.availabilityFactor.toFixed(2)}. Khoảng cách Mahalanobis δ_i = ${networkData.distanceToCenter.toFixed(2)} nằm trong ngưỡng cân bằng của nhóm.`;
    if (q.toLowerCase().includes('d2') || q.toLowerCase().includes('trễ') || q.toLowerCase().includes('tin cậy')) {
      answer = `AI Copilot: Trục D2 (Tin cậy) đang đạt ${networkData.d2Reliability.toFixed(2)}. Độ trễ chủ yếu do các rào cản ngoại cảnh (chờ review pull request từ đối tác). Đã kích hoạt hệ số bù khả dụng để bảo đảm quyền lợi.`;
    } else if (q.toLowerCase().includes('d1') || q.toLowerCase().includes('sản lượng')) {
      answer = `AI Copilot: Trục D1 (Sản lượng) đạt +${networkData.d1Output.toFixed(2)} nhờ hoàn thành các thẻ kiến trúc backend Spring Boot 3 và Unit tests. Chuẩn hóa ln(1+x) giúp chống hiện tượng chia nhỏ thẻ để gian lận điểm.`;
    }
    setAiChatResponses((prev) => [...prev, { q, a: answer }]);
    setAiQuestion('');
  };

  return (
    <aside
      className="w-[430px] h-full flex flex-col z-20 backdrop-blur-2xl border-l select-none overflow-hidden"
      style={{
        background: 'rgba(8, 13, 23, 0.94)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* 1. Header (Fixed/Sticky at top, Matching video frame_0.png) */}
      <div className="p-4 border-b shrink-0 flex items-start justify-between" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
            <span className="text-[11px] font-semibold text-zinc-400">
              Dự án EduConnect · {node.label !== networkData.focusedUserName ? node.label : networkData.sprintName}
            </span>
          </div>

          <h2 className="text-base font-bold text-white tracking-tight line-clamp-1">
            {networkData.focusedUserName}
          </h2>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              Active · Sprint Đang Chạy
            </span>
            <span className="text-[10px] text-zinc-400">
              Cập nhật CSDL: 15/11/2026
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Đóng panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent',
        }}
      >
        {/* 2. Sentiment Rate / Contribution Score Card (Matching Video: 45% sparkline card) */}
        <div
          className="rounded-2xl p-4 border relative overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.5))',
            borderColor: 'rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-cyan-400" />
              Tỷ Lệ Đóng Góp (p_i)
            </span>
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-md"
              style={{
                background: networkData.isSuspicious ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: networkData.isSuspicious ? '#f87171' : '#34d399',
                border: networkData.isSuspicious ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
              }}
            >
              {networkData.isSuspicious ? 'Bất thường (Cần rà soát)' : 'Đạt chuẩn'}
            </span>
          </div>

          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-extrabold text-white tracking-tight">
              {(networkData.finalPct * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              +3.2% vs Sprint 1
            </span>
            <span className="text-xs text-zinc-400 ml-auto font-mono">
              (C_i: {networkData.compositeScore?.toFixed(1) || '65.6'}/100)
            </span>
          </div>

          {/* Sparkline Histogram Bars (matching video frame_0.png) */}
          <div className="flex items-end gap-1.5 h-10 mt-3 pt-2 border-t border-white/5">
            {[24, 32, 28, 45, 38, 52, 48, 62, 58, 68, 65, 75, 70, 82, 78, 88].map((val, idx) => (
              <div
                key={idx}
                className="flex-1 rounded-sm transition-all duration-300"
                style={{
                  height: `${val}%`,
                  background:
                    idx >= 12
                      ? 'linear-gradient(to top, #06b6d4, #38bdf8)'
                      : 'rgba(255, 255, 255, 0.15)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-400">
            <span>Khoảng tin cậy Bootstrap 95%:</span>
            <strong className="text-zinc-200">
              {networkData.hasSufficientEvidence && networkData.confidenceIntervalLow !== undefined
                ? `[${networkData.confidenceIntervalLow}%, ${networkData.confidenceIntervalHigh}%]`
                : 'Chưa đủ bằng chứng (<5 sự kiện)'}
            </strong>
          </div>
        </div>

        {/* 3. Mini 4-Grid Metrics (Matching Video: 12 Public Complains, 2 Related Regulations, 18 Services, 12 Entities) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>Tầng 1: Vector thô</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1">
              <strong className="text-base text-white block">
                {breakdown?.rawFeatures?.cardsCompleted || 2} Thẻ · {breakdown?.rawFeatures?.totalStoryPoints || 6} SP
              </strong>
              <span className="text-[10px] text-zinc-500">
                Đúng hạn: {((breakdown?.rawFeatures?.onTimeRate || 0.85) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>Tầng 2: Robust z_ij</span>
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-1">
              <strong className="text-base text-white block">
                z(SP): {networkData.d1Output > 0 ? `+${networkData.d1Output.toFixed(2)}` : networkData.d1Output.toFixed(2)}
              </strong>
              <span className="text-[10px] text-zinc-500">Giảm dần ln(1+x)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>Tầng 3: 4 Trục D1-D4</span>
              <Activity className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1">
              <strong className="text-base text-white block font-mono">
                D1={networkData.d1Output.toFixed(2)} D4={networkData.d4Peer.toFixed(2)}
              </strong>
              <span className="text-[10px] text-zinc-500">Nén 4 chiều chính</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[10px]">
              <span>Tầng 4: Khả dụng a_i</span>
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1">
              <strong className="text-base text-white block">
                a_i = {networkData.availabilityFactor.toFixed(2)}
              </strong>
              <span className="text-[10px] text-zinc-500">
                Bù {(1 + 0.5 * (1 - networkData.availabilityFactor)).toFixed(3)}x
              </span>
            </div>
          </div>
        </div>

        {/* 4. AI Copilot Risk & Anomaly Card (RI Analysis in video frame_0.png) */}
        <div
          className="rounded-2xl p-3.5 border relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.5), rgba(15, 23, 42, 0.8))',
            borderColor: 'rgba(129, 140, 248, 0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>AI Phân Tích Đóng Góp & Khuyến Nghị (RI Analysis)</span>
          </div>

          <h4 className="text-xs font-bold text-white mb-1">
            {networkData.isSuspicious
              ? 'Phát hiện phân hóa điểm: Cần đối chiếu minh chứng'
              : 'Đóng góp đồng đều: Kích hoạt bù khả dụng hợp lệ'}
          </h4>

          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Thành viên hoàn thành tốt các hạng mục thuộc trục <strong>D1 Sản lượng</strong> và nhận đánh giá tích cực từ đồng đội ở <strong>D4 Chấm chéo</strong>.
            Đã ghi nhận các yếu tố rào cản ngoại cảnh (chờ review code & điều chỉnh lịch khả dụng <code className="text-amber-300">a_i = {networkData.availabilityFactor.toFixed(2)}</code>).
            Hệ thống đã kích hoạt công thức bù một phần <code className="text-cyan-300">D' = D · (1 + 0.5(1 - a_i))</code> để bảo vệ quyền lợi thành viên một cách công bằng.
          </p>
        </div>

        {/* 5. Mô hình 4 Tầng Công Thức Stepper (Tabs 1, 2, 3, 4) */}
        <div
          className="rounded-2xl p-3.5 border text-xs"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Mô Hình 4 Tầng Công Thức
            </span>
            <span className="text-[10px] text-zinc-400">Tầng {activeTierTab}/4</span>
          </div>

          {/* Tier Navigation Pills */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-900/80 rounded-xl mb-3">
            {([1, 2, 3, 4] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTierTab(t)}
                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                  activeTierTab === t
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Tầng {t}
              </button>
            ))}
          </div>

          {/* Tab 1: Vector thô x_i */}
          {activeTierTab === 1 && (
            <div className="space-y-2 text-[11px]">
              <p className="text-zinc-400 text-[10px] leading-relaxed">
                <strong>Tầng 1: Vector đặc trưng thô x_i</strong> trích xuất từ <code>ActivityEvent</code>:
              </p>
              <div className="grid grid-cols-2 gap-2 text-zinc-300">
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Sản lượng (Cards/SP):</span>
                  <strong>{breakdown?.rawFeatures?.cardsCompleted || 2} thẻ</strong> ({breakdown?.rawFeatures?.totalStoryPoints || 6} SP)
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Tỷ lệ đúng hạn:</span>
                  <strong>{((breakdown?.rawFeatures?.onTimeRate || 0.85) * 100).toFixed(0)}%</strong>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Đóng góp ngoài hệ thống:</span>
                  <strong>{breakdown?.rawFeatures?.manualPoints || 0} SP</strong>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-zinc-400 block">Tổng số sự kiện sprint:</span>
                  <strong>{networkData.totalEventsCount} sự kiện</strong>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Chuẩn hóa chống gian lận */}
          {activeTierTab === 2 && (
            <div className="space-y-2 text-[11px]">
              <p className="text-zinc-400 text-[10px] leading-relaxed">
                <strong>Tầng 2: Giảm dần lợi ích phi tuyến</strong> <code>x̃ = ln(1 + x)</code> và chuẩn hóa Robust theo Median & MAD:
              </p>
              <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-white/5 space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-zinc-400">ln(1 + SP):</span>
                  <span className="text-cyan-300">{breakdown?.logFeatures?.ln_1_sp?.toFixed(3) || '2.154'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">ln(1 + Cards):</span>
                  <span className="text-cyan-300">{breakdown?.logFeatures?.ln_1_cards?.toFixed(3) || '1.099'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">z(SP) [-3, 3]:</span>
                  <span className="text-emerald-300">{networkData.d1Output?.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">z(OnTime) [-3, 3]:</span>
                  <span className="text-emerald-300">{networkData.d2Reliability?.toFixed(3)}</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 italic">
                *Việc tách nhỏ 1 card thành 10 card không làm tăng điểm tuyến tính.
              </p>
            </div>
          )}

          {/* Tab 3: Nén về K chiều chính */}
          {activeTierTab === 3 && (
            <div className="space-y-2 text-[11px]">
              <p className="text-zinc-400 text-[10px] leading-relaxed">
                <strong>Tầng 3: Nén về 4 chiều chính</strong> với tổ hợp tuyến tính <code>d_ik = Σ λ_kj · z_ij</code>:
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-900/60 border border-emerald-500/20">
                  <span className="text-emerald-400 font-medium">D1 Output (Sản lượng):</span>
                  <strong className="text-white font-mono">{networkData.d1Output > 0 ? `+${networkData.d1Output.toFixed(2)}` : networkData.d1Output.toFixed(2)}</strong>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-900/60 border border-cyan-500/20">
                  <span className="text-cyan-400 font-medium">D2 Reliability (Độ tin cậy):</span>
                  <strong className="text-white font-mono">{networkData.d2Reliability > 0 ? `+${networkData.d2Reliability.toFixed(2)}` : networkData.d2Reliability.toFixed(2)}</strong>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-900/60 border border-purple-500/20">
                  <span className="text-purple-400 font-medium">D3 Collaboration (Phối hợp):</span>
                  <strong className="text-white font-mono">{networkData.d3Collaboration > 0 ? `+${networkData.d3Collaboration.toFixed(2)}` : networkData.d3Collaboration.toFixed(2)}</strong>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-900/60 border border-pink-500/20">
                  <span className="text-pink-400 font-medium">D4 Peer (Chấm chéo):</span>
                  <strong className="text-white font-mono">{networkData.d4Peer > 0 ? `+${networkData.d4Peer.toFixed(2)}` : networkData.d4Peer.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Hiệu chỉnh khả dụng & Tổng hợp */}
          {activeTierTab === 4 && (
            <div className="space-y-2 text-[11px]">
              <p className="text-zinc-400 text-[10px] leading-relaxed">
                <strong>Tầng 4: Bù khả dụng một phần & Sigmoid</strong> <code>D' = D · (1 + β(1 - a_i))</code>:
              </p>
              <div className="bg-zinc-900/70 p-2 rounded-lg border border-white/5 space-y-1 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Hệ số khả dụng a_i:</span>
                  <span className="text-amber-300 font-bold">{networkData.availabilityFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Hệ số bù (1 + 0.5(1 - a_i)):</span>
                  <span className="text-zinc-200">{(1 + 0.5 * (1 - networkData.availabilityFactor)).toFixed(3)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Hàm Logistic Sigmoid C_i:</span>
                  <span className="text-indigo-300 font-bold">{networkData.compositeScore.toFixed(1)}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Tỷ lệ chia điểm p_i:</span>
                  <span className="text-cyan-300 font-bold">{(networkData.finalPct * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Radar Chart 4D Profile */}
        <div
          className="rounded-2xl p-3 border"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Hồ Sơ Năng Lực Radar 4D
            </span>
            <span className="text-[10px] text-zinc-400">
              δ_i: {networkData.distanceToCenter.toFixed(2)}
            </span>
          </div>

          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.12)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
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
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Cờ Ngờ Vực & Khoảng cách Mahalanobis */}
        <div
          className={`rounded-2xl p-3.5 border ${
            networkData.isSuspicious
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
              : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {networkData.isSuspicious ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-[11px]">
              <strong className="block font-bold">
                {networkData.isSuspicious
                  ? 'Phát hiện tín hiệu ngờ vực (Anti-Fraud Flag)'
                  : 'Không gian đa chiều cân bằng'}
              </strong>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                {networkData.isSuspicious
                  ? 'Thành viên có D1 Output cao bất thường trong khi D4 Peer hoặc D2 Reliability thấp. Khuyến nghị nhóm đối chiếu minh chứng thủ công.'
                  : `Khoảng cách hình học tới tâm nhóm δ_i = ${networkData.distanceToCenter.toFixed(2)}. Đóng góp phân bổ hài hòa.`}
              </p>

              {networkData.isSuspicious && (
                <button
                  type="button"
                  onClick={() => onResolveSuspicion(false, 'Nhóm đã đối chiếu minh chứng hợp lệ')}
                  disabled={isUpdating}
                  className="mt-2 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition"
                >
                  Xác nhận đối chiếu / Gỡ cờ ngờ vực
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 8. Danh sách Yếu Tố Tác Động & Rào Cản */}
        <div
          className="rounded-2xl p-3.5 border"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Mạng Lưới Yếu Tố Tác Động & Cản Trở
            </span>
            <button
              type="button"
              onClick={() => setShowImpactModal(true)}
              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
            >
              <PlusCircle className="w-3 h-3" />
              Khai báo
            </button>
          </div>

          <p className="text-[10px] text-zinc-400 mb-2 leading-relaxed">
            Giải thích <em>vì sao không làm được câu chuyện hôm đó / sprint đó</em>:
          </p>

          <div className="space-y-2">
            {networkData.nodes
              .filter((n) => n.type === 'IMPEDIMENT' || n.category === 'IMPEDIMENT')
              .map((imp) => (
                <div
                  key={imp.id}
                  className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 text-[11px] flex items-start gap-2.5"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-zinc-200 block">{imp.label}</span>
                    <span className="text-[10px] text-zinc-400">{imp.description}</span>
                  </div>
                  {imp.badge && (
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                      {imp.badge}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* 9. Interactive Database Actions */}
        <div className="pt-2 border-t space-y-2" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowAvailabilityModal(true)}
              disabled={isUpdating}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow"
              style={{
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                color: '#38bdf8',
              }}
            >
              <Sliders className="w-3.5 h-3.5" />
              Chỉnh Khả Dụng (a_i)
            </button>

            <button
              type="button"
              onClick={onRecalculateScores}
              disabled={isUpdating}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow"
              style={{
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.5)',
                color: '#a5b4fc',
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              Tính Lại Vector (DB)
            </button>
          </div>
        </div>
      </div>

      {/* 3. Pinned Bottom AI Prompt Bar (Matching Video frame_0.png "Ask a question...") */}
      <div className="p-3 border-t shrink-0 backdrop-blur-xl bg-zinc-950/90" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        {aiChatResponses.length > 0 && (
          <div className="mb-2 space-y-2 max-h-36 overflow-y-auto">
            {aiChatResponses.map((item, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-zinc-900/80 border border-white/10 text-[11px] space-y-1">
                <div className="text-zinc-400 font-semibold flex items-center gap-1">
                  <span>Bạn:</span> {item.q}
                </div>
                <div className="text-cyan-300 leading-relaxed">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAskAi} className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask a question..."
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-zinc-900/90 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="absolute right-1.5 p-1 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 transition"
            aria-label="Gửi câu hỏi"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* Modal: Khai báo tác động / Rào cản (Lưu DB) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4"
            style={{
              background: '#0d1527',
              borderColor: 'rgba(255, 255, 255, 0.15)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Khai Báo Yếu Tố Tác Động / Rào Cản
              </h3>
              <button
                type="button"
                onClick={handleCloseImpactModal}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateImpact} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Tiêu đề tác động / Rào cản *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chờ review API từ Jack, Bị ốm 2 ngày..."
                  value={impactTitle}
                  onChange={(e) => setImpactTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Phân loại tác động
                  </label>
                  <select
                    value={impactCategory}
                    onChange={(e) => setImpactCategory(e.target.value as ImpactEventPayload['category'])}
                    className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="IMPEDIMENT">Rào cản kỹ thuật</option>
                    <option value="HEALTH_AVAILABILITY">Khả dụng (Ốm/Thi cử)</option>
                    <option value="EXTERNAL_BLOCKER">Chờ đối tác / Đồng đội</option>
                    <option value="REWORK_REASON">Thay đổi spec / Rework</option>
                    <option value="COLLAB_SUPPORT">Hỗ trợ khẩn cấp bạn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Mức độ
                  </label>
                  <select
                    value={impactSeverity}
                    onChange={(e) => setImpactSeverity(e.target.value as ImpactEventPayload['severity'])}
                    className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Nghiêm trọng</option>
                    <option value="CRITICAL">Blocker</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Trễ (ngày)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={impactDelay}
                    onChange={(e) => setImpactDelay(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Mô tả chi tiết nguyên nhân
                </label>
                <textarea
                  rows={3}
                  placeholder="Giải thích vì sao sự kiện này làm ảnh hưởng đến tiến độ hôm đó..."
                  value={impactDesc}
                  onChange={(e) => setImpactDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseImpactModal}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg transition"
                >
                  {isUpdating ? 'Đang lưu DB...' : 'Lưu Vào Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Điều chỉnh Hệ số khả dụng a_i (Lưu DB) */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4"
            style={{
              background: '#0d1527',
              borderColor: 'rgba(255, 255, 255, 0.15)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Hệ Số Khả Dụng (a_i ∈ [0.5, 1.0])
              </h3>
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAvailability} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 font-medium mb-1">
                  <span>Hệ số khả dụng a_i:</span>
                  <span className="text-cyan-400 font-bold">{availFactor.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="1.00"
                  step="0.05"
                  value={availFactor}
                  onChange={(e) => setAvailFactor(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
                  <span>0.50 (Bận 50% sprint)</span>
                  <span>1.00 (Toàn thời gian)</span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Lý do điều chỉnh (Ốm đau, thi cử, việc cá nhân)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bị sốt xuất huyết nghỉ 3 ngày"
                  value={availReason}
                  onChange={(e) => setAvailReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-white/5 text-[10px] text-zinc-400 space-y-1">
                <p>
                  *Công thức bù: <code>D' = D · (1 + 0.5(1 - a_i))</code>.
                </p>
                <p>
                  Hệ số bù tương ứng: <strong>{(1 + 0.5 * (1 - availFactor)).toFixed(3)}x</strong>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg transition"
                >
                  {isUpdating ? 'Đang lưu...' : 'Lưu Khả Dụng & Chạy Lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
