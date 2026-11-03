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
        <PieChart margin={{ top: 10, right: 35, bottom: 10, left: 35 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={5}
            dataKey="value"
            isAnimationActive={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#121318',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Tỷ lệ']}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
