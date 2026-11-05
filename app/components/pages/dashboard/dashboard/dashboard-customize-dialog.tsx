'use client';

import { FaArrowDown, FaArrowUp } from 'react-icons/fa';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import {
  DASHBOARD_SECTIONS,
  DEFAULT_DASHBOARD_LAYOUT,
  moveDashboardSection,
  toggleDashboardSection,
  type DashboardLayout,
} from '@/app/components/pages/dashboard/dashboard/dashboard-layout';
import { Button, Chip, IconButton } from '@/app/components/ui';

const LABELS = Object.fromEntries(DASHBOARD_SECTIONS.map((section) => [section.key, section.label]));

/** Escolhe quais seções do Dashboard aparecem e em que ordem. O topo (saldo disponível e atenção) é fixo. */
export default function DashboardCustomizeDialog({
  layout,
  onChange,
  onClose,
}: {
  layout: DashboardLayout;
  onChange: (layout: DashboardLayout) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      title="Personalizar painel"
      description="Mostre, oculte e reordene as seções. O saldo disponível e os avisos ficam sempre no topo. A escolha vale neste aparelho."
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onChange({ ...DEFAULT_DASHBOARD_LAYOUT, order: [...DEFAULT_DASHBOARD_LAYOUT.order] })}>
            Restaurar padrão
          </Button>
          <Button type="button" onClick={onClose}>Concluir</Button>
        </>
      }
    >
      <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
        {layout.order.map((key, index) => {
          const hidden = layout.hidden.includes(key);
          return (
            <li key={key} className="flex items-center gap-2 p-3">
              <span className={`min-w-0 flex-1 text-sm font-semibold ${hidden ? 'text-[var(--text-muted)] line-through' : ''}`}>{LABELS[key]}</span>
              <Chip selected={!hidden} onClick={() => onChange(toggleDashboardSection(layout, key))} aria-label={`${hidden ? 'Mostrar' : 'Ocultar'} ${LABELS[key]}`}>
                {hidden ? 'Oculta' : 'Visível'}
              </Chip>
              <IconButton label={`Subir ${LABELS[key]}`} icon={<FaArrowUp />} onClick={() => onChange(moveDashboardSection(layout, key, -1))} disabled={index === 0} />
              <IconButton label={`Descer ${LABELS[key]}`} icon={<FaArrowDown />} onClick={() => onChange(moveDashboardSection(layout, key, 1))} disabled={index === layout.order.length - 1} />
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}
