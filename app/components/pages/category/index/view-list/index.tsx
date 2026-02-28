"use client";

// importing components
import { IconRenderer } from "@/app/components/ui";

// importing libs
import { highlightText } from "@/app/lib/string/highlightText";

// importing constants
import { typeConfig } from "@/app/lib/constants/category.constants";

// importing interface
import { ViewProps } from "@/app/lib/interface/category.interface";

export default function ViewList({ category, searchTerm = "" }: ViewProps) {
  const type = typeConfig[category.type];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 relative"
          style={{ backgroundColor: category.color ?? undefined }}
        >
          <IconRenderer iconName={category.icon || "tag"} size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white truncate">
              {highlightText(category.name, searchTerm)}
            </p>
          </div>
          
          {category.description && (
            <p className="text-xs text-slate-500 truncate max-w-[200px]">
              {highlightText(category.description, searchTerm)}
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
  );
};
