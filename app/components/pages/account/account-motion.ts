import { reducedTransition } from '@/app/components/ui/motion';

/** Cartões de resumo de Contas: abrem como uma página virando (rotateX), um depois do outro. */
export const flipIn = (order: number, reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0, rotateX: -16, y: 18 },
  animate: { opacity: 1, rotateX: 0, y: 0 },
  transition: reducedTransition(reduce, { type: 'spring', stiffness: 170, damping: 20, delay: 0.1 + order * 0.12 }),
  style: { transformPerspective: 900, transformOrigin: 'top center' },
});

/** Blocos abaixo do resumo: sobem e aparecem quando entram na tela (vale na rolagem do celular). */
export const riseInView = (reduce: boolean | null, delay = 0) => ({
  initial: reduce ? false : { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: reducedTransition(reduce, { type: 'spring', stiffness: 150, damping: 20, delay }),
});

/** Valor principal: entra desfocado e cresce até ficar nítido. */
export const blurIn = (reduce: boolean | null, delay = 0.3) => ({
  initial: reduce ? false : { opacity: 0, scale: 0.88, filter: 'blur(10px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  transition: reducedTransition(reduce, { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const, delay }),
  style: { transformOrigin: 'left center' },
});
