import { redirect } from 'next/navigation';

import { HomeClient } from '@/app/components/pages/home';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export const metadata = {
  title: 'Controle de Gastos | Finanças pessoais com clareza',
  description: 'Organize contas, categorias, receitas, despesas, recorrências e calendário financeiro em um único lugar.',
};

export default async function Page() {
  let userId: string;

  try {
    userId = await getAuthenticatedUserId();
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return <HomeClient />;
    }

    throw error;
  }

  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userExists) {
    return <HomeClient />;
  }

  redirect('/dashboard');
}
