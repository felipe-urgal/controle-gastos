'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaCalendarAlt, FaListOl } from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { typeConfig } from '@/app/lib/constants/category.constants';
import { CategoryInfoProps } from '@/app/lib/interface/category.interface';

export default function CategoryInfo({ category, isDeleting }: CategoryInfoProps) {
  const type = typeConfig[category.type];

  return (
    <div
      className={`space-y-4 transition-opacity duration-150 ${
        isDeleting ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <section className="ds-panel p-5 sm:p-6" aria-labelledby="category-detail-heading">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
              style={{ backgroundColor: category.color || '#64748B' }}
              aria-hidden="true"
            >
              <IconRenderer iconName={category.icon || 'tag'} size={20} />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${type.bgColor} ${type.color} ${type.borderColor}`}
                >
                  {type.label}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${
                    category.isActive
                      ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)] text-[var(--income)]'
                      : 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  {category.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <h2
                id="category-detail-heading"
                className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]"
              >
                {category.name}
              </h2>

              <p className="mt-2 max-w-2xl text-base leading-relaxed text-[var(--text-muted)]">
                {category.description || 'Sem descrição cadastrada.'}
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:min-w-[220px]">
            <p className="text-sm font-medium text-[var(--text-muted)]">Regra financeira</p>
            <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
              {category.type === 'INCOME' ? 'Uso como receita' : 'Uso como despesa'}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-subtle)]">
              Ao selecionar esta categoria na criação ou edição de uma transação, este tipo é usado como referência. Cor e ícone não alteram a regra.
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 md:grid-cols-3">
          <InfoItem icon={<FaCalendarAlt />} label="Criada em">
            {format(new Date(category.createdAt), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </InfoItem>
          <InfoItem icon={<FaCalendarAlt />} label="Última atualização">
            {format(new Date(category.updatedAt), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </InfoItem>
          <InfoItem icon={<FaListOl />} label="Ordem">
            {category.position > 0 ? category.position : 'Padrão'}
          </InfoItem>
        </dl>
      </section>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <dt className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
        <span className="text-[var(--text-subtle)]" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-2 text-base font-semibold text-[var(--foreground)]">{children}</dd>
    </div>
  );
}
