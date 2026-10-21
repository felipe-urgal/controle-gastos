import type { ReactNode } from 'react';

// `default` não impõe largura própria: vale o limite do shell (`--orbit-page-max-width`, em `orbit.css`),
// o mesmo de todas as páginas autenticadas. `narrow` é só para formulários e telas de leitura.
const WIDTH_CLASS = {
  narrow: 'max-w-3xl',
  default: 'max-w-none',
} as const;

export type PageContainerWidth = keyof typeof WIDTH_CLASS;

export default function PageContainer({
  width = 'default',
  as: Tag = 'div',
  children,
}: {
  width?: PageContainerWidth;
  as?: 'div' | 'section' | 'main';
  children: ReactNode;
}) {
  return (
    // O padding da página vem do `ProtectedRoute` (`.orbit-page-container`); aqui só limitamos a largura.
    <Tag className={`mx-auto w-full ${WIDTH_CLASS[width]}`}>
      {children}
    </Tag>
  );
}
