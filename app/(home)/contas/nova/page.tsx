"use client";

// components
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import AccountForm from "@/app/components/accounts/AccountForm";

const NewAccount = () => {
  return (
    <ProtectedRoute>
      <Breadcrumb />
      <AccountForm />
    </ProtectedRoute>
  );
};

export default NewAccount;