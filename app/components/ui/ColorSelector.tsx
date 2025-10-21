// app/components/ui/ColorSelector.tsx
'use client';

import { useThemeColors } from '@/app/hook';

export default function ColorSelector({
  value,
  onChange,
  disabled = false,
  className = ''
}: any) {
  const themeColors = useThemeColors();

  return (
    <div className={`space-y-3 ${className}`}>
      <label className={`block text-sm font-semibold ${themeColors.text.secondary}`}>
        Selecione uma Cor
      </label>
      
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            flex-1 px-3 py-2 border rounded-lg text-sm font-mono
            ${themeColors.border.primary} ${themeColors.bg.secondary} ${themeColors.text.primary}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          placeholder="#000000"
        />
        <div 
          className={`w-10 h-10 rounded border ${themeColors.border.primary}`}
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
}