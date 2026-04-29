"use client";

import { useEditProfile } from "@/app/hooks/users/use-edit-profile";
import { EditPage } from "@/app/components/base-pages";
import { UserForm } from "@/app/components/pages/user";

export default function Edit({ id }: { id: string }) {
  const { user, loading, error, handleBack } = useEditProfile({ id });

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
