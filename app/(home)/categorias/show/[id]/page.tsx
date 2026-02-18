"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaArrowLeft, FaEdit, FaTrash, FaTag } from "react-icons/fa";

import { categoryService } from "@/app/services";
import { CategoryModel } from "@/app/types/category";
import { ConfirmationModal } from "@/app/components";

export default function CategoryShowPage() {
  const { id } = useParams();
  const router = useRouter();

  const [category, setCategory] =
    useState<CategoryModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response =
          await categoryService.getCategoryById(String(id));
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

  if (loading) return <div className="px-6 py-12">Carregando...</div>;
  if (!category) return <div>Categoria não encontrada</div>;

  return (
    <>
      <div className="px-6 py-12 space-y-10">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10"
          >
            <FaArrowLeft size={12} />
            Voltar
          </button>

          <div className="flex gap-3">
            <button
              onClick={() =>
                router.push(`/categorias/alterar/${category.id}`)
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
            >
              <FaEdit size={13} />
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400"
            >
              <FaTrash size={13} />
            </button>
          </div>
        </div>

        {/* CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-8 bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
              style={{ backgroundColor: category.color }}
            >
              <FaTag />
            </div>

            <div>
              <h1 className="text-3xl font-bold">
                {category.name}
              </h1>
              <p className="text-slate-400 text-sm">
                {category.description || "Sem descrição"}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-400 uppercase">
            Tipo
          </p>
          <p className="text-lg font-semibold mt-1">
            {category.type === "INCOME"
              ? "Receita"
              : "Despesa"}
          </p>
        </motion.div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir categoria"
        message="Esta ação não poderá ser desfeita."
        confirmText="Excluir"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}