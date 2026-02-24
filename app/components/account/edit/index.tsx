'use client';

// importing hooks
import { useAccounts } from "@/app/hooks/accounts/account-edit";
import { motion } from 'framer-motion';

// importing components
import ProtectedRoute from '@/app/components/ui/ProtectedRoute';
import Header from '@/app/components/account/edit/header';
import Loading from '@/app/components/account/edit/loading';
import Error from '@/app/components/account/edit/error';
import AccountForm from '@/app/components/account/form';

export default function Edit({ id }: { id: string }) {
  const { account, loading, error, handleBack } = useAccounts({ id });

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto"
      >
        <Header handleBack={handleBack}/>

        {loading ? ( 
          <Loading /> 
        ) : (error ? (
          <Error error={error} />
          ) : (
            <AccountForm isEditing account={account} />
          ))
        }
      </motion.div>
    </ProtectedRoute>
  );
};
