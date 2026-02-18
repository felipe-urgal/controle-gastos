"use client";

import { useRouter } from "next/navigation";
import { useCategories } from "@/app/hook";
import { CategoriesList, ProtectedRoute } from "@/app/components";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaPlus } from "react-icons/fa";

export default function CategoriesPage() {
  const { categories, loading } = useCategories();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!search) return categories;

    return categories.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  return (
    <ProtectedRoute>
      <div className="px-6 py-12 space-y-10">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white">
            Categorias
          </h1>

          <button
            onClick={() => router.push("/categorias/nova")}
            className="hidden md:inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       bg-gradient-to-r from-purple-600 to-indigo-600
                       text-white font-medium shadow-lg"
          >
            <FaPlus />
            Nova Categoria
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CategoriesList
            categories={filteredCategories}
            loading={loading}
            viewMode={viewMode}
          />
        </motion.div>

        {/* FAB MOBILE */}
        <button
          onClick={() => router.push("/categorias/nova")}
          className="
            fixed top-10 right-6 md:hidden
            w-12 h-12 rounded-full
            bg-gradient-to-r from-purple-600 to-indigo-600
            flex items-center justify-center text-white
            shadow-xl
          "
        >
          <FaPlus />
        </button>
      </div>
    </ProtectedRoute>
  );
}