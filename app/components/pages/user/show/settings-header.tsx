'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FaEdit, FaShieldAlt } from 'react-icons/fa';

import { accountStatus, formatDate, securityTip, userInitial, type SettingsSection } from '@/app/components/pages/user/show/settings-model';
import { Button } from '@/app/components/ui';
import { CARD_EASE, reducedTransition } from '@/app/components/ui/motion';
import type { User } from '@/app/types/user';

const dotTone = {
  ok: 'bg-[var(--income)]',
  attention: 'bg-[var(--warning)]',
  neutral: 'bg-[var(--border-strong)]',
} as const;

/** Anel em volta da inicial: o traço se desenha uma vez, dando a volta no avatar. */
function AvatarRing({ reduce }: { reduce: boolean | null }) {
  return (
    <svg viewBox="0 0 72 72" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
      <circle cx="36" cy="36" r="33" fill="none" stroke="var(--border)" strokeWidth="2" />
      <motion.circle
        cx="36"
        cy="36"
        r="33"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
      />
    </svg>
  );
}

/**
 * Topo da central: um cartão só com o perfil, a situação da conta em pílulas (cada uma leva à seção que a ajusta) e, quando a
 * verificação em duas etapas está desativada, uma faixa de aviso. Substitui os três cartões e o aviso soltos de antes.
 */
export function SettingsHeader({ user, onGo }: { user: User; onGo: (section: SettingsSection) => void }) {
  const reduce = useReducedMotion();
  const tip = securityTip(user);

  return (
    <motion.section
      aria-label="Seu perfil"
      initial={reduce ? false : { opacity: 0, y: -24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reducedTransition(reduce, { type: 'spring', stiffness: 170, damping: 18, delay: 0.05 })}
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-5">
        <motion.span
          className="relative grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full"
          initial={reduce ? false : { scale: 0.4, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.5 } }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
          aria-hidden="true"
        >
          <AvatarRing reduce={reduce} />
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--primary-subtle)] text-2xl font-bold text-[var(--primary)]">
            {userInitial(user.name)}
          </span>
        </motion.span>

        <div className="min-w-0">
          <motion.h2
            className="truncate text-xl font-bold tracking-tight"
            initial={reduce ? false : { opacity: 0, x: -16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: CARD_EASE, delay: 0.3 }}
          >
            {user.name}
          </motion.h2>
          <motion.p
            className="truncate text-sm text-[var(--text-muted)]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {user.email}
          </motion.p>
          <motion.p
            className="text-xs text-[var(--text-subtle)]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Conta criada em {formatDate(user.createdAt)}
          </motion.p>
        </div>

        <motion.div
          className="col-span-full sm:col-span-1"
          initial={reduce ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
        >
          <Button as="a" href="/usuario/editar" variant="outline" icon={<FaEdit aria-hidden="true" />} fullWidth>
            Editar perfil
          </Button>
        </motion.div>
      </div>

      <ul className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-5" aria-label="Situação da conta">
        {accountStatus(user).map((item, index) => (
          <motion.li
            key={item.key}
            initial={reduce ? false : { opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 16, delay: 0.6 + index * 0.1 }}
          >
            <motion.button
              type="button"
              onClick={() => onGo(item.section)}
              aria-label={`${item.label}: ${item.value}. Ajustar`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:text-sm"
            >
              {/* O ponto de quem pede ação pulsa; os demais só aparecem. */}
              <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                <span className={`h-2.5 w-2.5 rounded-full ${dotTone[item.tone]}`} />
                {item.tone === 'attention' && !reduce && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-[var(--warning)]"
                    animate={{ scale: [1, 2.6], opacity: [0.6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </span>
              <span className="text-[var(--text-muted)]">{item.label}</span>
              <strong className="font-semibold text-[var(--foreground)]">{item.value}</strong>
            </motion.button>
          </motion.li>
        ))}
      </ul>

      {tip && (
        <motion.div
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--warning)]/30 bg-[var(--warning-subtle)] px-4 py-3 text-sm sm:px-5"
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.4, ease: CARD_EASE, delay: 0.9 }}
        >
          <p className="flex min-w-0 flex-1 items-start gap-2.5">
            <motion.span
              className="mt-0.5 flex shrink-0 text-[var(--warning)]"
              animate={reduce ? undefined : { rotate: [0, -12, 10, -6, 0] }}
              transition={{ duration: 0.8, delay: 1.4, repeat: Infinity, repeatDelay: 4 }}
              aria-hidden="true"
            >
              <FaShieldAlt />
            </motion.span>
            <span><strong>Proteja sua conta.</strong> Ative a verificação em duas etapas para exigir um código além da senha.</span>
          </p>
          <motion.span className="inline-flex" whileTap={{ scale: 0.95 }}>
            <Button size="sm" onClick={() => onGo(tip.section)}>Ativar agora</Button>
          </motion.span>
        </motion.div>
      )}
    </motion.section>
  );
}
