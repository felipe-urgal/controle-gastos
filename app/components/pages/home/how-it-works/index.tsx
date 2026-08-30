import { FaCalendarAlt, FaLayerGroup, FaReceipt } from 'react-icons/fa';

const steps = [
  {
    number: '01',
    title: 'Organize a base',
    description: 'Cadastre suas contas e categorias para separar onde o dinheiro está e como cada movimentação deve ser classificada.',
    icon: FaLayerGroup,
  },
  {
    number: '02',
    title: 'Registre movimentações',
    description: 'Adicione receitas e despesas, use recorrências mensais quando fizer sentido e acompanhe o status de cada transação.',
    icon: FaReceipt,
  },
  {
    number: '03',
    title: 'Acompanhe no tempo',
    description: 'Consulte as transações por mês e pelo calendário para entender o que já aconteceu e o que ainda está pendente.',
    icon: FaCalendarAlt,
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-[var(--surface)]" aria-labelledby="how-it-works-title">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Fluxo simples</p>
            <h2
              id="how-it-works-title"
              className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl"
            >
              O essencial para manter suas finanças organizadas.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--text-muted)]">
              O produto foi pensado para reduzir atrito: organizar a estrutura, registrar movimentações e consultar o histórico sem depender de planilhas paralelas.
            </p>
          </div>

          <ol className="grid gap-3">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <li
                  key={step.number}
                  className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] p-5 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-start sm:gap-5 sm:p-6"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                    <Icon aria-hidden="true" />
                  </span>

                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">{step.title}</h3>
                    <p className="mt-2 text-base leading-relaxed text-[var(--text-muted)]">{step.description}</p>
                  </div>

                  <span className="text-sm font-bold tracking-[0.12em] text-[var(--text-subtle)]">{step.number}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
