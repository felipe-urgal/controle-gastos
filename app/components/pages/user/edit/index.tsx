'use client';

import { EditPage } from '@/app/components/base-pages';
import { UserForm } from '@/app/components/pages/user';
import { useUser } from '@/app/hooks/users/user-edit';

export default function Edit() {
  const { user, loading, error, notFound, retry, handleBack } = useUser();

  return (
    <EditPage
      title="Editar perfil"
      sidebarAligned
      breadcrumb={[{ label: 'Configurações', href: handleBack }, { label: 'Editar perfil' }]}
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
