"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CategoryModel } from "@/app/types/category";
import { IconRenderer } from "@/app/components";

interface Props {
  category: CategoryModel;
  viewMode: "grid" | "list";
}

export default function CategoryCard({
  category,
  viewMode,
}: Props) {
  const router = useRouter();

  const typeLabel =
    category.type === "INCOME" ? "Receita" : "Despesa";

  const typeColor =
    category.type === "INCOME"
      ? "text-green-400"
      : "text-red-400";

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() =>
          router.push(`/categorias/show/${category.id}`)
        }
        className="
          cursor-pointer
          p-5 rounded-2xl
          bg-white/5 backdrop-blur-xl
          border border-white/10
          hover:border-purple-500/40
          transition-all
        "
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: category.color }}
            >
              <IconRenderer
                iconName={category.icon || "tag"}
                size={16}
              />
            </div>

            <div>
              <p className="font-medium">
                {category.name}
              </p>
              <p
                className={`text-xs ${typeColor}`}
              >
                {typeLabel}
              </p>
            </div>
          </div>

          {!category.isActive && (
            <span className="text-xs text-slate-400">
              Inativa
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() =>
        router.push(`/categorias/show/${category.id}`)
      }
      className="
        cursor-pointer
        rounded-3xl p-6
        bg-white/5 backdrop-blur-2xl
        border border-white/10
        hover:border-purple-500/40
        shadow-[0_10px_40px_rgba(0,0,0,0.4)]
        transition-all duration-300
      "
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
          style={{ backgroundColor: category.color }}
        >
          <IconRenderer
            iconName={category.icon || "tag"}
            size={20}
          />
        </div>

        <div>
          <h3 className="font-semibold text-lg">
            {category.name}
          </h3>

          <p
            className={`text-sm mt-1 ${typeColor}`}
          >
            {typeLabel}
          </p>
        </div>
      </div>

      {category.description && (
        <p className="text-sm text-slate-400 mt-6 line-clamp-2">
          {category.description}
        </p>
      )}

      {!category.isActive && (
        <div className="mt-6 text-xs text-slate-400 uppercase">
          Categoria Inativa
        </div>
      )}
    </motion.div>
  );
}
