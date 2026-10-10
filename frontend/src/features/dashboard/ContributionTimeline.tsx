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
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Task Trello" fill="#2563eb" />
          <Bar dataKey="Chỉnh sửa Docs" fill="#16a34a" />
          <Bar dataKey="Điểm thủ công" fill="#eab308" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
