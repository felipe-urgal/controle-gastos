'use client';


export function PlanningMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[10px] bg-[var(--surface-raised)] p-3">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <strong className={`money mt-1 block text-sm ${danger ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
        {value}
      </strong>
    </div>
  );
}
