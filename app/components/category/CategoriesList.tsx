"use client";

import { CategoryModel } from "@/app/types/category";
import CategoryCard from "./CategoryCard";
import { motion } from "framer-motion";

interface Props {
  categories: CategoryModel[];
  loading: boolean;
  viewMode: "grid" | "list";
}

export default function CategoriesList({
  categories,
  loading,
  viewMode,
}: Props) {

  if (loading) return <div>Carregando...</div>;

  if (!categories.length) {
    return (
      <div className="text-center py-24 text-slate-400">
        Nenhuma categoria encontrada
      </div>
    );
  }

  const isGrid = viewMode === "grid";

  return (
    <motion.div
      layout
      className={
        isGrid
          ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
          : "flex flex-col gap-4"
      }
    >
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          viewMode={viewMode}
        />
      ))}
    </motion.div>
  );
}
