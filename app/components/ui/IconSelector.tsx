// app/components/ui/IconSelector.tsx
'use client';
import { useThemeColors } from '@/app/hook';

import IconRenderer, { useIcons } from './IconRenderer';

export default function IconSelector({
  value,
  onChange,
  disabled = false,
  mode = 'full',
  className = ''
}: any) {
  const { getIconLabel, getAllIcons } = useIcons();

  const colors = useThemeColors();

  const icons = getAllIcons()

  // Renderização compacta (para modais pequenos)
  if (mode === 'compact') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Grid de ícones */}
        <div className={`border rounded-xl ${colors.border.primary} ${colors.bg.secondary}`}>
          <div className="grid grid-cols-10 gap-2 max-h-30 overflow-y-auto px-3 py-2">
            {icons.map((icon: string) => (
              <button
                key={icon}
                type="button"
                className={`
                  group relative transition-all duration-200 flex flex-col items-center
                  ${value === icon 
                    ? `${colors.border.accent}` 
                    : `${colors.border.primary}`
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => onChange(icon)}
                disabled={disabled}
                title={getIconLabel(icon)}
              >
                <div className={`
                  rounded-full flex items-center justify-center transition-colors
                  ${value === icon 
                    ? colors.colors.info.text
                    : colors.text.tertiary
                  }
                `}>
                  <IconRenderer 
                    iconName={icon} 
                    className="w-5 h-5"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Renderização completa
  return (
    <div className={`space-y-4 ${className}`}>
    </div>
  );
}
