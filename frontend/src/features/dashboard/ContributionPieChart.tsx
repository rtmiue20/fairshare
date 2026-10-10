import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ContributionScore } from '../../types/contribution';

export interface ContributionPieChartProps {
  data: ContributionScore[];
}

const COLORS = ['#2563eb', '#16a34a', '#eab308', '#dc2626', '#8b5cf6', '#ec4899'];

export const ContributionPieChart: React.FC<ContributionPieChartProps> = ({ data }) => {
  const chartData = data.map((d) => ({
    name: d.userName,
    value: d.percentage * 100,
  }));

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Tỷ lệ']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
