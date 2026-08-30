'use client';

import { NewPage } from '@/app/components/base-pages';
import { AccountForm } from '@/app/components/pages/account';

export default function New() {
  return (
    <NewPage
      backUrl="/contas"
      title="Nova conta"
      description="Cadastre uma conta para organizar movimentações. O saldo será sempre derivado das transações concluídas."
    >
      <AccountForm isEditing={false} />
    </NewPage>
  );
}
