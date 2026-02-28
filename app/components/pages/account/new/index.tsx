"use client";

// importing components
import { NewPage } from "@/app/components/base-pages";
import { AccountForm } from "@/app/components/pages/account";

export default function New() {
  return (
    <NewPage backUrl="/contas">
      <AccountForm isEditing={false} />
    </NewPage>
  );
};
