"use client";

import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import AccountForm from "@/app/components/accounts/AccountForm";

const NewAccount = () => {
  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />
        <AccountForm />
      </div>
    </ProtectedRoute>
  );
};

export default NewAccount;