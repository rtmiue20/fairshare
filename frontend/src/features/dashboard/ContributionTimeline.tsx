import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ContributionScore } from '../../types/contribution';

export interface ContributionTimelineProps {
  data: ContributionScore[];
}

export const ContributionTimeline: React.FC<ContributionTimelineProps> = ({ data }) => {
  const safeData = Array.isArray(data) ? data : [];
  const chartData = safeData.map((d) => ({
    name: (d.userName || `#${d.userId}`).replace(/\s*\(.*?\)\s*/g, ''),
    'Task Board': Number(d.taskCompletedCount ?? 0),
    'Chỉnh sửa Docs': Number(d.docsEditCount ?? 0),
    'Điểm thủ công': Number(d.manualScore ?? 0),
  }));

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="name"
            stroke="var(--fg3)"
            fontSize={11}
            tick={{ fill: 'var(--fg3)' }}
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis stroke="var(--fg3)" fontSize={11} tick={{ fill: 'var(--fg3)' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface2)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              color: 'var(--fg)',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: 'var(--fg2)' }} />
          <Bar dataKey="Task Board" fill="var(--m1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Chỉnh sửa Docs" fill="var(--ok)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Điểm thủ công" fill="var(--m3)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
