'use client';

import { motion } from 'framer-motion';
import { FaChevronDown } from 'react-icons/fa';

import ListboxSelect from '@/app/components/ui/listbox-select';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import type { SupportedCurrency } from '@/app/types/financial-summary';

/**
 * Seletor de moeda padrão (lista própria, segue o tema). Sem `options`, oferece todas as moedas
 * suportadas; passe `options` para limitar às moedas disponíveis na tela.
 */
export default function CurrencySelect({
  value,
  onChange,
  options,
  disabled = false,
  ariaLabel = 'Moeda',
  className = 'w-[116px] sm:w-[145px]',
}: {
  value: SupportedCurrency;
  onChange: (value: SupportedCurrency) => void;
  options?: SupportedCurrency[];
  disabled?: boolean;
  ariaLabel?: string;
  /** Largura do seletor (ele ocupa 100% do contêiner). */
  className?: string;
}) {
  const labelOf = (code: string) => currencyOptions.find((option) => option.value === code)?.label ?? code;
  const items = (options ?? currencyOptions.map((option) => option.value as SupportedCurrency)).map((code) => ({
    value: code,
    label: labelOf(code),
  }));

  return (
    <motion.div className={`shrink-0 ${className}`} whileHover="hover">
      <ListboxSelect
        ariaLabel={ariaLabel}
        value={value}
        options={items}
        onChange={(next) => onChange(next as SupportedCurrency)}
        disabled={disabled}
        triggerClassName="flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
        menuClassName="min-w-[9rem]"
      >
        {/* Ao passar o mouse, o símbolo faz um flip vertical e o chevron gira. */}
        <motion.span
          className="truncate"
          style={{ transformPerspective: 400 }}
          variants={{ hover: { rotateX: [0, 360], transition: { duration: 0.6, ease: 'easeInOut' } } }}
        >
          {labelOf(value)}
        </motion.span>
        <motion.span className="flex shrink-0" variants={{ hover: { rotate: 180 } }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
          <FaChevronDown className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
        </motion.span>
      </ListboxSelect>
    </motion.div>
  );
}
