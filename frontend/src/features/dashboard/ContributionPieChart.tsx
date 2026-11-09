import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ContributionScore } from '../../types/contribution';

export interface ContributionPieChartProps {
  data: ContributionScore[];
}

// Matches sample CSS --m1..m4 + --ok + --ital
const COLORS = ['#5b8def', '#4cc38a', '#e8a33d', '#c06be0', '#3fbfa8', '#a99bff'];

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
            labelLine={{ stroke: 'var(--fg3)' }}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface2)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              color: 'var(--fg)',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Tỷ lệ']}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: 'var(--fg2)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
