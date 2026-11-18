import React from 'react';
import { EvidenceItemDto, EvidenceItem } from '../../types/contribution';
import { formatDateTime } from '../../utils/date';
import { CheckCircle2, Clock, FileText, LayoutList, UserCheck, AlertCircle, Sparkles } from 'lucide-react';

export interface EvidenceTableProps {
  items: (EvidenceItemDto | EvidenceItem)[];
  onSortTime?: () => void;
  sortDirection?: 'asc' | 'desc';
}

interface NormalizedEvidenceItem {
  sourceType: string;
  sourceId: number | string;
  taskName: string;
  storyPoints?: number;
  earnedScore: number;
  eventTime: string;
  status: string;
}

function normalizeEvidenceItem(
  item: EvidenceItemDto | EvidenceItem,
  index: number,
): NormalizedEvidenceItem {
  if ('sourceType' in item) {
    return {
      sourceType: item.sourceType || 'BOARD',
      sourceId: item.sourceId || index + 1,
      taskName: item.taskName || 'Không có tiêu đề',
      storyPoints: item.storyPoints,
      earnedScore: item.earnedScore ?? 0,
      eventTime: item.eventTime || '',
      status: item.status || 'DONE',
    };
  }
  return {
    sourceType: item.source || 'BOARD',
    sourceId: item.id || index + 1,
    taskName: item.title || 'Không có tiêu đề',
    storyPoints: item.weight ? Math.round(item.weight) : undefined,
    earnedScore: item.weight ?? 0,
    eventTime: item.timestamp || '',
    status: 'DONE',
  };
}

export const EvidenceTable: React.FC<EvidenceTableProps> = ({
  items,
  onSortTime,
  sortDirection = 'desc',
}) => {
  if (!items || items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center p-10 text-center text-slate-400 dark:text-slate-500 gap-2.5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Không có dữ liệu bằng chứng</p>
      </div>
    );
  }

  const renderSourceBadge = (sourceType?: string) => {
    const type = (sourceType || 'BOARD').toUpperCase();

    if (type === 'BOARD') {
      return (
        <span
          data-testid="badge-source-board"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20"
        >
          <LayoutList className="w-3.5 h-3.5 text-sky-500" />
          Task Board nội bộ
        </span>
      );
    }

    if (type === 'MANUAL') {
      return (
        <span
          data-testid="badge-source-manual"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
        >
          <FileText className="w-3.5 h-3.5 text-purple-500" />
          Khai báo thủ công
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
        {type}
      </span>
    );
  };

  const renderStatusBadge = (status?: string) => {
    const st = (status || 'DONE').toUpperCase();

    if (st === 'DONE' || st === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Hoàn thành
        </span>
      );
    }

    if (st === 'APPROVED' || st === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
          <UserCheck className="w-3.5 h-3.5 text-blue-500" />
          Đã phê duyệt
        </span>
      );
    }

    if (st === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          Đang thực hiện
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
        {st}
      </span>
    );
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#181a24] shadow-sm">
      <table
        className="w-full min-w-[720px] border-collapse text-left text-sm"
        data-testid="evidence-table"
      >
        <thead>
          <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            <th
              scope="col"
              className="py-2.5 px-3 sm:py-3 sm:px-4 cursor-pointer select-none hover:text-slate-800 dark:hover:text-white transition"
              onClick={onSortTime}
              title="Nhấn để sắp xếp theo thời gian"
            >
              <div className="flex items-center gap-1">
                <span>Thời gian ghi nhận</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              </div>
            </th>
            <th scope="col" className="py-2.5 px-3 sm:py-3 sm:px-4">Nguồn</th>
            <th scope="col" className="py-2.5 px-3 sm:py-3 sm:px-4">Tên công việc</th>
            <th scope="col" className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">Story Points</th>
            <th scope="col" className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Điểm thực nhận</th>
            <th scope="col" className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {items.map((rawItem, index) => {
            const item = normalizeEvidenceItem(rawItem, index);
            const { sourceType, sourceId, taskName, storyPoints, earnedScore, eventTime, status } = item;

            return (
              <tr
                key={`${sourceType}-${sourceId}-${index}`}
                className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
              >
                {/* Thời gian */}
                <td className="py-2.5 px-3 sm:py-3 sm:px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {formatDateTime(eventTime) || '—'}
                </td>

                {/* Nguồn */}
                <td className="py-2.5 px-3 sm:py-3 sm:px-4 whitespace-nowrap">
                  {renderSourceBadge(sourceType)}
                </td>

                {/* Tên công việc */}
                <td className="py-2.5 px-3 sm:py-3 sm:px-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {taskName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Mã task: #{sourceId}
                    </span>
                  </div>
                </td>

                {/* Story Points */}
                <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center whitespace-nowrap">
                  {typeof storyPoints === 'number' && storyPoints > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      {storyPoints} SP
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>

                {/* Điểm thực nhận */}
                <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-right whitespace-nowrap">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    +{Number(earnedScore).toFixed(1)}
                  </span>
                </td>

                {/* Trạng thái */}
                <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center whitespace-nowrap">
                  {renderStatusBadge(status)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
