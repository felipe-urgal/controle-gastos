"use client";

import { useThemeColors } from '@/app/hook/useThemeColors';
import { FaList, FaCalendarAlt, FaChartBar } from 'react-icons/fa';

type ViewMode = 'month' | 'list' | 'stats';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  disabled: boolean;
}

export default function ViewToggle({ currentView, onViewChange, disabled }: ViewToggleProps) {
  const colors = useThemeColors();

  const views = [
    { id: 'month' as ViewMode, label: 'Mês', icon: FaCalendarAlt },
    { id: 'list' as ViewMode, label: 'Lista', icon: FaList },
    { id: 'stats' as ViewMode, label: 'Estatísticas', icon: FaChartBar },
  ];

  const disabledStyles = {
    button: `opacity-50 cursor-not-allowed ${colors.button.primary.bg} ${colors.button.primary.text}`,
    ghostButton: `opacity-50 cursor-not-allowed ${colors.button.ghost.bg} ${colors.button.ghost.text}`,
    text: `opacity-70`
  };

  return (
    <div className={`flex rounded-lg p-1 ${colors.bg.secondary} border ${colors.border.primary}`}>
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;
        
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            disabled={disabled}
            className={`
              flex items-center gap-2 px-3 py-2 lg:py-1 rounded-md text-sm font-medium transition-all duration-200
              ${disabled
                  ? disabledStyles.ghostButton
                  : ``}
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