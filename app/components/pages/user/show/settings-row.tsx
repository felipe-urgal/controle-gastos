import type { ReactNode } from 'react';

/** Painel de uma seção: título, descrição opcional e linhas de configuração. */
export function SettingsPanel({
  id,
  title,
  description,
  action,
  children,
  busy,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <section
      className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]"
      aria-labelledby={id}
      aria-busy={busy || undefined}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Linha de configuração: ícone, título e descrição à esquerda; controle à direita (embaixo no celular). */
export function SettingsRow({
  icon,
  title,
  description,
  control,
  inlineControl = false,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  control?: ReactNode;
  /** Controle pequeno (interruptor) que fica ao lado do texto também no celular. */
  inlineControl?: boolean;
}) {
  return (
    <div className={`grid items-center gap-x-4 gap-y-3 border-t border-[var(--border)] px-4 py-4 first:border-t-0 sm:px-5 ${inlineControl ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto]'}`}>
      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-muted)]" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {description && <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>}
      </div>
      {control && <div className={inlineControl ? '' : 'col-span-full justify-self-start sm:col-span-1 sm:justify-self-end'}>{control}</div>}
    </div>
  );
}
