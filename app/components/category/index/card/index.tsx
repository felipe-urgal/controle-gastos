"use client";

// importing components
import Link from "next/link"
import { ViewCard, ViewList } from "@/app/components/category";

// importing interface
import { CategoryCardProps } from "@/app/lib/interface/category.interface";

export default function CategoryCard({ category, viewMode, searchTerm = "" }: CategoryCardProps) {
  return (
    <Link
      href={`/categorias/show/${category.id}`}
      className={`cursor-pointer relative rounded-xl overflow-hidden transition-all duration-300
        ${category.isActive ? 'hover:shadow-xl hover:shadow-purple-500/5 hover:scale-[1.01]' 
          : 'opacity-75 hover:opacity-100'}
      `}
    >
      <div className={`relative p-4 backdrop-blur-xl border
        ${category.isActive ? `bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-white/5` 
          : 'bg-slate-900/50 border-slate-800'}
      `}>
        {viewMode === "list" ? (
          <ViewList category={category} searchTerm={searchTerm} />
        ) : (
          <ViewCard category={category} searchTerm={searchTerm} />
        )}
      </div>
    </Link>
  );
};
