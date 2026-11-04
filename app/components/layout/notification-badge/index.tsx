import { badgeLabel } from '@/app/components/pages/notification/notification-model';

/**
 * Bolinha de não lidos para sobrepor a um ícone (o pai precisa ser `relative`). Sem avisos
 * não renderiza nada; `dot` mostra só o ponto, para botões pequenos como o "Mais".
 */
export default function NotificationBadge({ count, dot = false }: { count: number; dot?: boolean }) {
  if (count <= 0) return null;

  if (dot) {
    return (
      <span
        aria-hidden="true"
        className="absolute right-1/2 top-1.5 h-2.5 w-2.5 translate-x-4 rounded-full border-2 border-[var(--surface)] bg-[var(--expense)]"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--expense)] px-1 text-xs font-bold leading-none text-white"
    >
      {badgeLabel(count)}
    </span>
  );
}
