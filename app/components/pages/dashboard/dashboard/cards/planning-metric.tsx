'use client';


import { motion } from 'framer-motion';

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
    <motion.div className="relative isolate overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3" whileHover="hover" whileTap={{ scale: 0.97 }}>
      {/* O fundo sobe de baixo, como um líquido enchendo o tile. */}
      <motion.span
        aria-hidden="true"
        className={`absolute inset-0 -z-10 origin-bottom ${danger ? 'bg-[var(--danger-subtle)]' : 'bg-[var(--primary-subtle)]'}`}
        style={{ scaleY: 0 }}
        variants={{ hover: { scaleY: 1 } }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <strong className={`money mt-1 block text-sm ${danger ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
        {value}
      </strong>
    </motion.div>
  );
}
