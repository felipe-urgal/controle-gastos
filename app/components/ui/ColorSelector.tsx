// app/components/ui/ColorSelector.tsx
'use client';

import { useTheme } from '@/app/context/ThemeContext';

export const COLOR_OPTIONS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'
];

interface ColorSelectorProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  showInput?: boolean;
  className?: string;
}

export default function ColorSelector({
  value,
  onChange,
  disabled = false,
  showInput = true,
  className = ''
}: ColorSelectorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const colors = {
    border: {
      primary: isDark ? 'border-gray-700' : 'border-gray-200',
      accent: isDark ? 'border-blue-500' : 'border-blue-500',
    },
    bg: {
      secondary: isDark ? 'bg-gray-800' : 'bg-gray-50',
    },
    text: {
      primary: isDark ? 'text-gray-100' : 'text-gray-900',
      secondary: isDark ? 'text-gray-300' : 'text-gray-600',
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className={`block text-sm font-semibold ${colors.text.secondary}`}>
        Selecione uma Cor
      </label>
      
      <div className="flex flex-wrap gap-2">
        {/*{COLOR_OPTIONS.map((color) => (
          <button
            key={color}
            type="button"
            className={`
              w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 active:scale-95
              ${value === color 
                ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 scale-110' 
                : `${colors.border.primary} hover:border-blue-300`
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            disabled={disabled}
            title={color}
          />
        ))}*/}
        
        {showInput && (
          <div className="relative">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className={`
                w-8 h-8 rounded-full cursor-pointer border-2 ${colors.border.primary}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title="Escolher cor personalizada"
            />
          </div>
        )}
      </div>

      {showInput && (
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`
              flex-1 px-3 py-2 border rounded-lg text-sm font-mono
              ${colors.border.primary} ${colors.bg.secondary} ${colors.text.primary}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            placeholder="#000000"
          />
          <div 
            className="w-10 h-10 rounded border"
            style={{ backgroundColor: value }}
          />
        </div>
      )}
    </div>
  );
}