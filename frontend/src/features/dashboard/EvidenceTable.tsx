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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--fg3)',
          gap: '0.5rem',
        }}
      >
        <AlertCircle style={{ width: 28, height: 28, color: 'var(--fg3)' }} />
        <p style={{ margin: 0, fontSize: '0.82rem' }}>Không có dữ liệu bằng chứng</p>
      </div>
    );
  }

  const renderSourceBadge = (sourceType?: string) => {
    const type = (sourceType || 'BOARD').toUpperCase();

    if (type === 'BOARD') {
      return (
        <span
          data-testid="badge-source-board"
          className="chip"
          style={{
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <LayoutList style={{ width: 11, height: 11 }} />
          Task Board nội bộ
        </span>
      );
    }

    if (type === 'MANUAL') {
      return (
        <span
          data-testid="badge-source-manual"
          className="chip"
          style={{
            background: 'color-mix(in srgb, var(--ital) 12%, transparent)',
            color: 'var(--ital)',
            border: '1px solid color-mix(in srgb, var(--ital) 30%, transparent)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <FileText style={{ width: 11, height: 11 }} />
          Khai báo thủ công
        </span>
      );
    }

    return (
      <span
        className="chip"
        style={{ background: 'var(--surface2)', color: 'var(--fg2)', border: '1px solid var(--line)' }}
      >
        {type}
      </span>
    );
  };

  const renderStatusBadge = (status?: string) => {
    const st = (status || 'DONE').toUpperCase();

    if (st === 'DONE' || st === 'COMPLETED') {
      return (
        <span
          className="chip"
          style={{
            background: 'color-mix(in srgb, var(--ok) 12%, transparent)',
            color: 'var(--ok)',
            border: '1px solid color-mix(in srgb, var(--ok) 30%, transparent)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <CheckCircle2 style={{ width: 10, height: 10 }} />
          Hoàn thành
        </span>
      );
    }

    if (st === 'APPROVED' || st === 'VERIFIED') {
      return (
        <span
          className="chip"
          style={{
            background: 'color-mix(in srgb, var(--m4) 12%, transparent)',
            color: 'var(--m4)',
            border: '1px solid color-mix(in srgb, var(--m4) 30%, transparent)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <UserCheck style={{ width: 10, height: 10 }} />
          Đã phê duyệt
        </span>
      );
    }

    if (st === 'IN_PROGRESS') {
      return (
        <span
          className="chip"
          style={{
            background: 'color-mix(in srgb, var(--warn) 12%, transparent)',
            color: 'var(--warn)',
            border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Clock style={{ width: 10, height: 10 }} />
          Đang thực hiện
        </span>
      );
    }

    return (
      <span
        className="chip"
        style={{ background: 'var(--surface2)', color: 'var(--fg3)', border: '1px solid var(--line)' }}
      >
        {st}
      </span>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: 8,
        border: '1px solid var(--line)',
      }}
    >
      <table
        className="w-full"
        style={{
          minWidth: 700,
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.8rem',
          color: 'var(--fg)',
        }}
        data-testid="evidence-table"
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--line)',
              background: 'var(--surface2)',
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: 'var(--fg3)',
              textTransform: 'uppercase',
            }}
          >
            <th scope="col" style={{ padding: '0.65rem 1rem' }}>Nguồn</th>
            <th scope="col" style={{ padding: '0.65rem 1rem' }}>Tên công việc</th>
            <th scope="col" style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Story Points</th>
            <th scope="col" style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Điểm thực nhận</th>
            <th scope="col" style={{ padding: '0.65rem 1rem' }}>Thời gian ghi nhận</th>
            <th scope="col" style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {items.map((rawItem, index) => {
            const item = normalizeEvidenceItem(rawItem, index);
            const { sourceType, sourceId, taskName, storyPoints, earnedScore, eventTime, status } = item;

            return (
              <tr
                key={`${sourceType}-${sourceId}-${index}`}
                style={{ borderTop: '1px solid var(--line)', transition: 'background 0.12s' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface2)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                {/* Nguồn */}
                <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                  {renderSourceBadge(sourceType)}
                </td>

                {/* Tên công việc */}
                <td style={{ padding: '0.65rem 1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{taskName}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--fg3)', fontFamily: 'var(--f-mono)' }}>
                      Mã task: #{sourceId}
                    </span>
                  </div>
                </td>

                {/* Story Points */}
                <td style={{ padding: '0.65rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {typeof storyPoints === 'number' && storyPoints > 0 ? (
                    <span
                      className="chip"
                      style={{
                        background: 'color-mix(in srgb, var(--m3) 12%, transparent)',
                        color: 'var(--m3)',
                        border: '1px solid color-mix(in srgb, var(--m3) 30%, transparent)',
                        fontWeight: 700,
                      }}
                    >
                      {storyPoints} SP
                    </span>
                  ) : (
                    <span style={{ color: 'var(--fg3)' }}>—</span>
                  )}
                </td>

                {/* Điểm thực nhận */}
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--ok)', fontFamily: 'var(--f-mono)' }}>
                    +{Number(earnedScore).toFixed(1)}
                  </span>
                </td>

                {/* Thời gian */}
                <td
                  style={{
                    padding: '0.65rem 1rem',
                    whiteSpace: 'nowrap',
                    fontSize: '0.72rem',
                    color: 'var(--fg3)',
                    fontFamily: 'var(--f-mono)',
                  }}
                >
                  {formatDateTime(eventTime)}
                </td>

                {/* Trạng thái */}
                <td style={{ padding: '0.65rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
