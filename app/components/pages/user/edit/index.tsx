'use client';

// importing hooks
import { useUser } from "@/app/hooks/users/user-edit";

// importing components
import { EditPage } from '@/app/components/base-pages';
import { UserForm } from '@/app/components/pages/user';

export default function Edit({ id }: { id: string }) {
  const { user, loading, error, handleBack } = useUser({ id });

  return (
    <EditPage
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      {user && <UserForm user={user} />}
    </EditPage>
  );
};
