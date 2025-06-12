"use client";

import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";
import { accountService } from "@/app/services/accountService";
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import AccountForm from "@/app/components/accounts/AccountForm";
import { AccountModel } from '@/app/types/account';

const UpdateAccount = () => {
  const params = useParams();
  const accountId = params.id as string;

  const { isLoading, data: account } = useEditData<AccountModel>({
    fetchFunction: accountService.getAccountById,
    id: accountId
  });

  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />

        {isLoading ? (
          <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <AccountForm account={account!} isEdit={true}/>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default UpdateAccount;