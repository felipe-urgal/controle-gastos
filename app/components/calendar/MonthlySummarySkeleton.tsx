"use client";

// importing context
import { useTheme } from "@/app/context/ThemeContext";

export default function MonthlySummarySkeleton() {
  const { resolvedTheme } = useTheme();
  
  const bgColor = resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const borderColor = resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const skeletonColor = resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-300';

  return (
    <div className="my-4">
      {/* Versão Desktop */}
      <div className="hidden sm:flex justify-between w-full">
        <div className="grid grid-cols-3 gap-3 w-full max-w-md">
          {[...Array(2)].map((_, index) => (
            <div key={index} className={`p-3 rounded-3xl border ${borderColor} ${bgColor}`}>
              <div className={`h-4 ${skeletonColor} rounded mb-2 w-3/4`}></div>
              <div className={`h-6 ${skeletonColor} rounded w-full`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Versão Mobile */}
      <div className="sm:hidden grid grid-cols-2 gap-2">
        {[...Array(2)].map((_, index) => (
          <div key={index} className={`p-2 rounded-3xl border ${borderColor} ${bgColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div className={`h-3 w-3 ${skeletonColor} rounded`}></div>
                <div className={`h-3 ${skeletonColor} rounded w-12`}></div>
              </div>
              <div className={`h-4 ${skeletonColor} rounded w-16`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}