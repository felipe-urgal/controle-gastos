'use client';

// importing hooks
import { motion } from 'framer-motion';

// importing components
import ProtectedRoute from '@/app/components/ui/ProtectedRoute';
import Header from '@/app/components/account/new/header';
import AccountForm from '@/app/components/account/form';

export default function New() {
  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Header />

        <AccountForm isEditing={false} />
      </motion.div>
    </ProtectedRoute>
  );
};
