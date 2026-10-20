import type { ReactNode } from 'react';

/** Descrição de um campo de filtro (usada pelas constantes e pelo diálogo de filtros de Transações). */
export type FilterField =
  | {
      type: 'search';
      key: string;
      placeholder?: string;
    }
  | {
      type: 'select';
      key: string;
      label: string;
      options:
        | { label: string; value: string | number }[]
        | {
            label: string;
            options: { label: string; value: string | number }[];
          }[];
    }
  | {
      type: 'custom';
      key: string;
      render: (value: any, onChange: (value: any) => void) => ReactNode;
    };
