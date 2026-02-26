// app/components/forms/ColorIconSelector.tsx
'use client';

import { useState } from 'react';
import { FaPalette, FaIcons } from 'react-icons/fa';
import { ColorSelector, IconSelector } from '@/app/components';

interface ColorIconSelectorProps {
  color: string;
  icon: string;
  onColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
  disabled?: boolean;
  colorLabel?: string;
  iconLabel?: string;
}

export default function ColorIconSelector({
  color,
  icon,
  onColorChange,
  onIconChange,
  disabled = false,
  colorLabel = 'Cor',
  iconLabel = 'Ícone'
}: ColorIconSelectorProps) {
  const [activeTab, setActiveTab] = useState<'color' | 'icon'>('color');

  return (
    <div className="w-full space-y-6">
      <div className="flex gap-2 p-1 bg-slate-800/60 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('color')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${activeTab === 'color' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white'
            }
          `}
        >
          <FaPalette size={14} />
          {colorLabel}
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('icon')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${activeTab === 'icon' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white'
            }
          `}
        >
          <FaIcons size={14} />
          {iconLabel}
        </button>
      </div>

      {activeTab === 'color' ? (
        <ColorSelector
          value={color}
          onChange={onColorChange}
          disabled={disabled}
          label={colorLabel}
        />
      ) : (
        <IconSelector
          value={icon}
          onChange={onIconChange}
          disabled={disabled}
          label={iconLabel}
        />
      )}
    </div>
  );
}
