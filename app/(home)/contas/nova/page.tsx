"use client";

// components
import { Breadcrumb, ProtectedRoute, AccountForm } from "@/app/components";

const NewAccount = () => {
  return (
    <ProtectedRoute>
      <Breadcrumb />
      <AccountForm />
    </ProtectedRoute>
  );
};

export default NewAccount;