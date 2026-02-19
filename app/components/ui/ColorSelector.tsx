// app/components/ui/ColorSelector.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPalette, FaCheck, FaUndo } from 'react-icons/fa';
import { useThemeColors } from '@/app/hook';

interface ColorSelectorProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const presetColors = [
  '#7C3AED', // Roxo principal
  '#3B82F6', // Azul
  '#10B981', // Verde
  '#F59E0B', // Laranja
  '#EF4444', // Vermelho
  '#EC4899', // Rosa
  '#8B5CF6', // Roxo claro
  '#6366F1', // Índigo
  '#06B6D4', // Ciano
  '#14B8A6', // Teal
  '#F97316', // Laranja escuro
  '#6B7280', // Cinza
];

export default function ColorSelector({
  value,
  onChange,
  disabled = false,
  className = '',
  label = 'Cor da conta'
}: ColorSelectorProps) {
  const themeColors = useThemeColors();
  const [showCustom, setShowCustom] = useState(false);
  const [tempColor, setTempColor] = useState(value);

  const isValidHex = (color: string) => /^#[0-9A-F]{6}$/i.test(color);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setTempColor(color);
    setShowCustom(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setTempColor(newColor);
  };

  const applyCustomColor = () => {
    if (isValidHex(tempColor)) {
      onChange(tempColor);
      setShowCustom(false);
    }
  };

  const cancelCustomColor = () => {
    setTempColor(value);
    setShowCustom(false);
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Header com preview */}
      <div className="flex items-center justify-between">
        <label className={`text-sm font-medium ${themeColors.text.secondary}`}>
          {label}
        </label>
        
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded-full border-2 border-slate-600"
            style={{ backgroundColor: value }}
          />
          <code className="text-xs font-mono text-slate-400">{value}</code>
        </div>
      </div>
      
      {/* Botão para alternar modos */}
      <button
        type="button"
        onClick={() => setShowCustom(!showCustom)}
        className={`
          w-full flex items-center justify-between p-3 rounded-xl
          border transition-all duration-200
          ${showCustom 
            ? 'border-purple-500 bg-purple-500/10' 
            : `${themeColors.border.primary} ${themeColors.bg.tertiary}`
          }
        `}
      >
        <div className="flex items-center gap-3">
          <FaPalette size={16} className={showCustom ? 'text-purple-400' : 'text-slate-400'} />
          <span className="text-sm">
            {showCustom ? 'Usando cor personalizada' : 'Escolher cor personalizada'}
          </span>
        </div>
        <motion.div
          animate={{ rotate: showCustom ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FaUndo size={14} className="text-slate-400" />
        </motion.div>
      </button>
      
      <AnimatePresence mode="wait">
        {!showCustom ? (
          /* Modo predefinido */
          <motion.div
            key="preset"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <p className="text-xs text-slate-400">Cores predefinidas</p>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {presetColors.map((color) => (
                <motion.button
                  key={color}
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleColorSelect(color)}
                  disabled={disabled}
                  className={`
                    relative w-8 h-8 rounded-lg transition-all
                    ${value === color ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {value === color && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <FaCheck size={12} className="text-white drop-shadow-lg" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Modo personalizado */
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <p className="text-xs text-slate-400">Escolha uma cor personalizada</p>
            
            <div className="flex items-center gap-4">
              {/* Seletor de cor visual */}
              <input
                type="color"
                value={tempColor}
                onChange={handleCustomColorChange}
                disabled={disabled}
                className="w-16 h-16 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                title="Selecionar cor"
              />
              
              {/* Input hexadecimal */}
              <div className="flex-1">
                <input
                  type="text"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  disabled={disabled}
                  className={`
                    w-full px-3 py-2 rounded-lg text-sm font-mono
                    border ${themeColors.border.primary}
                    ${themeColors.bg.secondary} ${themeColors.text.primary}
                    focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  placeholder="#000000"
                  maxLength={7}
                />
                
                {/* Validação */}
                {tempColor !== value && (
                  <p className={`text-xs mt-1 ${isValidHex(tempColor) ? 'text-green-400' : 'text-red-400'}`}>
                    {isValidHex(tempColor) 
                      ? '✓ Formato válido' 
                      : 'Formato inválido. Use #RRGGBB'}
                  </p>
                )}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyCustomColor}
                disabled={!isValidHex(tempColor) || disabled}
                className={`
                  flex-1 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isValidHex(tempColor) && !disabled
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                Aplicar cor
              </button>
              
              <button
                type="button"
                onClick={cancelCustomColor}
                disabled={disabled}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200"
              >
                Cancelar
              </button>
            </div>

            {/* Preview em tempo real */}
            <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg"
                  style={{ backgroundColor: tempColor }}
                />
                <div className="flex-1 h-10 rounded-lg bg-slate-800 flex items-center px-3">
                  <span className="text-sm" style={{ color: tempColor }}>
                    Exemplo de texto
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
