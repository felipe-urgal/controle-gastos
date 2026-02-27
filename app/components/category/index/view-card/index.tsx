"use client";

// importing components
import { IconRenderer } from "@/app/components/ui";

// importing icons
import { FaTag } from "react-icons/fa";

// importing libs
import { highlightText } from "@/app/lib/string/highlightText";

// importing constants
import { typeConfig } from "@/app/lib/constants/category.constants";

// importing interface
import { ViewProps } from "@/app/lib/interface/category.interface";

export default function ViewCard({ category, searchTerm = "" }: ViewProps) {
  const type = typeConfig[category.type];

  return (
    <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg relative"
            style={{ 
              backgroundColor: category.color ?? undefined,
              boxShadow: `0 8px 16px ${category.color}30`
            }}
          >
            <IconRenderer iconName={category.icon || "tag"} size={20} />
          </div>

          <div>
            <h3 className="font-semibold text-white">
              {highlightText(category.name, searchTerm)}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs ${type.color}`}>
                {type.label}
              </span>
            </div>
          </div>
        </div>

        {!category.isActive && (
          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Inativa
          </span>
        )}
      </div>

      {category.description ? (
        <div className="mt-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
          <p className="text-sm text-slate-400 line-clamp-2">
            {highlightText(category.description, searchTerm)}
          </p>
        </div>
      ) : (
        <div className="mt-3 p-3 rounded-xl bg-slate-800/20 border border-slate-700/30">
          <p className="text-sm text-slate-500 text-center italic">
            Sem descrição
          </p>
        </div>
      )}

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
  );
};
