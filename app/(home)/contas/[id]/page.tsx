"use client";

// hook
import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";

// services
import { accountService } from "@/app/services/accountService";

// components
import { Breadcrumb, ProtectedRoute, AccountForm } from "@/app/components";

// types
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