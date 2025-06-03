// app/components/DonutChart.tsx
"use client";

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem, ChartOptions } from 'chart.js';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface DonutChartProps {
  data: {
    categoryId: string | null;
    categoryName: string | null;
    total: number;
  }[];
  title?: string;
  loading?: boolean;
}

export function DonutChart({ data, title, loading = false }: DonutChartProps) {
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate consistent colors based on category names
  const generateColors = (labels: string[]) => {
    const baseColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
      '#6366f1', '#14b8a6', '#f97316', '#64748b', '#06b6d4',
      '#ef4444', '#84cc16', '#0ea5e9', '#a855f7', '#d946ef'
    ];
    
    return labels.map((_, index) => baseColors[index % baseColors.length]);
  };

  const labels = data.map(item => item.categoryName || 'Sem categoria');
  const values = data.map(item => Math.abs(item.total));
  const total = values.reduce((sum, value) => sum + value, 0);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: generateColors(labels),
        borderColor: theme === 'dark' ? '#1e293b' : '#ffffff',
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#e2e8f0',
          font: {
            size: 14,
            family: 'Inter, sans-serif',
          },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: !!title,
        text: title,
        color: '#f8fafc',
        font: {
          size: 18,
          weight: 'bold',
          family: 'Inter, sans-serif',
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
        titleColor: theme === 'dark' ? '#f8fafc' : '#1e293b',
        bodyColor: theme === 'dark' ? '#e2e8f0' : '#475569',
        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 20,
          weight: 'bold'
        },
        bodyFont: {
          size: 15
        },
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const label = context.label || '';
            const value = Number(context.raw) || 0;
            const percentage = Math.round((value / total) * 100);
            return [
              `${label}:`,
              `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              `(${percentage}%)`
            ];
          },
        },
      },
      datalabels: {
        display: true, // Disabled by default, can be enabled via props
        color: theme === 'dark' ? '#f8fafc' : '#1e293b',
        font: {
          weight: 'bold',
          size: 15,
        },
        formatter: (value: number) => {
          const percentage = Math.round((value / total) * 100);
          return `${percentage}%`;
        },
      },
    },
    cutout: '65%',
    maintainAspectRatio: false,
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  if (!isMounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          Nenhum dado disponível
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[200px]">
      {total > 0 && (
        <div className="flex items-end justify-end pointer-events-none">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}
      <Doughnut 
        data={chartData} 
        options={options}
        className="w-full h-full"
      />
    </div>
  );
}