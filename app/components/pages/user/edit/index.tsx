'use client';

import { EditPage } from '@/app/components/base-pages';
import { UserForm } from '@/app/components/pages/user';
import { useUser } from '@/app/hooks/users/user-edit';

export default function Edit() {
  const { user, loading, error, notFound, retry, handleBack } = useUser();

  return (
    <EditPage
      title="Editar perfil"
      description="Atualize seus dados pessoais, solicite a troca de e-mail ou altere sua senha. Mudanças sensíveis exigem a senha atual."
      loading={loading}
      error={notFound ? 'O perfil solicitado não foi encontrado.' : error}
      errorTitle={notFound ? 'Perfil não encontrado' : undefined}
      onRetry={error && !notFound ? retry : undefined}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      {user && <UserForm user={user} />}
    </EditPage>
  );
}
