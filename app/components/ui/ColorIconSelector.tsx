// app/components/forms/ColorIconSelector.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      {/* Preview */}
      {/*<div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <div 
          className="w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-lg"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 10px 20px ${color}40`
          }}
        >
          <IconRenderer iconName={icon} size={28} />
        </div>
        
        <div>
          <p className="text-sm text-slate-400">Preview</p>
          <p className="text-white font-medium">Como sua conta aparecerá</p>
        </div>
      </div>*/}

      {/* Tabs */}
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

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'color' ? (
          <motion.div
            key="color"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ColorSelector
              value={color}
              onChange={onColorChange}
              disabled={disabled}
              label={colorLabel}
            />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <IconSelector
              value={icon}
              onChange={onIconChange}
              disabled={disabled}
              label={iconLabel}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
