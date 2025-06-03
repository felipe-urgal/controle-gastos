"use client";
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  TooltipItem
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type AccountType = 'expense' | 'income' | 'investment';

interface AccountData {
  accountName: string;
  byType: {
    [key in AccountType]: number;
  };
}

interface BarChartProps {
  accounts: AccountData[];
  title?: string;
  height?: number;
  width?: number;
  showLegend?: boolean;
  stacked?: boolean;
}

const DEFAULT_COLORS = {
  income: '#10b981',    // Emerald-500
  investment: '#6366f1', // Indigo-500
  expense: '#ef4444'    // Red-500
};

export function BarChart({
  accounts,
  title = 'Resumo Financeiro por Conta',
  height = 400,
  width = 600,
  showLegend = true,
  stacked = true
}: BarChartProps) {
  // Formata os dados para o gráfico
  const chartData: ChartData<'bar'> = {
    labels: accounts.map(acc => acc.accountName),
    datasets: [
      {
        label: 'Renda',
        data: accounts.map(acc => acc.byType.income),
        backgroundColor: DEFAULT_COLORS.income,
        borderColor: DEFAULT_COLORS.income,
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Investimentos',
        data: accounts.map(acc => acc.byType.investment),
        backgroundColor: DEFAULT_COLORS.investment,
        borderColor: DEFAULT_COLORS.investment,
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Despesas',
        data: accounts.map(acc => acc.byType.expense),
        backgroundColor: DEFAULT_COLORS.expense,
        borderColor: DEFAULT_COLORS.expense,
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: false,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 0,
          bottom: 0
        }
      },
      legend: {
        display: showLegend,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 10,
        }
      },
      tooltip: {
        mode: stacked ? 'x' : 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 20,
          weight: 'bold'
        },
        bodyFont: {
          size: 15
        },
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const label = context.dataset.label || '';
            const value = context.raw as number;
            return `${label}: R$ ${value.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
          },
          footer: (items) => {
            if (stacked && items.length > 1) {
              const total = items.reduce(
                (sum, item) => sum + (item.raw as number),
                0
              );
              return `Total: R$ ${total.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        stacked,
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
      y: {
        stacked,
        beginAtZero: true,
        grid: {
          color: '#6b7280',
          lineWidth: 1,
          drawOnChartArea: true,
          drawTicks: true,
          tickLength: 1,
          tickColor: '#6b7280'
        },
        border: {
          display: false,
          color: '#4b5563', // gray-300
          dash: [4, 9], // Borda tracejada
          width: 1
        },
        ticks: {
          color: '#6b7280', // gray-700
          font: {
            size: 15,
            family: "'Inter', sans-serif",
            weight: 600
          },
          padding: 8,
          callback: (value) => {
            const numValue = Number(value);
            if (numValue >= 1000000) {
              return `R$ ${(numValue / 1000000).toFixed(1)}M`;
            } else if (numValue >= 1000) {
              return `R$ ${(numValue / 1000).toFixed(1)}K`;
            }
            return `R$ ${numValue.toLocaleString('pt-BR', {
              maximumFractionDigits: 0
            })}`;
          },
        },
      },
    },
    animation: {
      duration: 1000
    }
  };

  return (
    <div style={{ height: `${height}px`, width: '100%', maxWidth: `${width}px` }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}