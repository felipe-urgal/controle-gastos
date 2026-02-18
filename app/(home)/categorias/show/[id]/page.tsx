"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  FaArrowLeft, 
  FaEdit, 
  FaTrash, 
  FaTag,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaCopy
} from "react-icons/fa";

import { categoryService } from "@/app/services";
import { CategoryModel } from "@/app/types/category";
import { ConfirmationModal, ProtectedRoute } from "@/app/components";
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

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-4xl mx-auto animate-pulse space-y-8">
            <div className="h-10 w-32 bg-white/5 rounded-xl" />
            <div className="h-64 bg-white/5 rounded-3xl" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!category) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-4xl mx-auto text-center py-24">
            <div className="text-6xl mb-4">🏷️</div>
            <h3 className="text-xl font-medium text-white mb-2">
              Categoria não encontrada
            </h3>
            <button
              onClick={() => router.back()}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Voltar para listagem
            </button>
          </div>
        </div>
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
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <FaArrowLeft size={14} className="text-slate-400" />
        </motion.button>
        
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Detalhes da Categoria
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualize informações da categoria
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/categorias/alterar/${category.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-gradient-to-r from-purple-600 to-indigo-600
                       text-white font-medium shadow-lg hover:shadow-purple-600/20
                       transition-all"
          >
            <FaEdit size={13} />
            <span className="hidden sm:inline">Editar</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-red-500/10 text-red-400 hover:bg-red-500/20
                       border border-red-500/20 hover:border-red-500/30
                       transition-all"
          >
            <FaTrash size={13} />
            <span className="hidden sm:inline">Excluir</span>
          </motion.button>
        </div>
      </div>

      {/* MAIN CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden"
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
            >
              <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-purple-500/40 transition-colors">
                <FaCopy size={14} className="text-slate-400 group-hover:text-purple-400" />
              </div>
              
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

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir categoria"
        message={`Tem certeza que deseja excluir a categoria "${category.name}"? Esta ação não poderá ser desfeita e pode afetar transações existentes.`}
        confirmText="Excluir permanentemente"
        variant="danger"
        isLoading={isDeleting}
      />
    </ProtectedRoute>
  );
}
