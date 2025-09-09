// app/components/dashboard/CategoryDistribution.tsx
"use client";

import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { FaChartPie } from 'react-icons/fa';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryDistributionProps {
  expensesByCategory: Array<{
    categoryId: string | null;
    categoryName: string;
    total: number;
  }>;
  incomeByCategory?: Array<{
    categoryId: string | null;
    categoryName: string;
    total: number;
  }>;
  showValues?: boolean;
}

const CategoryDistribution = ({ 
  expensesByCategory, 
  incomeByCategory = [],
  showValues
}: CategoryDistributionProps) => {
  const [viewMode, setViewMode] = useState<'expense' | 'income'>('expense');
  
  // Paleta de cores moderna e harmoniosa
  const generateColors = (count: number) => {
    const modernColors = [
      'rgba(99, 102, 241, 0.85)',  // Índigo
      'rgba(14, 165, 233, 0.85)',  // Azul céu
      'rgba(139, 92, 246, 0.85)',  // Roxo
      'rgba(236, 72, 153, 0.85)',  // Rosa
      'rgba(249, 115, 22, 0.85)',  // Laranja
      'rgba(16, 185, 129, 0.85)',  // Esmeralda
      'rgba(245, 158, 11, 0.85)',  // Âmbar
      'rgba(239, 68, 68, 0.85)',   // Vermelho
      'rgba(6, 182, 212, 0.85)',   // Ciano
      'rgba(131, 179, 65, 0.85)',  // Verde lima
    ];
    
    return Array.from({ length: count }, (_, i) => modernColors[i % modernColors.length]);
  };


  // Determina quais categorias usar com base no modo de visualização
  const categories = viewMode === 'expense' 
    ? expensesByCategory.filter(cat => cat.total > 0).sort((a, b) => b.total - a.total)
    : incomeByCategory.filter(cat => cat.total > 0).sort((a, b) => b.total - a.total);
  
  const totalAmount = categories.reduce((sum, cat) => sum + cat.total, 0);
  
  const data = {
    labels: categories.map(cat => cat.categoryName),
    datasets: [
      {
        data: categories.map(cat => cat.total),
        backgroundColor: generateColors(categories.length),
        borderColor: '#FFFFFF',
        borderWidth: 3,
        borderRadius: 6,
        hoverBorderColor: '#FFFFFF',
        hoverBorderWidth: 4,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        position: 'bottom' as const,
        labels: {
          boxWidth: 16,
          boxHeight: 16,
          font: {
            size: 12,
            family: "'Inter', sans-serif",
            weight: 500,
          },
          color: '#374151',
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        titleFont: {
          family: "'Inter', sans-serif",
          size: 13,
          weight: 600
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 12,
          weight: 500,
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed;
            const percentage = ((value / totalAmount) * 100).toFixed(1);
            const amount = showValues ? `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} (${percentage}%)` : "******"
            return `${context.label}: ${amount}`;
          }
        }
      },
    },
    cutout: '65%',
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
  };

  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: (chart: any) => {
      if (categories.length > 0) {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Texto principal (valor total)
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.fillStyle = viewMode === 'expense' ? '#DC2626' : '#059669';
        const amount = showValues ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount) : "******";

        ctx.fillText(amount, centerX, centerY - 10);
        
        // Texto secundário
        ctx.font = '500 10px "Inter", sans-serif';
        ctx.fillStyle = '#6B7280';
        ctx.fillText(`Total de ${viewMode === 'expense' ? 'despesas' : 'receitas'}`, centerX, centerY + 12);
        
        ctx.restore();
      }
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-lg p-3 lg:p-6">
      <div className="flex flex-col items-center justify-between mb-3 gap-1">
        <h3 className="text-lg font-semibold text-gray-800">Distribuição por Categoria</h3>
        
        <div className="flex items-center gap-4">
          {/* Seletor de visualização */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('expense')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'expense' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setViewMode('income')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'income' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Receitas
            </button>
          </div>
        </div>
      </div>
      
      <div className="h-70 lg:h-100 relative">
        {categories.length > 0 ? (
          <>
            <Doughnut data={data} options={options} plugins={[centerTextPlugin]} key={`${totalAmount}`} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Texto central será desenhado pelo plugin */}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <FaChartPie className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium">
              Nenhuma {viewMode === 'expense' ? 'despesa' : 'receita'}
            </p>
            <p className="text-xs mt-1">
              Adicione {viewMode === 'expense' ? 'despesas' : 'receitas'} para ver a distribuição
            </p>
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mt-2 pt-2 lg:mt-4 lg:pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category, index) => {
              const percentage = ((category.total / totalAmount) * 100).toFixed(1);
              return (
                <div key={category.categoryId || index} className="flex items-center">
                  <div 
                    className="w-2 lg:w-3 h-2 lg:h-3 rounded-full mr-1 lg:mr-2 shadow-sm"
                    style={{ backgroundColor: generateColors(categories.length)[index] }}
                  />
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {category.categoryName}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {showValues ? `${percentage}%` : "******"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryDistribution;