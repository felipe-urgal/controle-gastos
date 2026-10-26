'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type Transition } from 'framer-motion';
import { useEffect } from 'react';

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
