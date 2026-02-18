"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";
import { CategoryForm, ProtectedRoute } from "@/app/components";

export default function NewCategoryPage() {
  const router = useRouter();

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
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <FaArrowLeft size={14} className="text-slate-400" />
          </motion.button>
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Nova Categoria
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Crie uma categoria para organizar suas transações
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-indigo-600/10" />
          
          <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 p-6 lg:p-8">
            <CategoryForm
              isEditing={false}
              onSubmitSuccess={() => router.push("/categorias")}
              onCancel={() => router.push("/categorias")}
              submitting={false}
            />
          </div>
        </div>
      </motion.div>
    </ProtectedRoute>
  );
}