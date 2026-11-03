'use client';

import { useMemo, useState } from 'react';

import { Input, Select } from '@/app/components/ui';

type Preset = 'month' | 'six' | 'year' | 'custom';

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: 'month', label: 'Mês exibido' },
  { value: 'six', label: 'Últimos 6 meses' },
  { value: 'year', label: 'Últimos 12 meses' },
  { value: 'custom', label: 'Personalizado' },
];

function iso(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function lastDay(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Intervalo que termina no último dia do mês exibido e recua `months - 1` meses. */
function presetRange(preset: Exclude<Preset, 'custom'>, month: number, year: number) {
  const months = preset === 'month' ? 1 : preset === 'six' ? 6 : 12;
  const start = new Date(Date.UTC(year, month - months, 1));
  return {
    from: iso(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    to: iso(year, month, lastDay(year, month)),
  };
}

export function formatBrDate(value: string) {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

/** Estado do seletor de período (mês, 6 meses, 12 meses ou datas livres), relativo ao mês exibido. */
export function usePeriodRange(month: number, year: number, onChange?: () => void) {
  const [preset, setPresetState] = useState<Preset>('month');
  const [customFrom, setCustomFromState] = useState(iso(year, month, 1));
  const [customTo, setCustomToState] = useState(iso(year, month, lastDay(year, month)));

  const range = useMemo(
    () => (preset === 'custom' ? { from: customFrom, to: customTo } : presetRange(preset, month, year)),
    [preset, customFrom, customTo, month, year],
  );
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(range.from) && /^\d{4}-\d{2}-\d{2}$/.test(range.to) && range.from <= range.to;

  return {
    preset,
    customFrom,
    customTo,
    range,
    valid,
    setPreset: (value: Preset) => { setPresetState(value); onChange?.(); },
    setCustomFrom: (value: string) => { setCustomFromState(value); onChange?.(); },
    setCustomTo: (value: string) => { setCustomToState(value); onChange?.(); },
  };
}

export function PeriodPicker({ state, disabled }: { state: ReturnType<typeof usePeriodRange>; disabled?: boolean }) {
  return (
    <div className="space-y-3">
      <Select
        label="Período"
        value={state.preset}
        onChange={(value) => state.setPreset(value as Preset)}
        options={PRESETS}
        disabled={disabled}
      />
      {state.preset === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="De" type="date" value={state.customFrom} onChange={(event) => state.setCustomFrom(event.target.value)} disabled={disabled} />
          <Input label="Até" type="date" value={state.customTo} onChange={(event) => state.setCustomTo(event.target.value)} disabled={disabled} />
        </div>
      )}
      {!state.valid && (
        <p role="alert" className="text-sm text-[var(--expense)]">Informe um período válido (início antes do fim).</p>
      )}
    </div>
  );
}
