import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { EvidenceItemDto } from '../../types/contribution';
import { EvidenceTable } from './EvidenceTable';
import {
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileQuestion,
  Layers,
  Award,
  Sparkles,
  FolderKanban,
} from 'lucide-react';

export interface EvidenceTraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  evidenceData: EvidenceItemDto[];
  selectedUserName: string;
  selectedUserId?: number;
  sprintId?: number;
  finalPct?: number;
}

export const EvidenceTraceabilityModal: React.FC<EvidenceTraceabilityModalProps> = ({
  isOpen,
  onClose,
  loading,
  evidenceData,
  selectedUserName,
  selectedUserId,
  sprintId,
  finalPct,
}) => {
  // Bộ lọc tìm kiếm & nguồn dữ liệu
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'BOARD' | 'MANUAL'>('ALL');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'all' | 'board' | 'manual' | 'activity'>('activity');

  // Phân trang
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Lắng nghe phím Esc để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset filter & page khi mở modal hoặc thay đổi member
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSourceFilter('ALL');
      setCurrentPage(1);
      setActiveTab('activity');
    }
  }, [isOpen, selectedUserId]);

  // Thống kê nhanh tổng Story Points và tổng điểm thực nhận
  const totalSP = useMemo(
    () => evidenceData.reduce((acc, item) => acc + Number(item.storyPoints || 0), 0),
    [evidenceData],
  );
  const totalEarnedScore = useMemo(
    () => evidenceData.reduce((acc, item) => acc + Number(item.earnedScore || 0), 0),
    [evidenceData],
  );

  // Lọc dữ liệu theo tab / source / search query
  const filteredData = useMemo(() => {
    let result = [...evidenceData];

    // Lọc theo nguồn
    if (sourceFilter !== 'ALL') {
      result = result.filter(
        (item) => (item.sourceType || 'BOARD').toUpperCase() === sourceFilter,
      );
    }

    // Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.taskName?.toLowerCase().includes(q) ||
          String(item.sourceId).includes(q) ||
          item.sourceType?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q),
      );
    }

    // Sắp xếp theo thời gian
    result.sort((a, b) => {
      const timeA = new Date(a.eventTime || 0).getTime();
      const timeB = new Date(b.eventTime || 0).getTime();
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [evidenceData, sourceFilter, searchQuery, sortDirection]);

  // Dữ liệu phân trang
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleTabChange = (tab: 'all' | 'board' | 'manual' | 'activity') => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab === 'board') {
      setSourceFilter('BOARD');
    } else if (tab === 'manual') {
      setSourceFilter('MANUAL');
    } else {
      setSourceFilter('ALL');
    }
  };

  const toggleSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  if (!isOpen) return null;

  const startRecord = filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, filteredData.length);

  // Chữ cái đầu viết tắt cho avatar JD style
  const userInitials = selectedUserName
    ? selectedUserName
        .trim()
        .split(' ')
        .map((n) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'FS';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="evidence-traceability-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
    >
      {/* Backdrop mờ tối phủ toàn màn hình (kể cả Header TopNav) */}
      <div
        className="fixed inset-0 bg-slate-950/75 dark:bg-black/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Khung Modal chính (Co giãn thích ứng theo chiều cao màn hình) */}
      <div className="relative flex flex-col w-full max-w-4xl lg:max-w-5xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] rounded-2xl sm:rounded-3xl bg-white dark:bg-[#181a24] shadow-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden my-auto transition-all text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar (Màu Indigo/Purple đặc trưng giống mẫu chuẩn) */}
        <div className="shrink-0 bg-[#4f46e5] dark:bg-[#4338ca] text-white px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between select-none shadow-sm">
          <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 shrink-0">
              <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-200" />
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-2 sm:gap-5 text-xs sm:text-sm font-medium whitespace-nowrap">
              <button
                type="button"
                onClick={() => handleTabChange('all')}
                className={`py-1 font-semibold transition ${
                  activeTab === 'all'
                    ? 'text-white border-b-2 border-amber-300 pb-0.5'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                Tất cả nguồn
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('board')}
                className={`py-1 font-semibold transition ${
                  activeTab === 'board'
                    ? 'text-white border-b-2 border-amber-300 pb-0.5'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                Task Board
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('manual')}
                className={`py-1 font-semibold transition ${
                  activeTab === 'manual'
                    ? 'text-white border-b-2 border-amber-300 pb-0.5'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                Khai báo
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('activity')}
                className={`py-1 font-semibold transition ${
                  activeTab === 'activity'
                    ? 'text-white border-b-2 border-amber-300 pb-0.5'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                Activity log
              </button>
            </nav>
          </div>

          {/* User initials badge (JD style) & Close button */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-2">
            <div
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-amber-400 text-indigo-950 font-bold text-[11px] sm:text-xs shadow-sm select-none"
              title={selectedUserName}
            >
              {userInitials}
            </div>

            <button
              onClick={onClose}
              data-testid="modal-close-button"
              className="rounded-xl p-1 sm:p-1.5 text-indigo-200 transition hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Đóng"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Nội dung chính Modal (Cuộn mượt mà bên trong, không bị đẩy tràn màn hình) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col gap-3 sm:gap-4">
          
          {/* Section Header: Activity log & Breadcrumb context */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Activity log
                </h2>
                {typeof sprintId === 'number' && (
                  <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    Sprint {sprintId}
                  </span>
                )}
              </div>

              {/* Subtitle chứa đầy đủ các text cho assertion kiểm thử & người dùng */}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Bằng chứng truy vết đóng góp (Audit Trail)
                </span>
                <span>•</span>
                <span>Thành viên:</span>
                <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {selectedUserName}
                </strong>
                {typeof selectedUserId === 'number' && (
                  <span className="text-slate-400 font-mono">(ID: #{selectedUserId})</span>
                )}
              </div>
            </div>

            {/* Tỷ lệ đóng góp cá nhân & Điểm tổng */}
            {finalPct != null && (
              <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl px-3 py-1.5">
                <div className="text-right">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                    Tỷ lệ đóng góp
                  </div>
                  <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {Number(finalPct).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Banner (Số sự kiện, Tổng Story Points, Tổng điểm thực nhận) */}
          {!loading && evidenceData.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="flex items-center gap-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-500/5 border border-sky-200/60 dark:border-sky-500/20 px-3.5 py-2">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Số sự kiện:
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    <span>{evidenceData.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/20 px-3.5 py-2">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Tổng Story Points:
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300">
                    <span>{totalSP} SP</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/5 border border-emerald-200/60 dark:border-emerald-500/20 px-3.5 py-2">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Tổng điểm thực nhận:
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    <span>+{totalEarnedScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search bar & Filter tags (Theo mẫu Activity Log) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search activity..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-7 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filter pills & Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {sourceFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  <span>Nguồn: {sourceFilter === 'BOARD' ? 'Task Board' : 'Khai báo'}</span>
                  <button
                    type="button"
                    onClick={() => handleTabChange('activity')}
                    className="hover:text-indigo-900 dark:hover:text-white ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => {
                    setSourceFilter((prev) =>
                      prev === 'ALL' ? 'BOARD' : prev === 'BOARD' ? 'MANUAL' : 'ALL',
                    );
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <Filter className="h-3 w-3 text-slate-400" />
                  <span>+ Add filter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Content Area */}
          <div className="flex-1 min-h-[180px]">
            {/* Trạng thái 1: Đang tải dữ liệu */}
            {loading && (
              <div
                data-testid="modal-loading"
                className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10"
              >
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    Đang truy xuất bằng chứng gốc...
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Truy vấn dữ liệu thời gian thực từ cơ sở dữ liệu nội bộ
                  </p>
                </div>
              </div>
            )}

            {/* Trạng thái 2: Không có dữ liệu ban đầu */}
            {!loading && evidenceData.length === 0 && (
              <div
                data-testid="modal-empty-state"
                className="flex min-h-[200px] flex-col items-center justify-center p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.01]"
              >
                <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-white/5 text-indigo-500">
                  <FileQuestion className="h-6 w-6" />
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white">
                  Không có sự kiện gốc nào được ghi nhận
                </h4>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                  Thành viên <span className="text-slate-600 dark:text-slate-300 font-medium">{selectedUserName}</span> chưa có thẻ công việc nào trên Task Board nội bộ hoặc bản khai báo thủ công nào trong Sprint này.
                </p>
              </div>
            )}

            {/* Trạng thái 3: Tìm kiếm không ra kết quả */}
            {!loading && evidenceData.length > 0 && filteredData.length === 0 && (
              <div className="flex min-h-[180px] flex-col items-center justify-center p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                <Search className="h-7 w-7 text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Không tìm thấy hoạt động nào phù hợp
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc nguồn.
                </p>
              </div>
            )}

            {/* Trạng thái 4: Hiển thị bảng EvidenceTable */}
            {!loading && paginatedData.length > 0 && (
              <EvidenceTable
                items={paginatedData}
                onSortTime={toggleSort}
                sortDirection={sortDirection}
              />
            )}
          </div>

          {/* Pagination Controls Bar (Đúng chuẩn mẫu Activity Log) */}
          {!loading && filteredData.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 select-none">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 py-1 px-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span>
                  {startRecord} - {endRecord} of {filteredData.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                    title="Trang trước"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                    title="Trang kế tiếp"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal: Ghi chú bảo mật & Nút Đóng */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#181a24] px-4 sm:px-6 py-2.5 sm:py-3">
          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
            * Dữ liệu được ghi nhận tự động từ Task Board (ActivityEvent nguồn BOARD) – Cơ chế nhật ký bất biến chống can thiệp lịch sử.
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-white transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  // Sử dụng createPortal để gắn trực tiếp vào document.body, đảm bảo z-index luôn cao hơn Header TopNav
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
