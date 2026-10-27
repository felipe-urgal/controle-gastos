'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { IconType } from 'react-icons';
import { FaDatabase, FaExclamationTriangle, FaPlug, FaShieldAlt, FaSlidersH, FaUser } from 'react-icons/fa';

import { settingsSections, type SettingsSection } from '@/app/components/pages/user/show/settings-model';

const ICONS: Record<SettingsSection, IconType> = {
  profile: FaUser,
  preferences: FaSlidersH,
  security: FaShieldAlt,
  integrations: FaPlug,
  data: FaDatabase,
  risk: FaExclamationTriangle,
};

const PILL_SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;

/**
 * Navegação das seções: abas em linha, as mesmas no celular e no desktop, fixas sob a barra do topo. Um destaque desliza entre
 * as abas e, quando faltar largura, a lista rola na horizontal e a aba ativa vai para o centro ao ser escolhida.
 */
export function SettingsNav({ active, onChange }: { active: SettingsSection; onChange: (section: SettingsSection) => void }) {
  const reduce = useReducedMotion();
  const activeTab = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeTab.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [active, reduce]);

  return (
    <>
        <nav
          aria-label="Áreas de configuração"
          className="sticky top-[calc(var(--app-mobile-topbar-height)+env(safe-area-inset-top))] z-[var(--z-header)] lg:top-[var(--app-sidebar-header-height)] -mx-[var(--orbit-page-padding-inline)] border-b border-[var(--border)] bg-[var(--orbit-navigation-surface)] px-[var(--orbit-page-padding-inline)] py-2"
        >
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {settingsSections.map((section, index) => {
              const Icon = ICONS[section.id];
              const selected = active === section.id;
              return (
                <motion.button
                  key={section.id}
                  ref={selected ? activeTab : undefined}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => onChange(section.id)}
                  whileTap={{ scale: 0.92 }}
                  initial={reduce ? false : { opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 + index * 0.05 }}
                  className={`relative flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                    section.danger ? 'text-[var(--expense)]' : selected ? 'text-[var(--foreground)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {selected && (
                    <motion.span
                      aria-hidden="true"
                      layoutId="settings-nav-pill-mobile"
                      transition={PILL_SPRING}
                      className={`pointer-events-none absolute inset-0 -z-10 rounded-full border ${section.danger ? 'border-[var(--danger)]/40 bg-[var(--danger-subtle)]' : 'border-[var(--primary)]/40 bg-[var(--primary-subtle)]'}`}
                    />
                  )}
                  <Icon className={`h-3.5 w-3.5 ${selected && !section.danger ? 'text-[var(--primary)]' : ''}`} aria-hidden="true" />
                  {section.label}
                </motion.button>
              );
            })}
          </div>
        </nav>
    </>
  );
}
