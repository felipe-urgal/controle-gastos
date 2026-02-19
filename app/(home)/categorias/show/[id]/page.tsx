'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaArrowLeft, 
  FaEdit, 
  FaTrash, 
  FaTag,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaCopy,
  FaSpinner
} from "react-icons/fa";

import { categoryService } from "@/app/services";
import { CategoryModel } from "@/app/types/category";
import { ConfirmationModal, ProtectedRoute, Button } from "@/app/components";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CategoryShowPage() {
  const { id } = useParams();
  const router = useRouter();

  const [category, setCategory] = useState<CategoryModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await categoryService.getCategoryById(String(id));
        setCategory(response.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!category) return;
    try {
      setIsDeleting(true);
      await categoryService.deleteCategory(category.id);
      router.push("/categorias");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  const handleCopyId = () => {
    if (category?.id) {
      navigator.clipboard.writeText(category.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBack = () => {
    router.push('/categorias');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="h-10 w-32 bg-white/5 rounded-xl" />
        <div className="h-64 bg-white/5 rounded-3xl" />
      </ProtectedRoute>
    );
  }

  if (!category) {
    return (
      <ProtectedRoute>
        <div className="text-6xl mb-4">🏷️</div>
        <h3 className="text-xl font-medium text-white mb-2">
          Categoria não encontrada
        </h3>
        <Button
          variant="primary"
          onClick={() => router.push('/categorias')}
        >
          Voltar para listagem
        </Button>
      </ProtectedRoute>
    );
  }

  const typeConfig = {
    INCOME: {
      label: "Receita",
      icon: <FaArrowUp />,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    EXPENSE: {
      label: "Despesa",
      icon: <FaArrowDown />,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20"
    }
  };

  const type = typeConfig[category.type];

  return (
    <ProtectedRoute>
      {/* Overlay de loading durante exclusão */}
      <AnimatePresence>
        {isDeleting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-white/10"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-red-500/30" />
                <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Excluindo categoria</h3>
              <p className="text-slate-400 mb-6">
                Por favor, aguarde enquanto excluímos a categoria...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <FaSpinner className="animate-spin" />
                <span>Processando</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            disabled={isDeleting}
          >
            <FaArrowLeft size={14} className="text-slate-400" />
          </motion.button>
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Detalhes da Categoria
            </h1>
            <p className="text-sm text-slate-400">
              Visualize informações da categoria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push(`/categorias/alterar/${category.id}`)}
            icon={<FaEdit />}
            disabled={isDeleting}
          >
            <span className="hidden sm:inline">Editar</span>
          </Button>

          <Button
            variant="danger"
            size="md"
            onClick={() => setIsDeleteModalOpen(true)}
            icon={<FaTrash />}
            disabled={isDeleting}
            isLoading={isDeleting}
          >
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        </div>
      </div>

      {/* MAIN CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`relative rounded-3xl overflow-hidden transition-opacity duration-300 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {/* Background gradient */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at top right, ${category.color}, transparent 70%)`
          }}
        />

        <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 p-6 lg:p-8">
          {/* Header with icon */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl"
                style={{ 
                  backgroundColor: category.color,
                  boxShadow: `0 10px 20px ${category.color}40`
                }}
              >
                <FaTag size={24} />
              </div>

              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  {category.name}
                </h2>
                
                <div className="flex items-center gap-2 mt-2">
                  <span className={`
                    text-sm px-3 py-1 rounded-full
                    ${type.bgColor} ${type.color} border ${type.borderColor}
                    flex items-center gap-1
                  `}>
                    {type.icon}
                    {type.label}
                  </span>
                  
                  {!category.isActive && (
                    <span className="text-sm px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      Inativa
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Copy ID button */}
            <button
              onClick={handleCopyId}
              className="relative group"
              disabled={isDeleting}
            >
              <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-purple-500/40 transition-colors">
                <FaCopy size={14} className="text-slate-400 group-hover:text-purple-400" />
              </div>
              
              <AnimatePresence>
                {copied && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-lg whitespace-nowrap"
                  >
                    ID copiado!
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Description */}
          {category.description ? (
            <div className="mb-8 p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-sm text-slate-300 italic leading-relaxed">
                {category.description}
              </p>
            </div>
          ) : (
            <div className="mb-8 p-5 rounded-xl bg-slate-800/20 border border-slate-700/30">
              <p className="text-sm text-slate-500 text-center">
                Nenhuma descrição fornecida
              </p>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <FaCalendarAlt size={10} />
                Criada em
              </p>
              <p className="text-sm text-white font-medium">
                {format(new Date(category.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {format(new Date(category.createdAt), "HH:mm")}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <FaCalendarAlt size={10} />
                Última atualização
              </p>
              <p className="text-sm text-white font-medium">
                {format(new Date(category.updatedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {format(new Date(category.updatedAt), "HH:mm")}
              </p>
            </div>

            {category.position > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 sm:col-span-2">
                <p className="text-xs text-slate-500 mb-1">Posição na ordenação</p>
                <p className="text-sm text-white font-medium">{category.position}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* MODAL DE CONFIRMAÇÃO */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir categoria"
        message={`Tem certeza que deseja excluir a categoria "${category.name}"? Esta ação não poderá ser desfeita e pode afetar transações existentes.`}
        confirmText="Excluir"
        variant="danger"
        isLoading={isDeleting}
      />
    </ProtectedRoute>
  );
}
