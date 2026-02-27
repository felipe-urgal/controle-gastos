'use client';

// importing hooks
import { useState } from 'react';

// importing icons
import { FaPalette, FaIcons } from 'react-icons/fa';

// importing components
import { ColorSelector, IconSelector } from '@/app/components/ui';

interface ColorIconSelectorProps {
  color: string;
  icon: string;
  onColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
  disabled?: boolean;
  colorLabel?: string;
  iconLabel?: string;
};

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
      <div className="flex justify-end items-end p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('color')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${activeTab === 'color' 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white bg-slate-800/60 '
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
              : 'text-slate-400 hover:text-white bg-slate-800/60 '
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
