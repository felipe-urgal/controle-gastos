'use client';

import { useState } from 'react';
import { FaCheck, FaPalette, FaUndo } from 'react-icons/fa';

interface ColorSelectorProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const presetColors = [
  '#7C3AED',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#6366F1',
  '#06B6D4',
  '#14B8A6',
  '#F97316',
  '#6B7280',
];

export default function ColorSelector({
  value,
  onChange,
  disabled = false,
  className = '',
  label = 'Cor da conta',
}: ColorSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [tempColor, setTempColor] = useState(value);

  const isValidHex = (color: string) => /^#[0-9A-F]{6}$/i.test(color);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setTempColor(color);
    setShowCustom(false);
  };

  const applyCustomColor = () => {
    if (!disabled && isValidHex(tempColor)) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="ds-label">{label}</span>

        <div className="flex items-center gap-2">
          <span
            className="h-8 w-8 rounded-full border-2 border-[var(--border-strong)]"
            style={{ backgroundColor: value }}
            aria-hidden="true"
          />
          <code className="text-sm font-medium text-[var(--text-muted)]">{value}</code>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowCustom((current) => !current)}
        disabled={disabled}
        aria-expanded={showCustom}
        className={`
          flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5
          text-sm font-semibold transition-[background-color,border-color,color] duration-150
          ${
            showCustom
              ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--foreground)]'
              : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
          }
          disabled:cursor-not-allowed disabled:opacity-50
        `}
      >
        <span className="flex items-center gap-3">
          <FaPalette className={showCustom ? 'text-[var(--primary)]' : ''} aria-hidden="true" />
          <span>
            {showCustom ? 'Usando cor personalizada' : 'Escolher cor personalizada'}
          </span>
        </span>
        <FaUndo aria-hidden="true" />
      </button>

      {!showCustom ? (
        <div className="space-y-3">
          <p className="ds-helper">Cores predefinidas</p>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {presetColors.map((color) => {
              const selected = value.toUpperCase() === color.toUpperCase();

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  disabled={disabled}
                  aria-label={`Selecionar cor ${color}`}
                  aria-pressed={selected}
                  className={`
                    relative h-11 w-11 rounded-[var(--radius-md)] border border-[var(--border-strong)]
                    transition-[box-shadow,transform] duration-150
                    ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)]' : ''}
                    disabled:cursor-not-allowed disabled:opacity-50
                  `}
                  style={{ backgroundColor: color }}
                >
                  {selected && (
                    <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                      <FaCheck className="text-white drop-shadow" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <p className="ds-helper">Escolha uma cor personalizada</p>

          <div className="flex items-center gap-4">
            <input
              type="color"
              value={isValidHex(tempColor) ? tempColor : value}
              onChange={(event) => setTempColor(event.target.value)}
              disabled={disabled}
              className="h-14 w-14 shrink-0 cursor-pointer rounded-[var(--radius-md)] border-0 bg-transparent p-0 disabled:cursor-not-allowed"
              aria-label="Selecionar cor personalizada"
            />

            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={tempColor}
                onChange={(event) => setTempColor(event.target.value)}
                disabled={disabled}
                className="ds-control px-3.5 py-2.5 font-mono"
                placeholder="#000000"
                maxLength={7}
                aria-label="Código hexadecimal da cor"
                aria-invalid={tempColor !== value && !isValidHex(tempColor) ? true : undefined}
              />

              {tempColor !== value && (
                <p
                  className={`mt-1.5 text-sm ${
                    isValidHex(tempColor)
                      ? 'text-[var(--income)]'
                      : 'text-[var(--expense)]'
                  }`}
                  role={isValidHex(tempColor) ? 'status' : 'alert'}
                >
                  {isValidHex(tempColor)
                    ? 'Formato válido'
                    : 'Formato inválido. Use #RRGGBB'}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancelCustomColor}
              disabled={disabled}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={applyCustomColor}
              disabled={!isValidHex(tempColor) || disabled}
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aplicar cor
            </button>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="ds-helper mb-2">Prévia</p>
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-10 rounded-[var(--radius-sm)]"
                style={{ backgroundColor: isValidHex(tempColor) ? tempColor : value }}
                aria-hidden="true"
              />
              <span
                className="text-base font-medium"
                style={{ color: isValidHex(tempColor) ? tempColor : value }}
              >
                Exemplo de texto
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
