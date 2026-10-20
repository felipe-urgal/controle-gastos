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
    <Tag className={`mx-auto w-full ${WIDTH_CLASS[width]} px-4 py-5 sm:px-6 lg:px-8`}>
      {children}
    </Tag>
  );
}
