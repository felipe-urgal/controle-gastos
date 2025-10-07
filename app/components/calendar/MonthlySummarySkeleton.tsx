"use client";

// importing context
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from '@/app/hook/useThemeColors';

export default function MonthlySummarySkeleton() {
  const { resolvedTheme } = useTheme();
  
  const colors = useThemeColors();

  const bgColor = resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const borderColor = resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const skeletonColor = resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-300';

  return (
    <div className="mb-2 mx-3 w-full">
      {/* Versão Desktop */}
      <div className="hidden sm:flex items-center justify-center w-full">
        <div className="grid grid-cols-12 gap-3 w-full">
          {[...Array(2)].map((_, index) => (
            <div key={index} className={`p-3 rounded-3xl border ${borderColor} ${bgColor}`}>
              <div className={`h-4 ${skeletonColor} rounded mb-2 w-3/4`}></div>
              <div className={`h-6 ${skeletonColor} rounded w-full`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Versão Mobile */}
      <div className="sm:hidden">
        <div className="grid grid-cols-4">
          {[...Array(1)].map((_, index) => (
            <div key={index} className={`${colors.colors.success.bg} rounded-xl pl-3 py-1 flex flex-col`}>
              <div className={`h-3 w-3 ${skeletonColor} rounded`}></div>
              <div className={`h-3 ${skeletonColor} rounded w-12`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}