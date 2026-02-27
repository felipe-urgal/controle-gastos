"use client";

// importing components
import { NewPage } from "@/app/components/pages";
import { AccountForm } from "@/app/components/account";

export default function New() {
  return (
    <NewPage backUrl="/contas">
      <AccountForm isEditing={false} />
    </NewPage>
  );
};
