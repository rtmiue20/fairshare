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
  const chartData = data.map((d) => ({
    name: d.userName,
    'Task Trello': d.taskCompletedCount,
    'Chỉnh sửa Docs': d.docsEditCount,
    'Điểm thủ công': d.manualScore,
  }));

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            fontSize={11}
            tick={{ fill: '#94a3b8' }}
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#121318',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="Task Trello" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Chỉnh sửa Docs" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Điểm thủ công" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
