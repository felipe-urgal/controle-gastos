"use client";

import { useThemeColors } from '@/app/hook/useThemeColors';
import { FaList, FaCalendarAlt, FaChartBar } from 'react-icons/fa';

type ViewMode = 'month' | 'list' | 'stats';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  const colors = useThemeColors();

  const views = [
    { id: 'month' as ViewMode, label: 'Mês', icon: FaCalendarAlt },
    { id: 'list' as ViewMode, label: 'Lista', icon: FaList },
    { id: 'stats' as ViewMode, label: 'Estatísticas', icon: FaChartBar },
  ];

  return (
    <div className={`flex rounded-lg p-1 ${colors.bg.secondary} border ${colors.border.primary}`}>
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;
        
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${isActive 
                ? `${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow}` 
                : `${colors.text.secondary} hover:${colors.bg.primary}`
              }
            `}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}