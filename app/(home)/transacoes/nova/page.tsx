'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ProtectedRoute, TransactionForm } from '@/app/components';
import { FaArrowLeft } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { transactionService } from '@/app/services';

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get('account');
  const copyFromId = searchParams.get('copyFrom');
  
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTransactionToCopy() {
      if (!copyFromId) return;
      
      try {
        setLoading(true);
        const response = await transactionService.getTransactionById(copyFromId);
        const tx = response.data;
        
        // Limpar campos que não devem ser copiados
        setInitialData({
          ...tx,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          description: `${tx.description} (cópia)`,
        });
      } catch (error) {
        console.error('Erro ao carregar transação para cópia:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTransactionToCopy();
  }, [copyFromId]);

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
              {copyFromId ? 'Duplicar Transação' : 'Nova Transação'}
            </h1>
            <p className="text-sm text-slate-400 mt-1 truncate">
              {copyFromId 
                ? 'Crie uma nova transação baseada em uma existente'
                : 'Registre uma receita ou despesa'
              }
            </p>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-6">
          <TransactionForm
            isEditing={false}
            initialAccountId={accountId || undefined}
            initialData={copyFromId ? initialData : undefined}
            onSubmitSuccess={() => {
              router.push('/transacoes');
            }}
            onCancel={() => router.back()}
            submitting={loading}
          />
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}
