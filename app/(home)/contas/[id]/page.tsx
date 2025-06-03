"use client";

// Hooks
import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";

// Toast
import 'react-toastify/dist/ReactToastify.css';
import { toast } from "react-toastify";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import AccountForm from "@/app/components/accounts/AccountForm";

// Types
import { AccountModel } from '@/app/types/account'

// Services
import { accountService } from "@/app/services/accountService";

const UpdateAccount = () => {
  const { user }  = useAuth();
  const params    = useParams();
  const accountId = params.id as string;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [account, setAccount]     = useState<AccountModel | null>(null);

  useEffect(() => {
    if (user?.id) {
      const fetchAccount = async () => {
        setIsLoading(true);
        try {
          const response = await accountService.getAccountById(accountId)
          setAccount(response);
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAccount();
    }
  }, [user, accountId]);

  if (!isLoading && !account) {
    notFound();
  }

  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />

        {isLoading ? (
          <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {account && (
              <AccountForm account={account} isEdit={true}/>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default UpdateAccount;