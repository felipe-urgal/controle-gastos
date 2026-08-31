import { redirect } from 'next/navigation';

import { HomeClient } from '@/app/components/pages/home';
import { getAuthenticatedUserId } from '@/app/lib/auth';

export const metadata = {
  title: 'Controle de Gastos | Finanças pessoais com clareza',
  description: 'Organize contas, categorias, receitas, despesas, recorrências e calendário financeiro em um único lugar.',
};

export default async function Page() {
  try {
    await getAuthenticatedUserId();
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return <HomeClient />;
    }

    throw error;
  }

  redirect('/dashboard');
}
