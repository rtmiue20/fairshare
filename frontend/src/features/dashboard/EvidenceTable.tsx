import React from 'react';
import { EvidenceItemDto, EvidenceItem } from '../../types/contribution';
import { formatDateTime } from '../../utils/date';
import { CheckCircle2, Clock, FileText, LayoutList, UserCheck, AlertCircle } from 'lucide-react';

export interface EvidenceTableProps {
  items: (EvidenceItemDto | EvidenceItem)[];
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

export const EvidenceTable: React.FC<EvidenceTableProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <AlertCircle className="mb-2 h-8 w-8 text-slate-500" />
        <p className="text-sm font-medium">Không có dữ liệu bằng chứng</p>
      </div>
    );
  }

  const renderSourceBadge = (sourceType?: string) => {
    const type = (sourceType || 'BOARD').toUpperCase();

    if (type === 'BOARD') {
      return (
        <span
          data-testid="badge-source-board"
          className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 shadow-sm"
        >
          <LayoutList className="h-3.5 w-3.5 text-blue-400" />
          Task Board nội bộ
        </span>
      );
    }

    if (type === 'MANUAL') {
      return (
        <span
          data-testid="badge-source-manual"
          className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300 shadow-sm"
        >
          <FileText className="h-3.5 w-3.5 text-purple-300" />
          Khai báo thủ công
        </span>
      );
    }

    // Nguồn bổ sung (Docs, Git...)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300">
        {type}
      </span>
    );
  };

  const renderStatusBadge = (status?: string) => {
    const st = (status || 'DONE').toUpperCase();

    if (st === 'DONE' || st === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Hoàn thành
        </span>
      );
    }

    if (st === 'APPROVED' || st === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal-300">
          <UserCheck className="h-3 w-3 text-teal-400" />
          Đã phê duyệt
        </span>
      );
    }

    if (st === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
          <Clock className="h-3 w-3 text-amber-400" />
          Đang thực hiện
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
        {st}
      </span>
    );
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-inner">
      <table className="w-full min-w-[700px] border-collapse text-left text-sm" data-testid="evidence-table">
        <thead>
          <tr className="border-b border-slate-800/80 bg-slate-950/60 text-xs font-semibold tracking-wider text-slate-400">
            <th scope="col" className="px-4 py-3.5">
              Nguồn
            </th>
            <th scope="col" className="px-4 py-3.5">
              Tên công việc
            </th>
            <th scope="col" className="px-4 py-3.5 text-center">
              Story Points
            </th>
            <th scope="col" className="px-4 py-3.5 text-right">
              Điểm thực nhận
            </th>
            <th scope="col" className="px-4 py-3.5">
              Thời gian ghi nhận
            </th>
            <th scope="col" className="px-4 py-3.5 text-center">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {items.map((rawItem, index) => {
            const item = normalizeEvidenceItem(rawItem, index);
            const { sourceType, sourceId, taskName, storyPoints, earnedScore, eventTime, status } = item;

            return (
              <tr
                key={`${sourceType}-${sourceId}-${index}`}
                className="transition-colors hover:bg-slate-800/40"
              >
                {/* Cột 1: Nguồn (Source Type) */}
                <td className="whitespace-nowrap px-4 py-3.5">
                  {renderSourceBadge(sourceType)}
                </td>

                {/* Cột 2: Tên công việc (Task Name) */}
                <td className="px-4 py-3.5">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-100">{taskName}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Mã task: #{sourceId}
                    </span>
                  </div>
                </td>

                {/* Cột 3: Story Points */}
                <td className="whitespace-nowrap px-4 py-3.5 text-center">
                  {typeof storyPoints === 'number' && storyPoints > 0 ? (
                    <span className="inline-flex items-center rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/20">
                      {storyPoints} SP
                    </span>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>

                {/* Cột 4: Điểm thực nhận (Earned Score) */}
                <td className="whitespace-nowrap px-4 py-3.5 text-right">
                  <span className="font-bold text-emerald-400">
                    +{Number(earnedScore).toFixed(1)}
                  </span>
                </td>

                {/* Cột 5: Thời gian ghi nhận (Event Time) */}
                <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">
                  {formatDateTime(eventTime)}
                </td>

                {/* Cột 6: Trạng thái (Status) */}
                <td className="whitespace-nowrap px-4 py-3.5 text-center">
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