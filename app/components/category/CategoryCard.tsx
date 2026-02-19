"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CategoryModel } from "@/app/types/category";
import { IconRenderer } from "@/app/components";
import { FaTag, FaArrowUp, FaArrowDown } from "react-icons/fa";

interface Props {
  category: CategoryModel;
  viewMode: "grid" | "list";
  searchTerm?: string;
}

export default function CategoryCard({
  category,
  viewMode,
  searchTerm = "",
}: Props) {
  const router = useRouter();

  const typeConfig = {
    INCOME: {
      label: "Receita",
      icon: <FaArrowUp className="text-xs" />,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    EXPENSE: {
      label: "Despesa",
      icon: <FaArrowDown className="text-xs" />,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20"
    }
  };

  const type = typeConfig[category.type];

  const highlightText = (text: string) => {
    if (!searchTerm || !text) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-purple-500/30 text-white rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Versão em Lista
  if (viewMode === "list") {
    return (
      <motion.div
        layout
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => router.push(`/categorias/show/${category.id}`)}
        className={`
          cursor-pointer
          p-4 rounded-xl
          backdrop-blur-sm border
          transition-all
          bg-white/5 border-white/10
          hover:border-purple-500/40 hover:bg-white/[0.07]
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Ícone com cor */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 relative"
              style={{ backgroundColor: category.color }}
            >
              <IconRenderer iconName={category.icon || "tag"} size={16} />
              
              {/* Indicador de tipo */}
              <div className={`
                absolute -bottom-1 -right-1 w-4 h-4 rounded-full
                border-2 border-slate-800 flex items-center justify-center
                ${type.bgColor}
              `}>
                {type.icon}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white truncate">
                  {highlightText(category.name)}
                </p>
              </div>
              
              {category.description && (
                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                  {category.description}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className={`text-xs px-2 py-1 rounded-full ${type.bgColor} ${type.color} border ${type.borderColor}`}>
                {type.label}
              </span>

              <p className="text-xs text-slate-600 mt-4">
                Criada em {new Date(category.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Versão em Grid
  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/categorias/show/${category.id}`)}
      className={`
        cursor-pointer group relative
        rounded-2xl overflow-hidden
        transition-all duration-300
        hover:shadow-2xl hover:shadow-purple-500/10
      `}
    >
      <div className={`
        relative p-5
        backdrop-blur-xl border
        bg-gradient-to-br ${type.bgColor} border-white/10
      `}>
        {/* Hover gradient overlay */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(45deg, ${category.color}15, transparent)`
          }}
        />

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Ícone principal */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg relative"
                style={{ 
                  backgroundColor: category.color,
                  boxShadow: `0 8px 16px ${category.color}30`
                }}
              >
                <IconRenderer iconName={category.icon || "tag"} size={20} />
              </div>

              <div>
                <h3 className="font-semibold text-white">
                  {highlightText(category.name)}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-xs ${type.color}`}>
                    {type.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Status badge */}
            {!category.isActive && (
              <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Inativa
              </span>
            )}
          </div>

          {/* Description */}
          {category.description ? (
            <div className="mt-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <p className="text-sm text-slate-400 line-clamp-2">
                {category.description}
              </p>
            </div>
          ) : (
            <div className="mt-3 p-3 rounded-xl bg-slate-800/20 border border-slate-700/30">
              <p className="text-sm text-slate-500 text-center italic">
                Sem descrição
              </p>
            </div>
          )}

          {/* Footer with metadata */}
          <div className="mt-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <FaTag size={10} />
              <span>ID: {category.id.slice(0, 8)}...</span>
            </div>
            
            {category.position > 0 && (
              <span className="text-slate-500">
                Pos: {category.position}
              </span>
            )}

            <p className="text-xs text-slate-600 mt-4">
              Criada em {new Date(category.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
  