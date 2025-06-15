// components/dashboard/SummaryCard.tsx
"use client";

interface SummaryCardProps {
  title: string;
  value: number;
  type: 'income' | 'expense' | 'investment' | 'total';
}

export function SummaryCard({ title, value, type }: SummaryCardProps) {
  const colors = {
    income: { text: 'text-emerald-400', bg: 'bg-emerald-500' },
    expense: { text: 'text-rose-400', bg: 'bg-rose-500' },
    investment: { 
      text: value >= 0 ? 'text-emerald-400' : 'text-rose-400', 
      bg: value >= 0 ? 'bg-emerald-500' : 'bg-rose-500' 
    },
    total: { 
      text: value >= 0 ? 'text-emerald-400' : 'text-rose-400', 
      bg: value >= 0 ? 'bg-emerald-500' : 'bg-rose-500',
    }
  };

  return (
    <div className={`bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg hover:border-${colors[type].text}/30 transition-colors`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-[10px] lg:text-xl uppercase tracking-wider text-gray-400">{title}</h3>
          </div>
          <p className={`mt-3 text-xs lg:text-xl font-bold ${colors[type].text}`}>
            {value.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 2
            })}
          </p>
        </div>
      </div>
      <div className="mt-4 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[type].bg}`} 
          style={{ 
            width: `${(() => {
              if (type === 'total') {
                const maxValue = Math.max(Math.abs(value), 1);
                return (Math.abs(value) / maxValue) * 100;
              }
              return value > 0 ? 100 : 0;
            })()}%` 
          }}
        ></div>
      </div>
    </div>
  );
}