// app/components/dashboard/FinancialChart.tsx
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
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FinancialChartProps {
  income: number;
  expenses: number;
  investments: number;
  showValues?: boolean;
}

const FinancialChart = ({ income, expenses, investments, showValues }: FinancialChartProps) => {
  const data = {
    labels: ['Receitas', 'Despesas', 'Investimentos'],
    datasets: [
      {
        label: 'Valores',
        data: [income, expenses, investments],
        backgroundColor: [
          'rgba(74, 222, 128, 0.9)',  // Verde para receitas
          'rgba(248, 113, 113, 0.9)', // Vermelho para despesas
          'rgba(167, 139, 250, 0.9)', // Roxo para investimentos
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)',
        ],
        borderWidth: 2,
        borderRadius: 12,
        hoverBackgroundColor: [
          'rgba(74, 222, 128, 1)',
          'rgba(248, 113, 113, 1)',
          'rgba(167, 139, 250, 1)',
        ],
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Removemos a legenda pois as labels já estão no eixo X
      },
      title: {
        display: true,
        text: 'Visão Geral Financeira',
        color: '#1F2937',
        font: {
          size: 12,
          weight: 600,
          family: "'Inter', sans-serif"
        },
        // padding: {
        //   bottom: 20
        // }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            return `${showValues ? `R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "******"}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.04)',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 10,
            family: "'Inter', sans-serif"
          },
          callback: function(value: any) {
            return `${showValues ? 'R$ ' + value.toLocaleString('pt-BR') : "******"}`;
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#4B5563',
          font: {
            size: 10,
            weight: 500,
            family: "'Inter', sans-serif"
          }
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeOutQuart' as const
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10
      }
    }
  };

  return (
    <div className="h-70 lg:h-100">
      <Bar data={data} options={options} />
    </div>
  );
};

export default FinancialChart;