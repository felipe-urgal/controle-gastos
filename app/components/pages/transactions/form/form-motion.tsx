'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createContext, useContext, type ReactNode } from 'react';

import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';

/**
 * Os formulários de transação e de transferência são telas irmãs: alternar entre elas remonta o formulário. A
 * entrada (cartão que sobe, linhas em cascata) só toca na abertura da página; ao alternar o tipo, fica de fora,
 * e só o destaque do tipo desliza, para a troca parecer o mesmo formulário.
 */
const FormIntroContext = createContext(true);
export const FormIntroProvider = FormIntroContext.Provider;
export function useFormIntro() {
  return useContext(FormIntroContext);
}

const PILL_SPRING = { type: 'spring', stiffness: 500, damping: 38 } as const;

export type FormKind = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export const TYPE_TONE: Record<FormKind, string> = { EXPENSE: 'var(--expense)', INCOME: 'var(--income)', TRANSFER: 'var(--primary)' };

/** Cor do texto e do trilho de cada tipo (classes completas, para o Tailwind enxergá-las). */
const KIND_TEXT: Record<FormKind, string> = { EXPENSE: 'text-[var(--expense)]', INCOME: 'text-[var(--income)]', TRANSFER: 'text-[var(--primary)]' };
const KIND_BG: Record<FormKind, string> = { EXPENSE: 'bg-[var(--expense)]', INCOME: 'bg-[var(--income)]', TRANSFER: 'bg-[var(--primary)]' };
/**
 * Destaque do segmento ativo: um só elemento que desliza entre as opções e troca de cor com o tipo.
 * Tem o mesmo formato dos botões (`rounded-full`); o raio e a borda ficam no `style` (a borda é uma sombra
 * interna) para o Framer corrigi-los durante o deslize, em vez de esticá-los.
 */
export function SegmentPill({ layoutId, tone }: { layoutId: string; tone: string }) {
  return (
    <motion.span
      aria-hidden="true"
      layoutId={layoutId}
      transition={PILL_SPRING}
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        borderRadius: 9999,
        backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px ${tone}`,
      }}
    />
  );
}

/** Valor digitado, mostrado dígito a dígito: o que muda sobe de baixo para o lugar. O input real fica por baixo, com o texto transparente. */
export function AmountRoll({ text, type, size = 'form', align = 'center' }: { text: string; type: FormKind; /** `transfer`: o campo de valor maior da tela de transferência; `mobile`: o do passo a passo. */ size?: 'form' | 'transfer' | 'mobile'; align?: 'center' | 'start' }) {
  const reduce = useReducedMotion();
  const chars = [...text];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center ${align === 'start' ? 'justify-start' : 'justify-center'} font-black tracking-tight transition-colors duration-300 ${size === 'transfer' ? 'text-5xl sm:text-6xl' : size === 'mobile' ? 'text-4xl min-[360px]:text-5xl' : 'amount-display'} ${KIND_TEXT[type]}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {chars.map((char, index) => (
          <motion.span
            key={`${index}-${char}`}
            className="inline-block whitespace-pre"
            initial={reduce ? false : { y: '55%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-55%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
          >
            {char}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Trilho de preenchimento: enche conforme os campos obrigatórios são preenchidos e acompanha a cor do tipo. */
export function FillRail({ progress, type }: { progress: number; type: FormKind }) {
  const reduce = useReducedMotion();
  const intro = useFormIntro();
  const percent = Math.round(progress * 100);

  return (
    <div
      role="progressbar"
      aria-label="Preenchimento do formulário"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]"
    >
      <motion.div
        className={`relative h-full overflow-hidden rounded-full transition-colors duration-300 ${KIND_BG[type]}`}
        initial={intro ? { width: 0 } : false}
        animate={{ width: `${percent}%` }}
        transition={reducedTransition(reduce, { type: 'spring', stiffness: 160, damping: 22 })}
      >
        {percent === 100 && !reduce && (
          <motion.span
            key="done"
            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '400%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        )}
      </motion.div>
    </div>
  );
}

/** Valor escolhido num campo: ao mudar, entra com um pequeno "pop". */
export function Pop({ valueKey, className = '', children }: { valueKey: string; className?: string; children: ReactNode }) {
  return (
    // Ao passar o mouse na linha, o valor escolhido sobe 2px (o "pop" de quando muda fica no filho).
    <motion.span className="min-w-0 text-right" variants={{ hover: { y: -2 } }}>
      <motion.span
        key={valueKey}
        className={`block truncate font-medium text-[var(--foreground)] ${className}`}
        initial={{ opacity: 0, scale: 0.9, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 22 }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

export const rowStack = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } },
};
export const rowItem = {
  hidden: { opacity: 0, x: -16 },
  shown: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 30 } },
};
const rowLine = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.5, ease: CARD_EASE, delay: 0.1 } },
};

/** Linha de campo: entra pela esquerda e o divisor de cima se desenha. */
export function RowItem({ first = false, children }: { first?: boolean; children: ReactNode }) {
  return (
    <motion.div className="relative" variants={rowItem} whileHover="hover">
      {!first && <motion.span aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left bg-[var(--border)]" variants={rowLine} />}
      {children}
    </motion.div>
  );
}


/** Ícone de uma linha de campo: acende e dá um pulso quando o campo é preenchido. */
export function FilledIcon({ filled, children }: { filled: boolean; children: ReactNode }) {
  return (
    <motion.span
      key={String(filled)}
      className={`grid h-7 w-7 place-items-center transition-colors ${filled ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
      animate={filled ? { scale: [1, 1.4, 1] } : undefined}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    >
      {/* Ao passar o mouse na linha, o ícone gira de leve. */}
      <motion.span className="flex" variants={{ hover: { rotate: [0, -18, 14, 0], transition: { duration: 0.5 } } }}>
        {children}
      </motion.span>
    </motion.span>
  );
}
