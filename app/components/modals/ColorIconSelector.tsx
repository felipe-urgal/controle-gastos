// app/components/forms/ColorIconSelector.tsx
'use client';

import { IconSelector, IconRenderer, useIcons } from '@/app/components';

import { useThemeColors } from '@/app/hook';

interface ColorIconSelectorProps {
  color: string;
  icon: string;
  onColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
  disabled?: boolean;
  colorLabel?: string;
}

export default function ColorIconSelector({
  color,
  icon,
  onColorChange,
  onIconChange,
  disabled = false,
  colorLabel = 'Cor'
}: ColorIconSelectorProps) {
  const { getIconLabel } = useIcons();
  const colors = useThemeColors();

  return (
    <>
      {/* Color Selector */}
      <div>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center justify-start sm:justify-start">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
            {colorLabel}
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            disabled={disabled}
            className="w-20 h-8 rounded cursor-pointer border border-gray-300"
            title="Escolher cor manualmente"
          />

          <div className={`
            ${colors.border.accent} border rounded-full px-3 py-1
            flex items-center gap-3 transition-all
          `}>
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              <IconRenderer 
                iconName={icon} 
                className="w-3.5 h-3.5"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-xs ${colors.text.secondary} capitalize`}>
                {getIconLabel(icon)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Icon Selector */}
      <div className="mt-4">
        <IconSelector
          value={icon}
          onChange={onIconChange}
          disabled={disabled}
          mode='compact'
        />
      </div>
    </>
  );
}