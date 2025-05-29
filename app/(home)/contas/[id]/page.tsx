"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import AccountForm from "@/app/components/accounts/AccountForm";

type AccountFormData = {
  id?: string;
  balance: number;
  name: string;
  currency: string;
  type: string;
};

const UpdateAccount = () => {
  const { user } = useAuth();
  const params = useParams();

  const accountId = params.id as string;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [account, setAccount] = useState<AccountFormData | null>(null);

  // Carrega a transação
  useEffect(() => {
    if (user?.id) {
      const fetchAccount = async () => {
        try {
          setIsLoading(true);
          const data = await fetch(`/api/account/${accountId}`);
          
          if (!data.ok) throw new Error('Conta não encontrada');
          
          const account: AccountFormData = await data.json();
          setAccount(account);
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAccount();
    }
  }, [user, accountId]);

  return (
    <ProtectedRoute>
      <div className="max-w-7xl">
        <Breadcrumb />

        {isLoading ? (
          <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {account && (
              <AccountForm 
                account={account}
                isEdit={true}
              />
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default UpdateAccount;