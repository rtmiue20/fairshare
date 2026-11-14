import React, { useState, useEffect, useMemo } from 'react';
import { contributionApi } from '../../api/contribution.api';
import { boardApi } from '../../api/board.api';
import { ManualContributionItem, ManualContributionRequest } from '../../types/contribution';
import {
  Send,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  X,
  CreditCard,
  Edit3,
  Check,
  ChevronRight,
  ChevronLeft,
  FileText,
  Figma,
  Code2,
} from 'lucide-react';

export interface ManualContributionFormProps {
  teamId: number;
  sprintId: number;
  userId: number;
  onSuccess?: (newItem: ManualContributionItem) => void;
  onCancel?: () => void;
}

interface KanbanCardItem {
  id: number;
  cardCode: string;
  title: string;
  storyPoints?: number;
  columnName?: string;
}

export const ManualContributionForm: React.FC<ManualContributionFormProps> = ({
  teamId,
  sprintId,
  userId,
  onSuccess,
  onCancel,
}) => {
  // Step state: 1 = Chọn mã thẻ, 2 = Minh chứng, 3 = Điểm tự chấm & Xác nhận
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [taskName, setTaskName] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<number | 'custom' | null>(null);
  const [evidenceLink, setEvidenceLink] = useState('');
  const [storyPoints, setStoryPoints] = useState<number | string>(3.0);

  // Kanban cards loaded from DB
  const [cards, setCards] = useState<KanbanCardItem[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<{ url: string; name: string; size: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch real Kanban cards from project
  useEffect(() => {
    let mounted = true;
    if (!teamId) return;

    setLoadingCards(true);
    boardApi
      .getBoardsByTeam(teamId)
      .then((res) => {
        if (!mounted) return;
        if (res?.data && Array.isArray(res.data)) {
          const list: KanbanCardItem[] = [];
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
          setCards(list);
          if (list.length > 0 && !taskName) {
            setSelectedCardId(list[0].id);
            setTaskName(`${list[0].cardCode}: ${list[0].title}`);
            if (list[0].storyPoints) {
              setStoryPoints(list[0].storyPoints);
            }
          }
        }
      })
      .catch(() => {
        if (!mounted) return;
        setCards([]);
      })
      .finally(() => {
        if (mounted) setLoadingCards(false);
      });

    return () => {
      mounted = false;
    };
  }, [teamId]);

  // Handle selecting a Kanban Card
  const handleSelectCard = (card: KanbanCardItem) => {
    setSelectedCardId(card.id);
    const code = `${card.cardCode}: ${card.title}`;
    setTaskName(code);
    if (card.storyPoints) {
      setStoryPoints(card.storyPoints);
    }
    setStatusMessage(null);
  };

  const handleSelectCustomCard = () => {
    setSelectedCardId('custom');
    if (!taskName.startsWith('Card #') && !taskName.trim()) {
      setTaskName('Card #');
    }
    setStatusMessage(null);
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await boardApi.uploadFile(file);
      if (res.data?.url) {
        const fullUrl = res.data.url.startsWith('http') ? res.data.url : `http://localhost:8080${res.data.url}`;
        setEvidenceLink(fullUrl);
        setUploadedImagePreview({
          url: fullUrl,
          name: res.data.fileName || file.name,
          size: res.data.fileSize || file.size,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải ảnh lên';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveUploadedImage = () => {
    setUploadedImagePreview(null);
    setEvidenceLink('');
  };

  // Step validation before moving to next step
  const handleNextStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setStatusMessage(null);

    if (currentStep === 1) {
      if (!taskName.trim()) {
        setStatusMessage({ type: 'error', text: 'Vui lòng chọn hoặc nhập mã thẻ đóng góp.' });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!evidenceLink.trim()) {
        setStatusMessage({ type: 'error', text: 'Vui lòng cung cấp link minh chứng (Docs, Figma, v.v.).' });
        return;
      }
      setCurrentStep(3);
    }
  };

  // Final submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!taskName.trim()) {
      setCurrentStep(1);
      setStatusMessage({ type: 'error', text: 'Vui lòng chọn hoặc nhập mã thẻ đóng góp.' });
      return;
    }
    if (!evidenceLink.trim()) {
      setCurrentStep(2);
      setStatusMessage({ type: 'error', text: 'Vui lòng cung cấp link minh chứng (Docs, Figma, v.v.).' });
      return;
    }
    const parsedSP = Number(storyPoints);
    if (isNaN(parsedSP) || parsedSP <= 0) {
      setCurrentStep(3);
      setStatusMessage({ type: 'error', text: 'Điểm tự chấm phải là số dương lớn hơn 0.' });
      return;
    }

    const payload: ManualContributionRequest = {
      taskName: taskName.trim(),
      evidenceLink: evidenceLink.trim(),
      storyPoints: parsedSP,
    };

    setIsSubmitting(true);
    try {
      const response = await contributionApi.submitManualContribution(teamId, sprintId, userId, payload);
      const createdItem = response.data;

      setStatusMessage({
        type: 'success',
        text: 'Đã gửi khai báo đóng góp thành công! Bản ghi đang ở trạng thái chờ duyệt (PENDING).',
      });

      // Clear form
      setTaskName('');
      setEvidenceLink('');
      setUploadedImagePreview(null);
      setStoryPoints(3.0);
      setCurrentStep(1);

      if (onSuccess && createdItem) {
        onSuccess(createdItem);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi khai báo. Vui lòng thử lại sau.';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Header texts per step
  const stepInfo = useMemo(() => {
    switch (currentStep) {
      case 1:
        return {
          title: 'Khai báo minh chứng đóng góp',
          subtitle: 'Chọn mã thẻ từ Task Board Kanban hoặc nhập mã thẻ của bạn.',
        };
      case 2:
        return {
          title: 'Đính kèm minh chứng',
          subtitle: 'Cung cấp liên kết minh chứng (Figma, Docs, Github PR) hoặc tải ảnh từ máy.',
        };
      case 3:
        return {
          title: 'Điểm tự chấm & Xác nhận',
          subtitle: 'Tự đánh giá số điểm tương ứng với độ phức tạp và khối lượng công việc.',
        };
    }
  }, [currentStep]);

  return (
    <div
      data-testid="manual-contribution-form-container"
      className="flex flex-col gap-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
    >
      {/* ── MODAL HEADER (Matching Image 3) ── */}
      <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {stepInfo.title}
            </h2>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 font-mono">
              Sprint {sprintId}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {stepInfo.subtitle}
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Status Message if any */}
      {statusMessage && (
        <div
          data-testid="form-status-message"
          className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-medium animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Form container */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
        data-testid="manual-contribution-form"
      >
        {/* ════════════ BƯỚC 1: CHỌN MÃ THẺ (KANBAN CARD) ════════════ */}
        <div className={currentStep === 1 ? 'block space-y-3.5' : 'hidden'}>
          <div className="flex items-center justify-between">
            <label htmlFor="manual-task-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <span>Mã thẻ từ Kanban Task Board</span>
              <span className="text-rose-500">*</span>
            </label>
            {loadingCards && (
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin text-indigo-500" /> Đang tải thẻ Kanban...
              </span>
            )}
          </div>

          {/* Cards Option Grid (Image 3 Style) */}
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
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Selected checkmark indicator (Matching Image 3) */}
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

                  {c.storyPoints && (
                    <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                      Ước lượng: {c.storyPoints} điểm
                    </div>
                  )}
                </div>
              );
            })}

            {/* Option: Nhập mã thẻ tùy chỉnh */}
            <div
              onClick={handleSelectCustomCard}
              className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between ${
                selectedCardId === 'custom'
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700'
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
                  Nhập mã thẻ khác
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Khai báo công việc đặc biệt hoặc ngoài Task Board
                </p>
              </div>
            </div>
          </div>

          {/* Text Input for Card Code */}
          <div className="pt-1">
            <label htmlFor="manual-task-name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
              Mã thẻ xác nhận <span className="text-rose-500">*</span>
            </label>
            <input
              id="manual-task-name"
              data-testid="input-task-name"
              type="text"
              required
              value={taskName}
              onChange={(e) => {
                setTaskName(e.target.value);
                setSelectedCardId('custom');
              }}
              placeholder="Ví dụ: Card #1 (Update UI) hoặc Card #2..."
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-zinc-900"
            />
          </div>
        </div>

        {/* ════════════ BƯỚC 2: MINH CHỨNG HOÀN THÀNH ════════════ */}
        <div className={currentStep === 2 ? 'block space-y-3.5' : 'hidden'}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="manual-evidence-link" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Đường dẫn minh chứng (URL) <span className="text-rose-500">*</span></span>
              <span className="text-[11px] text-zinc-400 font-normal">URL công khai để nhóm đối chiếu</span>
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-3 h-3.5 w-3.5 text-zinc-400" />
              <input
                id="manual-evidence-link"
                data-testid="input-evidence-link"
                type="url"
                required
                value={evidenceLink}
                onChange={(e) => {
                  setEvidenceLink(e.target.value);
                  if (uploadedImagePreview && e.target.value !== uploadedImagePreview.url) {
                    setUploadedImagePreview(null);
                  }
                }}
                placeholder="https://docs.google.com/document/d/... hoặc https://figma.com/file/..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 pl-9 pr-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition focus:border-blue-600 focus:bg-white dark:focus:bg-zinc-900"
              />
            </div>

            {/* Quick Template Links */}
            <div className="flex items-center gap-2 pt-1 text-[11px]">
              <span className="text-zinc-400">Gợi ý mẫu:</span>
              <button
                type="button"
                onClick={() => setEvidenceLink('https://figma.com/design/')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
              >
                <Figma size={10} /> Figma
              </button>
              <button
                type="button"
                onClick={() => setEvidenceLink('https://docs.google.com/document/')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
              >
                <FileText size={10} /> Docs SRS
              </button>
              <button
                type="button"
                onClick={() => setEvidenceLink('https://github.com/pull/')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
              >
                <Code2 size={10} /> GitHub PR
              </button>
            </div>
          </div>

          {/* Upload ảnh minh chứng */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Hoặc tải ảnh chụp minh chứng trực tiếp
            </label>
            <label className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-zinc-50 dark:bg-zinc-850 hover:bg-blue-50/20 transition cursor-pointer text-center">
              {isUploading ? (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {isUploading ? 'Đang tải ảnh lên máy chủ...' : 'Tải ảnh minh chứng từ máy (.png, .jpg)'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                disabled={isUploading}
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {/* Preview ảnh đã tải lên */}
            {uploadedImagePreview && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 mt-2.5">
                <a
                  href={uploadedImagePreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black/20 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center hover:opacity-90"
                >
                  <img
                    src={uploadedImagePreview.url}
                    alt="Ảnh minh chứng"
                    className="w-full h-full object-cover"
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                    {uploadedImagePreview.name}
                  </span>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {(uploadedImagePreview.size / 1024).toFixed(1)} KB • Sẵn sàng lưu vào DB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveUploadedImage}
                  className="p-1 rounded text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                  title="Gỡ ảnh"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ════════════ BƯỚC 3: ĐIỂM TỰ CHẤM & XÁC NHẬN ════════════ */}
        <div className={currentStep === 3 ? 'block space-y-4' : 'hidden'}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="manual-story-points" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Điểm tự chấm (Self-score) <span className="text-rose-500">*</span></span>
              <span className="text-[12px] font-bold text-amber-500 font-mono">
                {Number(storyPoints) > 0 ? `+${Number(storyPoints).toFixed(1)} điểm` : '0 điểm'}
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="manual-story-points"
                data-testid="input-story-points"
                type="number"
                required
                min="0.5"
                max="21"
                step="0.5"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                className="w-28 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-mono outline-none transition focus:border-blue-600"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 5, 8, 13].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setStoryPoints(pts)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer font-mono ${
                      Number(storyPoints) === pts
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {pts} điểm
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tóm tắt thông tin khai báo */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-850/70 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
            <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Tóm tắt minh chứng gửi thẩm định:</span>
            </h4>
            <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-400 font-medium">Mã thẻ:</span>
              <span className="col-span-2 font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {taskName || 'Chưa chọn'}
              </span>

              <span className="text-zinc-400 font-medium">Minh chứng:</span>
              <span className="col-span-2 font-mono text-blue-600 dark:text-blue-400 truncate">
                {evidenceLink || 'Chưa có'}
              </span>

              <span className="text-zinc-400 font-medium">Điểm tự chấm:</span>
              <span className="col-span-2 font-bold text-amber-500 font-mono">
                +{Number(storyPoints).toFixed(1)} điểm
              </span>

              <span className="text-zinc-400 font-medium">Trạng thái:</span>
              <span className="col-span-2 text-zinc-500 font-medium">
                Chờ duyệt chéo (Anti-Fraud Gate)
              </span>
            </div>
          </div>
        </div>

        {/* ════════════ BOTTOM STEP BAR (Exact match to Image 3) ════════════ */}
        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
          {/* Progress Indicator on bottom-left */}
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

          {/* Action buttons on bottom-right */}
          <div className="flex items-center gap-2">
            {/* Cancel or Back button */}
            {currentStep === 1 ? (
              onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                >
                  Hủy
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1));
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Quay lại</span>
              </button>
            )}

            {/* Next or Submit Button */}
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                data-testid="btn-submit-manual-contribution"
                className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="btn-submit-manual-contribution"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white px-5 py-2.5 text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 text-white" />
                    <span>Gửi khai báo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
