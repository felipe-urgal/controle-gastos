// Crie um novo componente BarChart
"use client";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, TooltipItem } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  accounts: {
    accountName: string;
    byType: {
      expense: number;
      income: number;
      investment: number;
    };
  }[];
}

export function BarChart({ accounts }: BarChartProps) {
  const data = {
    labels: accounts.map(acc => acc.accountName),
    datasets: [
      {
        label: 'Renda',
        data: accounts.map(acc => acc.byType.income),
        backgroundColor: '#10b981',
      },
      {
        label: 'Investimentos',
        data: accounts.map(acc => acc.byType.investment),
        backgroundColor: '#6366f1',
      },
      {
        label: 'Despesas',
        data: accounts.map(acc => acc.byType.expense),
        backgroundColor: '#ef4444',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const label = context.dataset.label || '';
            const value = Number(context.raw || 0);
            return `${label}: R$ ${value.toLocaleString('pt-BR')}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
      },
    },
  };

  return <Bar data={data} options={options} />;
}