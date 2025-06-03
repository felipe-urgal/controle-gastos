// app/components/DonutChart.tsx
"use client";

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  data: {
    categoryId: string | null;
    categoryName: string | null;
    total: number;
  }[];
}

export function DonutChart({ data }: DonutChartProps) {
  const chartData = {
    labels: data.map(item => item.categoryName || 'Sem categoria'),
    datasets: [
      {
        data: data.map(item => Math.abs(item.total)),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
          '#6366f1', '#14b8a6', '#f97316', '#64748b', '#06b6d4'
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const label = context.label || '';
            const value = Number(context.raw) || 0;
            const total = context.dataset.data.reduce((a: number, b: unknown) => {
              const num = typeof b === 'number' ? b : Number(b);
              return a + num;
            }, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: R$ ${value.toLocaleString('pt-BR')} (${percentage}%)`;
          }
        }
      }
    },
    maintainAspectRatio: false,
  };

  return <Doughnut data={chartData} options={options} />;
}