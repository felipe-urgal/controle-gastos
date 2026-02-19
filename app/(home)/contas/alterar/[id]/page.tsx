'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaArrowLeft } from 'react-icons/fa';
import { accountService } from '@/app/services';
import { AccountModel } from '@/app/types/account';
import { ProtectedRoute, AccountForm, Button } from '@/app/components'; // ← Import Button

export default function EditAccountPage() {
  const { id } = useParams();
  const router = useRouter();

  const [account, setAccount] = useState<AccountModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await accountService.getAccountById(String(id));
        setAccount(response.data);
      } catch (err) {
        setError('Não foi possível carregar os dados da conta');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleBack = () => {
    router.push(`/contas/show/${id}`); // ← Volta sempre para a show page
  };

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-4xl mx-auto text-center py-24">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-xl font-medium text-white mb-2">
              Erro ao carregar
            </h3>
            <p className="text-slate-400 mb-6">{error}</p>
            <Button
              variant="primary"
              onClick={() => router.push('/contas')}
            >
              Voltar para listagem
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack} // ← Usa a nova função
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <FaArrowLeft size={14} className="text-slate-400" />
          </motion.button>
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Editar Conta
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Atualize as informações da sua conta
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-8">
            <div className="animate-pulse space-y-8">
              <div className="h-8 w-48 bg-slate-700 rounded" />
              <div className="grid md:grid-cols-2 gap-8">
                <div className="h-12 bg-slate-700 rounded-xl" />
                <div className="h-12 bg-slate-700 rounded-xl" />
              </div>
              <div className="h-32 bg-slate-700 rounded-xl" />
              <div className="flex justify-end gap-4">
                <div className="h-12 w-24 bg-slate-700 rounded-xl" />
                <div className="h-12 w-32 bg-slate-700 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        {!loading && account && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Background Gradient */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                background: `radial-gradient(circle at top right, ${account.color}, transparent 70%)`
              }}
            />
            
            {/* Content */}
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 p-6 lg:p-8">
              <AccountForm
                account={account}
                isEditing
                onSubmitSuccess={() => {
                  router.push(`/contas/show/${account.id}`); // ← Volta para show após sucesso
                }}
                onCancel={() => router.push(`/contas/show/${account.id}`)} // ← Cancela volta para show
                submitting={false}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </ProtectedRoute>
  );
}
