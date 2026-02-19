'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaArrowLeft } from 'react-icons/fa';
import { categoryService } from '@/app/services';
import { CategoryModel } from '@/app/types/category';
import { CategoryForm, ProtectedRoute, Button } from '@/app/components'; // ← Import Button

export default function EditCategoryPage() {
  const { id } = useParams();
  const router = useRouter();

  const [category, setCategory] = useState<CategoryModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await categoryService.getCategoryById(String(id));
        setCategory(response.data);
      } catch (err) {
        setError('Não foi possível carregar os dados da categoria');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleBack = () => {
    router.push(`/categorias/show/${id}`); // ← Volta sempre para a show page
  };

  if (error) {
    return (
      <ProtectedRoute>
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-medium text-white mb-2">
          Erro ao carregar
        </h3>
        <p className="text-slate-400 mb-6">{error}</p>
        <Button
          variant="primary"
          onClick={() => router.push('/categorias')}
        >
          Voltar para listagem
        </Button>
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
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shrink-0"
          >
            <FaArrowLeft size={14} className="text-slate-400" />
          </motion.button>
          
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
              Editar Categoria
            </h1>
            <p className="text-sm text-slate-400 mt-1 truncate">
              Atualize as informações da categoria
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
        {!loading && category && (
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
                background: `radial-gradient(circle at top right, ${category.color}, transparent 70%)`
              }}
            />
            
            {/* Content */}
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 p-6 lg:p-8">
              <CategoryForm
                category={category}
                isEditing
                onSubmitSuccess={() => {
                  router.push(`/categorias/show/${category.id}`); // ← Volta para show após sucesso
                }}
                onCancel={() => router.push(`/categorias/show/${category.id}`)} // ← Cancela volta para show
                submitting={false}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </ProtectedRoute>
  );
}
