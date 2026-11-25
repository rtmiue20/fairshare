import React, { useEffect, useMemo, useState } from 'react';
import { boardApi } from '../../api/board.api';
import { ImpactEventPayload } from '../../types/contribution';
import { GlassDropdown, GlassDropdownOption } from '../../components/ui/GlassDropdown';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit3,
  Loader2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

interface KanbanCardItem {
  id: number;
  cardCode: string;
  title: string;
  storyPoints?: number;
  columnName?: string;
}

export interface ImpactDeclarationModalProps {
  isOpen: boolean;
  teamId: number;
  sprintId: number;
  sprintName?: string;
  userId: number;
  userName?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ImpactEventPayload) => Promise<void>;
}

const CATEGORY_OPTIONS: GlassDropdownOption[] = [
  { value: 'IMPEDIMENT', label: 'Rào cản ngoại cảnh (D2)', subtitle: 'Phát sinh ngoài kế hoạch làm chậm tiến độ' },
  { value: 'HEALTH_AVAILABILITY', label: 'Khả dụng & Sức khỏe (a_i)', subtitle: 'Nghỉ ốm, lịch thi hoặc việc cá nhân bất khả kháng' },
  { value: 'REWORK_REASON', label: 'Đổi Spec / Phát sinh Rework', subtitle: 'Yêu cầu thay đổi khiến phải làm lại thẻ' },
  { value: 'EXTERNAL_BLOCKER', label: 'Chờ đối tác / Phụ thuộc', subtitle: 'Chờ API, dữ liệu hoặc review từ thành viên khác' },
  { value: 'COLLAB_SUPPORT', label: 'Hỗ trợ khẩn cấp cho nhóm', subtitle: 'Ưu tiên gỡ blocker gấp ảnh hưởng thẻ hiện tại' },
];

const SEVERITY_OPTIONS: GlassDropdownOption[] = [
  { value: 'LOW', label: 'Thấp (Chậm < 1 ngày)' },
  { value: 'MEDIUM', label: 'Trung bình (1 - 2 ngày)' },
  { value: 'HIGH', label: 'Cao (> 2 ngày)' },
  { value: 'CRITICAL', label: 'Nghiêm trọng (Blocker)' },
];

export const ImpactDeclarationModal: React.FC<ImpactDeclarationModalProps> = ({
  isOpen,
  teamId,
  sprintId,
  sprintName,
  userId,
  userName,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [cards, setCards] = useState<KanbanCardItem[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const [selectedCardId, setSelectedCardId] = useState<number | 'custom' | null>(null);
  const [selectedCardMeta, setSelectedCardMeta] = useState<KanbanCardItem | null>(null);
  const [cardLabel, setCardLabel] = useState('');

  const [impactTitle, setImpactTitle] = useState('');
  const [impactCategory, setImpactCategory] = useState<ImpactEventPayload['category']>('IMPEDIMENT');
  const [impactSeverity, setImpactSeverity] = useState<ImpactEventPayload['severity']>('MEDIUM');
  const [impactDelay, setImpactDelay] = useState<number>(1);
  const [availabilityFactor, setAvailabilityFactor] = useState<number>(0.85);
  const [impactDesc, setImpactDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form each time modal opens
  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(1);
    setErrorMsg(null);
    setImpactTitle('');
    setImpactCategory('IMPEDIMENT');
    setImpactSeverity('MEDIUM');
    setImpactDelay(1);
    setAvailabilityFactor(0.85);
    setImpactDesc('');
  }, [isOpen]);

  // Fetch real Kanban cards from the active project
  useEffect(() => {
    if (!isOpen || !teamId || teamId <= 0) return;
    let mounted = true;
    setLoadingCards(true);

    const fetchCards = async () => {
      try {
        if (typeof boardApi?.getBoardsByTeam !== 'function') {
          setCards([]);
          return;
        }
        const res = await boardApi.getBoardsByTeam(teamId);
        if (!mounted) return;
        const list: KanbanCardItem[] = [];
        if (res?.data && Array.isArray(res.data)) {
          res.data.forEach((b) => {
            (b.columns || []).forEach((col) => {
              (col.cards || []).forEach((c) => {
                list.push({
                  id: c.id,
                  cardCode: `Card #${c.id}`,
                  title: c.title,
                  storyPoints: c.storyPoints,
                  columnName: col.name,
                });
              });
            });
          });
        }
        setCards(list);
        if (list.length > 0) {
          setSelectedCardId(list[0].id);
          setSelectedCardMeta(list[0]);
          setCardLabel(`${list[0].cardCode}: ${list[0].title}`);
        } else {
          setSelectedCardId('custom');
          setSelectedCardMeta(null);
          setCardLabel('');
        }
      } catch {
        if (!mounted) return;
        setCards([]);
        setSelectedCardId('custom');
        setSelectedCardMeta(null);
      } finally {
        if (mounted) setLoadingCards(false);
      }
    };

    void fetchCards();
    return () => {
      mounted = false;
    };
  }, [isOpen, teamId]);

  const stepInfo = useMemo(() => {
    switch (currentStep) {
      case 1:
        return {
          title: 'Khai báo rào cản công việc',
          subtitle: 'Chọn thẻ từ Task Board Kanban bị ảnh hưởng hoặc nhập hạng mục gặp rào cản.',
        };
      case 2:
        return {
          title: 'Chi tiết rào cản & mức độ',
          subtitle: 'Phân loại nguyên nhân, mức độ ảnh hưởng và số ngày trễ dự kiến.',
        };
      case 3:
        return {
          title: 'Xác nhận thông tin khai báo',
          subtitle: 'Kiểm tra lại thông tin thẻ và rào cản trước khi gửi xác nhận.',
        };
    }
  }, [currentStep]);

  if (!isOpen) return null;

  const handleSelectCard = (card: KanbanCardItem) => {
    setSelectedCardId(card.id);
    setSelectedCardMeta(card);
    setCardLabel(`${card.cardCode}: ${card.title}`);
    setErrorMsg(null);
  };

  const handleSelectCustomCard = () => {
    setSelectedCardId('custom');
    setSelectedCardMeta(null);
    if (selectedCardMeta) {
      setCardLabel('');
    }
    setErrorMsg(null);
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!cardLabel.trim()) {
        setErrorMsg('Vui lòng chọn thẻ Kanban hoặc nhập tên hạng mục gặp rào cản.');
        return;
      }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!impactTitle.trim()) {
        setErrorMsg('Vui lòng nhập tiêu đề / lý do rào cản.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardLabel.trim() || !impactTitle.trim()) {
      setErrorMsg('Vui lòng hoàn thiện thông tin thẻ và tiêu đề rào cản.');
      return;
    }

    const prefix = selectedCardMeta ? `[${selectedCardMeta.cardCode}] ` : cardLabel.trim() ? `[${cardLabel.trim()}] ` : '';
    const descParts = [
      selectedCardMeta ? `Thẻ: ${selectedCardMeta.cardCode} - ${selectedCardMeta.title}` : `Hạng mục: ${cardLabel.trim()}`,
      impactDesc.trim() || null,
    ].filter(Boolean);

    await onSubmit({
      teamId,
      sprintId,
      userId,
      title: `${prefix}${impactTitle.trim()}`,
      description: descParts.join(' · '),
      category: impactCategory,
      severity: impactSeverity,
      delayDays: impactDelay,
      storyPoints: selectedCardMeta?.storyPoints,
      updatedAvailabilityFactor: impactCategory === 'HEALTH_AVAILABILITY' ? availabilityFactor : undefined,
    });
    onClose();
  };

  const selectedCategoryLabel =
    CATEGORY_OPTIONS.find((opt) => opt.value === impactCategory)?.label || impactCategory;
  const selectedSeverityLabel =
    SEVERITY_OPTIONS.find((opt) => opt.value === impactSeverity)?.label || impactSeverity;

  return (
    <div
      data-testid="impact-declaration-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-7 shadow-2xl text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>{stepInfo.title}</span>
                </h2>
                {sprintName && (
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 font-mono">
                    {sprintName}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {stepInfo.subtitle}
              </p>
            </div>

            <button
              type="button"
              aria-label="Đóng hộp thoại khai báo rào cản"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 p-3 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleConfirmSubmit} noValidate className="flex flex-col gap-4">
            {/* BƯỚC 1: CHỌN THẺ MUỐN KHAI BÁO RÀO CẢN */}
            {currentStep === 1 && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="impact-card-label" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <span>Chọn thẻ từ Kanban Task Board</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  {loadingCards && (
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin text-indigo-500" /> Đang tải thẻ Kanban...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                  {cards.map((c) => {
                    const isSelected = selectedCardId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCard(c)}
                        className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1f1f23] hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}

                        <div>
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                            }`}
                          >
                            <CreditCard size={17} />
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-zinc-900 dark:text-white font-mono">
                              {c.cardCode}
                            </span>
                            {c.columnName && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                                {c.columnName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium mt-1 line-clamp-1">
                            {c.title}
                          </p>
                        </div>

                        {c.storyPoints !== undefined && c.storyPoints !== null && (
                          <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                            Ước lượng: {c.storyPoints} điểm
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div
                    onClick={handleSelectCustomCard}
                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                      selectedCardId === 'custom'
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1f1f23] hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {selectedCardId === 'custom' && (
                      <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <div>
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${
                          selectedCardId === 'custom' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        <Edit3 size={17} />
                      </div>
                      <span className="font-bold text-sm text-zinc-900 dark:text-white block">
                        Rào cản chung / Thẻ khác
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Nhập hạng mục hoặc lý do ngoại cảnh ảnh hưởng chung tới Sprint
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <label htmlFor="impact-card-label" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                    Thẻ / hạng mục xác nhận <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="impact-card-label"
                    data-testid="input-impact-card-label"
                    type="text"
                    required
                    value={cardLabel}
                    onChange={(e) => {
                      setCardLabel(e.target.value);
                      setSelectedCardId('custom');
                      setSelectedCardMeta(null);
                    }}
                    placeholder="Ví dụ: Card #103: Giao diện hoặc Lịch thi giữa kỳ..."
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1f1f23] px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-zinc-900"
                  />
                </div>
              </div>
            )}

            {/* BƯỚC 2: PHÂN LOẠI, MỨC ĐỘ & MÔ TẢ RÀO CẢN */}
            {currentStep === 2 && (
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="impact-title-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tiêu đề tác động / Rào cản <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="impact-title-input"
                    data-testid="input-impact-title"
                    type="text"
                    required
                    placeholder="Ví dụ: Chờ review API từ đối tác, Trùng lịch thi 2 ngày..."
                    value={impactTitle}
                    onChange={(e) => setImpactTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1f1f23] px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-zinc-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Phân loại tác động
                    </label>
                    <GlassDropdown
                      ariaLabel="Phân loại tác động"
                      options={CATEGORY_OPTIONS}
                      value={impactCategory}
                      onChange={(val) => setImpactCategory(val as ImpactEventPayload['category'])}
                      menuWidthClass="w-72"
                      triggerClassName="w-full justify-between"
                      labelMaxWidthClass="max-w-[180px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Mức độ nghiêm trọng
                    </label>
                    <GlassDropdown
                      ariaLabel="Mức độ nghiêm trọng"
                      options={SEVERITY_OPTIONS}
                      value={impactSeverity}
                      onChange={(val) => setImpactSeverity(val as ImpactEventPayload['severity'])}
                      menuWidthClass="w-60"
                      triggerClassName="w-full justify-between"
                      labelMaxWidthClass="max-w-[180px]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="impact-delay-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Số ngày trễ dự kiến
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id="impact-delay-input"
                      type="number"
                      min="0"
                      max="14"
                      step="0.5"
                      value={impactDelay}
                      onChange={(e) => setImpactDelay(Number(e.target.value))}
                      className="w-24 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1f1f23] px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-600"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[0.5, 1, 2, 3, 5].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setImpactDelay(d)}
                          className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold font-mono transition cursor-pointer ${
                            impactDelay === d
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {d} ngày
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {impactCategory === 'HEALTH_AVAILABILITY' && (
                  <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-amber-700 dark:text-amber-300">Hệ số khả dụng đề xuất (a_i):</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{availabilityFactor.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="0.95"
                      step="0.05"
                      value={availabilityFactor}
                      onChange={(e) => setAvailabilityFactor(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="impact-desc-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Mô tả chi tiết nguyên nhân
                  </label>
                  <textarea
                    id="impact-desc-input"
                    rows={3}
                    placeholder="Giải thích nguyên nhân cụ thể gây chậm tiến độ hoặc cần điều chỉnh khả dụng..."
                    value={impactDesc}
                    onChange={(e) => setImpactDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#1f1f23] px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-zinc-900"
                  />
                </div>
              </div>
            )}

            {/* BƯỚC 3: TÓM TẮT & XÁC NHẬN KHAI BÁO */}
            {currentStep === 3 && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#1f1f23]/70 border border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs">
                <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Tóm tắt thông tin khai báo rào cản:</span>
                </h4>
                <div className="grid grid-cols-3 gap-y-2 gap-x-2 pt-2 text-[11.5px] border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400 font-medium">Thành viên:</span>
                  <span className="col-span-2 font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {userName || `Thành viên #${userId}`}
                  </span>

                  <span className="text-zinc-400 font-medium">Thẻ áp dụng:</span>
                  <span className="col-span-2 font-semibold text-blue-600 dark:text-blue-400 truncate">
                    {cardLabel}
                  </span>

                  <span className="text-zinc-400 font-medium">Tiêu đề:</span>
                  <span className="col-span-2 font-semibold text-zinc-800 dark:text-zinc-200">
                    {impactTitle}
                  </span>

                  <span className="text-zinc-400 font-medium">Phân loại:</span>
                  <span className="col-span-2 text-zinc-700 dark:text-zinc-300">
                    {selectedCategoryLabel}
                  </span>

                  <span className="text-zinc-400 font-medium">Mức độ & Trễ:</span>
                  <span className="col-span-2 font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {selectedSeverityLabel} · +{impactDelay} ngày
                    {impactCategory === 'HEALTH_AVAILABILITY' ? ` · a_i = ${availabilityFactor.toFixed(2)}` : ''}
                  </span>

                  {impactDesc.trim() && (
                    <>
                      <span className="text-zinc-400 font-medium">Mô tả:</span>
                      <span className="col-span-2 text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {impactDesc.trim()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* BOTTOM STEP BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%' }}
                  />
                </div>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-mono">
                  Bước {currentStep}/3
                </span>
              </div>

              <div className="flex items-center gap-2">
                {currentStep === 1 ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                  >
                    Hủy
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1));
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    <span>Quay lại</span>
                  </button>
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    data-testid="btn-impact-next"
                    className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                  >
                    <span>Tiếp tục</span>
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="btn-impact-confirm"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white px-5 py-2.5 text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                        <span>Đang xác nhận...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 text-white" />
                        <span>Xác nhận khai báo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
