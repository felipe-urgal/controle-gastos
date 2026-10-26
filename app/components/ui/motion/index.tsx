'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type Transition } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';

/** Entrada dos cards: toca uma vez, quando o card aparece na tela. */
export const CARD_VIEWPORT = { once: true, amount: 0.3 } as const;

/** Curva de desaceleração usada nas animações dos cards. */
export const CARD_EASE = [0.22, 1, 0.36, 1] as const;

/** Com "reduzir movimento" a animação vira instantânea: o card pula direto para o estado final. */
export function reducedTransition(reduce: boolean | null, transition: Transition): Transition {
  return reduce ? { duration: 0 } : transition;
}

/** Valor que sobe de 0 até o alvo e acompanha mudanças (troca de mês ou moeda) a partir do que está na tela. */
export function CountUp({
  amount,
  format,
  className,
}: {
  amount: number;
  format: (amount: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const value = useMotionValue(reduce ? amount : 0);
  const text = useTransform(value, (current) => format(Math.round(current)));

  useEffect(() => {
    if (reduce) {
      value.set(amount);
      return;
    }
    const controls = animate(value, amount, { duration: 0.9, ease: CARD_EASE });
    return () => controls.stop();
  }, [amount, reduce, value]);

  return <motion.span className={className}>{text}</motion.span>;
}

/**
 * Botão de ação do cabeçalho: cai de cima com um pequeno balanço (rotateX), na ordem de `order`. Com `pulse`, um
 * anel vermelho se expande uma vez ao chegar (usado no "Excluir").
 */
export function DropIn({ order = 0, pulse = false, children }: { order?: number; pulse?: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  const delay = 0.15 + order * 0.08;

  return (
    <motion.span
      className="relative inline-flex"
      style={{ transformPerspective: 500 }}
      initial={{ y: -26, opacity: 0, rotateX: -60 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={reducedTransition(reduce, { type: 'spring', stiffness: 320, damping: 17, delay })}
    >
      {pulse && !reduce && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-[var(--danger)]"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 1.5, opacity: [0, 0.7, 0] }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: delay + 0.35 }}
        />
      )}
      {children}
    </motion.span>
  );
}

/** Uma coluna de 0 a 9 que gira até `digit`; o dígito final, invisível, dá a largura da célula. */
function OdometerDigit({ digit, order }: { digit: number; order: number }) {
  return (
    <span aria-hidden="true" className="relative inline-block overflow-hidden" style={{ height: '1em', lineHeight: 1 }}>
      <span className="invisible block leading-none">{digit}</span>
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={{ y: 0 }}
        animate={{ y: `${-digit * 10}%` }}
        transition={{ type: 'spring', stiffness: 55, damping: 15, delay: 0.3 + order * 0.09 }}
      >
        {Array.from({ length: 10 }, (_, value) => (
          <span key={value} className="block text-center leading-none" style={{ height: '1em' }}>
            {value}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Texto numérico estilo odômetro: cada dígito gira até o seu valor, da direita para a esquerda; o resto fica fixo. */
export function Odometer({ text }: { text: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{text}</>;

  const chars = [...text];
  const digitPositions = chars.flatMap((char, index) => (/\d/.test(char) ? [index] : []));

  return (
    <span role="img" aria-label={text} className="inline-flex items-baseline">
      {chars.map((char, index) =>
        /\d/.test(char) ? (
          <OdometerDigit key={index} digit={Number(char)} order={digitPositions.length - 1 - digitPositions.indexOf(index)} />
        ) : (
          <span key={index} aria-hidden="true" className="whitespace-pre">
            {char}
          </span>
        ),
      )}
    </span>
  );
}
