import type { Metadata } from 'next';

import NotificationsPage from '@/app/components/pages/notification/notifications-page';

export const metadata: Metadata = {
  title: 'Avisos | Controle de Gastos',
  description: 'Vencimentos, orçamento e saldo previsto que pedem a sua atenção.',
};

export default function Page() {
  return <NotificationsPage />;
}
