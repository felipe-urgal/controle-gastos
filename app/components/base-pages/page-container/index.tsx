import type { ReactNode } from 'react';

const WIDTH_CLASS = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-[1480px]',
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
