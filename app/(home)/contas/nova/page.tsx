"use client";

import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import AccountForm from "@/app/components/accounts/AccountForm";

const NewAccount = () => {
  return (
    <ProtectedRoute>
      <div className="max-w-7xl">
        <Breadcrumb />
        <AccountForm />
      </div>
    </ProtectedRoute>
  );
};

export default NewAccount;