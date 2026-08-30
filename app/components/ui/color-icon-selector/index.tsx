'use client';

import { useState } from 'react';
import { FaIcons, FaPalette } from 'react-icons/fa';

import { ColorSelector, IconSelector } from '@/app/components/ui';

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
  iconLabel = 'Ícone',
}: ColorIconSelectorProps) {
  const [activeTab, setActiveTab] = useState<'color' | 'icon'>('color');

  return (
    <div className="w-full space-y-5">
      <div
        className="inline-flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-1"
        aria-label="Personalização visual"
      >
        <button
          type="button"
          onClick={() => setActiveTab('color')}
          disabled={disabled}
          aria-pressed={activeTab === 'color'}
          className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-4 text-sm font-semibold transition-colors ${
            activeTab === 'color'
              ? 'bg-[var(--primary-subtle)] text-[var(--foreground)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <FaPalette
            className={activeTab === 'color' ? 'text-[var(--primary)]' : ''}
            aria-hidden="true"
          />
          {colorLabel}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('icon')}
          disabled={disabled}
          aria-pressed={activeTab === 'icon'}
          className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-4 text-sm font-semibold transition-colors ${
            activeTab === 'icon'
              ? 'bg-[var(--primary-subtle)] text-[var(--foreground)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <FaIcons
            className={activeTab === 'icon' ? 'text-[var(--primary)]' : ''}
            aria-hidden="true"
          />
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
