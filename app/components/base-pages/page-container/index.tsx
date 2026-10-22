import type { ReactNode } from 'react';

// Todas as páginas autenticadas usam a largura do shell (`.orbit-page-container`, em `orbit.css`);
// o padding da página é que controla o respiro. Não há variante estreita.
export default function PageContainer({
  as: Tag = 'div',
  children,
}: {
  as?: 'div' | 'section' | 'main';
  children: ReactNode;
}) {
  return <Tag className="w-full">{children}</Tag>;
}
