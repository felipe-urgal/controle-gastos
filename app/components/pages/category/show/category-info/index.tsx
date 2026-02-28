'use client';

// importing icons
import { FaTag, FaCalendarAlt } from "react-icons/fa";

// importing constants
import { typeConfig } from "@/app/lib/constants/category.constants";

// importing interface
import { CategoryInfoProps } from "@/app/lib/interface/category.interface";

// importing libs
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CategoryInfo({ category, isDeleting }: CategoryInfoProps) {
  const type = typeConfig[category.type];

  return (
    <div className={`relative rounded-3xl overflow-hidden transition-opacity duration-300 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at top right, ${category.color}, transparent 70%)`
        }}
      />
      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 p-6 lg:p-8">
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
        </div>

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
    </div>
  );
};
