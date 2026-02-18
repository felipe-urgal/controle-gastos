"use client";

import { CategoryModel } from "@/app/types/category";
import CategoryCard from "./CategoryCard";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  categories: CategoryModel[];
  loading: boolean;
  viewMode: "grid" | "list";
  search?: string;
}

export default function CategoriesList({
  categories,
  loading,
  viewMode,
  search = "",
}: Props) {
  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-3xl p-6 bg-white/5 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!categories.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-24"
      >
        <div className="text-6xl mb-4">🏷️</div>
        <h3 className="text-xl font-medium text-white mb-2">
          Nenhuma categoria encontrada
        </h3>
        <p className="text-slate-400">
          {search 
            ? 'Tente buscar por outro termo' 
            : 'Crie sua primeira categoria para começar'
          }
        </p>
      </motion.div>
    );
  }

  const isGrid = viewMode === "grid";

  return (
    <motion.div
      layout
      className={
        isGrid
          ? "grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          : "flex flex-col gap-3"
      }
    >
      <AnimatePresence mode="popLayout">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              duration: 0.2,
              delay: index * 0.03
            }}
          >
            <CategoryCard
              category={category}
              viewMode={viewMode}
              searchTerm={search}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
