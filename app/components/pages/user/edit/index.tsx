'use client';

import { EditPage } from '@/app/components/base-pages';
import { UserForm } from '@/app/components/pages/user';
import { useUser } from '@/app/hooks/users/user-edit';

export default function Edit({ id }: { id: string }) {
  const { user, loading, error, handleBack } = useUser({ id });

  return (
    <EditPage
      title="Editar perfil"
      description="Atualize seus dados pessoais e sua senha. Alterações de senha exigem a senha atual."
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      {user && <UserForm user={user} />}
    </EditPage>
  );
}
