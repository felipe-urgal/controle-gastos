'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ProtectedRoute, AccountForm } from '@/app/components';
import { FaArrowLeft } from 'react-icons/fa';

export default function NewAccountPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shrink-0"
          >
            <FaArrowLeft size={14} className="text-slate-400" />
          </motion.button>
          
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
              Nova Conta
            </h1>
            <p className="text-sm text-slate-400 mt-1 truncate">
              Configure os detalhes da sua conta financeira
            </p>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-6">
          <AccountForm
            isEditing={false}
            onSubmitSuccess={() => {
              router.push('/contas');
            }}
            onCancel={() => router.back()}
            submitting={false}
          />
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}
