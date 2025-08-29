"use client";

// hook
import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";

// services
import { accountService } from "@/app/services/accountService";

// components
import { Breadcrumb, ProtectedRoute, AccountForm, Loading } from "@/app/components";

// types
import { AccountModel } from '@/app/types/account';

// icons
import { FaInfoCircle } from 'react-icons/fa';

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
        <div className="">
          <Breadcrumb />
          
          <div className="">
            <div className="">
              {isLoading ? (
                <Loading />
              ) : (
                <AccountForm account={account!} isEdit={true}/>
              )}
            </div>
          </div>
          
          {!isLoading && account && (
            <div className="mt-6 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FaInfoCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-400/80 mt-1">
                    Todas as alterações serão refletidas imediatamente após a confirmação.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default UpdateAccount;